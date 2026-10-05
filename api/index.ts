import express, { Express, Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import http from "http";
import https from "https";
import {
  discardCardDispatch,
  dispatchAddToMeld,
  drawCardDispatch,
  gameChanged,
  gameListPayload,
  games,
  parseTableSettings,
  meldCardDispatch,
  pickUpPileDispatch,
  publishGameList,
  resumeGame,
  setGameChangeListener,
  startRoundDispatch,
} from "./src/gameService";
import { SavedGameCollection, createGameStore } from "./src/persistence";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createBroker } from "./src/socket";
import { createLifecycle } from "./src/lifecycle";
import { Game } from "./src/types/types";

require("dotenv").config();

// Read connection details from environment variables
const DB_URI = process.env.DB_URI;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_HOST = process.env.DB_HOST || "localhost"; // Default to localhost if not provided

// Construct MongoDB URI (prefer explicit URI for local/dev containers)
const uri =
  DB_URI ||
  `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;

const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Games in progress, saved as they change so a restart can pick them up again.
const gameStore = createGameStore(
  async () => {
    await mongoClient.connect();
    return mongoClient
      .db("catnasta")
      .collection("live_games") as unknown as SavedGameCollection;
  },
  (gameId) => games.find((game) => game.gameId === gameId),
);
setGameChangeListener(gameStore.changed);

function generateAccessToken(username: string) {
  return jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      data: username,
    },
    process.env.TOKEN_SECRET as string,
  );
}

function authenticateToken(req: Request, res: Response, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(
    token,
    process.env.TOKEN_SECRET as string,
    (err: any, user: any) => {
      console.log(err);

      if (err) return res.sendStatus(403);

      req.body ??= {};
      req.body.user = user;

      next();
    },
  );
}

const app: Express = express();
const port = 5001;
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const broker = createBroker(server);
const lifecycle = createLifecycle(broker, mongoClient);

/** Puts back the games that were in progress when the server last stopped. */
async function restoreGames() {
  const saved = await gameStore.load();
  for (const { game, savedAt } of saved) {
    if (game.gameState.gameOver || games.some(({ gameId }) => gameId === game.gameId)) {
      continue;
    }
    games.push(game);
    resumeGame(broker, game, mongoClient, savedAt);
    // Nobody is connected yet; anyone who doesn't come back forfeits as usual.
    lifecycle.sync(game);
  }
  if (saved.length > 0) {
    console.log(`[server]: Restored ${games.length} game(s) in progress`);
  }
}

async function start() {
  try {
    await mongoClient.connect();
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    await restoreGames();
  } catch (err) {
    console.error("Connection error:", err);
    fs.appendFileSync("log.json", JSON.stringify(err, null, 2));
  }
  // Only take players once their games are back, so nobody rejoins an empty table.
  server.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}
start();

let shuttingDown = false;
/** Saves every game in progress before the process stops, e.g. for a deploy. */
async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[server]: ${signal} received, saving ${games.length} game(s) in progress`);
  // Disconnect players first so no move lands after the final save.
  broker.close();
  server.close();
  try {
    // Re-saving every game stamps the time the clocks stopped.
    await gameStore.saveNow(games.map(({ gameId }) => gameId));
    await mongoClient.close();
  } catch (err) {
    console.error("Could not save games before shutting down", err);
  }
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

broker.onMessage(async (topic, message) => {
  if (topic === "catnasta/chat") {
    const msg = JSON.parse(message);
    if (!msg.username || !msg.message) {
      return;
    }
    await mongoClient.connect();
    await mongoClient.db("catnasta").collection("chat").insertOne({
      id: msg.id,
      username: msg.username,
      message: msg.message,
    });
  }
  if (topic === "catnasta/game") {
    const msg = JSON.parse(message);
    const game = games.find((game) => game.gameId === msg.id);
    if (game === undefined) {
      return;
    }
    const { gameState } = game;
    switch (msg.type) {
      case "PLAYER_JOINED":
        if (
          msg.name !== gameState.player1.name &&
          msg.name !== gameState.player2.name
        ) {
          return;
        }
        if (msg.name === undefined) {
          return;
        }
        broker.publish(
          `catnasta/game/${msg.id}`,
          JSON.stringify({
            type: "PLAYER_JOINED",
            player1: gameState.player1.name,
            player2: gameState.player2.name,
          }),
        );
        if (gameState.player1.name && gameState.player2.name) {
          startRoundDispatch(broker, gameState, msg, mongoClient);
        }
        lifecycle.sync(game);
        break;
      case "LEAVE_GAME":
        lifecycle.leave(game, msg.name);
        break;
      case "PLAYER_LEFT":
        broker.publish(
          `catnasta/game/${msg.id}`,
          JSON.stringify({
            type: "PLAYER_LEFT",
            player: msg.name,
          }),
        );
        break;
      case "DRAW_FROM_STOCK":
        drawCardDispatch(broker, gameState, msg);
        break;
      case "DISCARD_CARD":
        discardCardDispatch(broker, gameState, msg, mongoClient, games);
        break;
      case "MELD_CARDS":
        meldCardDispatch(broker, gameState, msg);
        break;
      case "ADD_TO_MELD":
        dispatchAddToMeld(broker, gameState, msg);
        break;
      case "PICKUP_DISCARD_PILE":
        pickUpPileDispatch(broker, gameState, msg);
        break;
    }
    gameChanged(game.gameId);
  }
});

app.post("/register", async (req: Request, res: Response) => {
  const username: string = req.body.username;
  const password: string = req.body.password;
  if (!username) {
    return res.send({ msg: "Please enter a username" });
  }
  if (!password) {
    return res.send({ msg: "Please enter a password" });
  }
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      await mongoClient.connect();
      const query = mongoClient.db("catnasta").collection("users").findOne({
        username: username,
      });
      const user = await query;
      if (user !== null) {
        return res.send({ msg: "Username already taken" });
      }
      await mongoClient.db("catnasta").collection("users").insertOne({
        username: username,
        password: hash,
      });
      const token = generateAccessToken(username);
      return res.send({ token: token });
    });
  });
});

app.post("/login", async (req: Request, res: Response) => {
  const username: string = req.body.username;
  const password: string = req.body.password;
  if (!username) {
    return res.send({ msg: "Please enter a username" });
  }
  if (!password) {
    return res.send({ msg: "Please enter a password" });
  }
  await mongoClient.connect();
  const query = mongoClient
    .db("catnasta")
    .collection("users")
    .findOne({ username: username });
  const user = await query;
  if (user === null) {
    return res.send({ msg: "Wrong username or password" });
  }
  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      const token = generateAccessToken(username);
      return res.send({ token: token });
    } else {
      return res.send({ msg: "Wrong username or password" });
    }
  });
});

app.delete(
  "/chat/delete/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      console.log(id);
      await mongoClient.connect();
      const query = mongoClient.db("catnasta").collection("chat").findOne({
        id: id,
      });
      const message = await query;
      if (message === null) {
        return res.send({ msg: "Message not found" });
      }
      if (
        message.username !== req.body.user.data &&
        req.body.user.data !== "admin"
      ) {
        return res.send({ msg: "You can only delete your own messages" });
      }
      await mongoClient.db("catnasta").collection("chat").deleteOne({ id: id });
      return res.send({ msg: "Message deleted" });
    } catch (err) {
      return res.send({ msg: "Message not found" });
    }
  },
);

app.put(
  "/chat/update/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const message = req.body.message;
      await mongoClient.connect();
      const query = mongoClient.db("catnasta").collection("chat").findOne({
        id: id,
      });
      const msg = await query;
      if (msg === null) {
        return res.send({ msg: "Message not found" });
      }
      if (
        msg.username !== req.body.user.data ||
        req.body.user.data !== "admin"
      ) {
        return res.send({ msg: "You can only edit your own messages" });
      }
      await mongoClient
        .db("catnasta")
        .collection("chat")
        .updateOne({ id: id }, { $set: { message: message } });
      return res.send({ msg: "Message updated" });
    } catch (err) {
      return res.send({ msg: "Message not found" });
    }
  },
);

app.post("/send", authenticateToken, async (req: Request, res: Response) => {
  if (req.body.user.data !== "admin") {
    return res
      .status(401)
      .send({ msg: "You are not authorized to view this page" });
  }
  const message = req.body.message;
  broker.publish("catnasta/messages", JSON.stringify({ message: message }));
  fs.appendFileSync("log.json", JSON.stringify(message));
  res.status(200).send({ msg: "Message sent" });
});

app.post("/chat", authenticateToken, async (req: Request, res: Response) => {
  try {
    const message = req.body.message;
    await mongoClient.connect();
    await mongoClient.db("catnasta").collection("chat").insertOne({
      username: req.body.user,
      message: message,
    });
  } catch (error) {}
});

app.get("/chat", async (req: Request, res: Response) => {
  await mongoClient.connect();
  const query = mongoClient.db("catnasta").collection("chat").find();
  const chat = await query.toArray();
  return res.send(chat);
});

app.get("/chat/search", async (req: Request, res: Response) => {
  const search = req.query.search;
  if (!search) {
    return res.send({ msg: "Please enter a search term" });
  }
  await mongoClient.connect();
  const query = mongoClient
    .db("catnasta")
    .collection("chat")
    .find({
      message: { $regex: `.*${search}.*` as string },
    });
  const result = await query.toArray();
  return res.send(result);
});

app.get("/", (req: Request, res: Response) => {
  return res.send("Welcome to Catnasta");
});

app.get("/users", authenticateToken, async (req: Request, res: Response) => {
  const user = req.body.user.data;
  if (user !== "admin") {
    return res.send({ msg: "You are not authorized to view this page" });
  }
  await mongoClient.connect();
  const query = mongoClient.db("catnasta").collection("users").find();
  const users = await query.toArray();
  return res.send(users);
});

app.get("/user", authenticateToken, async (req: Request, res: Response) => {
  const user = req.body.user.data;
  await mongoClient.connect();
  const query = mongoClient.db("catnasta").collection("users").findOne({
    username: user,
  });
  const result = await query;
  if (result === null) {
    return res.send({ msg: "User not found" });
  }
  return res.send(result.username);
});

app.get(
  "/user/isAdmin",
  authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.body.user.data;
    if (user !== "admin") {
      return res.send({ isAdmin: false });
    }
    return res.send({ isAdmin: true });
  },
);
//dwa

app.get(
  "/users/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.body.user.data;
    if (user !== "admin") {
      return res.send({ msg: "You are not authorized to view this page" });
    }
    const id = req.params.id as string;
    await mongoClient.connect();
    const query = mongoClient
      .db("catnasta")
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    const result = await query;
    if (result === null) {
      return res.send({ msg: "User not found" });
    }
    return res.send(result);
  },
);

app.delete(
  "/users/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.body.user.data;
    if (user !== "admin") {
      return res.send({ msg: "You are not authorized to view this page" });
    }
    const id = req.params.id as string;
    await mongoClient.connect();
    const query = mongoClient
      .db("catnasta")
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    const result = await query;
    if (result === null) {
      return res.send({ msg: "User not found" });
    }
    mongoClient
      .db("catnasta")
      .collection("users")
      .deleteOne({ _id: new ObjectId(id) });
    return res.send({ msg: "User deleted" });
  },
);

app.put(
  "/user/edit_password",
  authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.body.user.data;
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    if (!newPassword || !oldPassword) {
      return res.send({ msg: "Please enter an old password and new password" });
    }
    await mongoClient.connect();
    const query = mongoClient
      .db("catnasta")
      .collection("users")
      .findOne({ username: user });
    const result = await query;
    if (result === null) {
      return res.send({ msg: "User not found" });
    }
    bcrypt.compare(oldPassword, result.password, function (err, result) {
      if (result) {
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(newPassword, salt, async function (err, hash) {
            await mongoClient
              .db("catnasta")
              .collection("users")
              .updateOne({ username: user }, { $set: { password: hash } });
            return res.send({ msg: "Password changed" });
          });
        });
      } else {
        return res.send({ msg: "Wrong password" });
      }
    });
  },
);

app.put("/admin/user/edit/:id", authenticateToken, async (req, res) => {
  const user = req.body.user.data;
  if (user !== "admin") {
    return res.send({ msg: "You are not authorized to view this page" });
  }
  const id = req.params.id as string;
  const newUsername = req.body.newUsername;
  const query = mongoClient
    .db("catnasta")
    .collection("users")
    .findOne({
      _id: new ObjectId(id),
    });
  const result = await query;
  if (result === null) {
    return res.send({ msg: "User not found" });
  }
  const query2 = mongoClient.db("catnasta").collection("users").findOne({
    username: newUsername,
  });
  const result2 = await query2;
  if (result2 !== null) {
    return res.send({ msg: "Username already taken" });
  }
  mongoClient
    .db("catnasta")
    .collection("users")
    .updateOne(
      {
        _id: new ObjectId(id),
      },
      { $set: { username: newUsername } },
    );
});

app.get("/games", authenticateToken, async (req: Request, res: Response) => {
  const user = req.body.user.data;
  if (user !== "admin") {
    return res.send({ msg: "You are not authorized to view this page" });
  }
  await mongoClient.connect();
  const query = mongoClient.db("catnasta").collection("games").find();
  const games = await query.toArray();
  return res.send(games);
});

app.get("/active_game", authenticateToken, (req: Request, res: Response) => {
  const user = req.body.user.data;
  const game = games.find(
    ({ gameState }) =>
      !gameState.gameOver &&
      (gameState.player1.name === user || gameState.player2.name === user),
  );
  if (game === undefined) {
    return res.send({});
  }
  const { player1, player2, gameStarted } = game.gameState;
  return res.send({
    id: game.gameId,
    opponent: player1.name === user ? player2.name : player1.name,
    started: gameStarted,
  });
});

app.get(
  "/live_games",
  authenticateToken,
  async (req: Request, res: Response) => {
    return res.status(200).send(gameListPayload());
  },
);

app.delete("/games/:id", authenticateToken, async (req, res) => {
  const user = req.body.user.data;
  if (user !== "admin") {
    return res.send({ msg: "You are not authorized to view this page" });
  }
  const id = req.params.id as string;
  await mongoClient.connect();
  const query = mongoClient
    .db("catnasta")
    .collection("games")
    .findOne({
      _id: new ObjectId(id),
    });
  const result = await query;
  if (result === null) {
    return res.send({ msg: "Game not found" });
  }
  mongoClient
    .db("catnasta")
    .collection("games")
    .deleteOne({ _id: new ObjectId(id) });
  return res.send({ msg: "Game deleted" });
});

app.post("/create_game", async (req: Request, res: Response) => {
  const name: string = req.body.name;
  if (!name) {
    return res.send({ msg: "Please log in to create game" });
  }
  const settings = parseTableSettings(req.body);
  if ("error" in settings) {
    return res.send({ msg: settings.error });
  }
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();
  const game: Game = {
    gameId: id,
    private: req.body.private === true,
    gameState: {
      settings,
      turn: "",
      gameOver: false,
      gameStarted: false,
      round: 1,
      player1: {
        name: name,
        hand: [],
        melds: [],
        red_threes: [],
        score: 0,
        total: 0,
      },
      player2: {
        name: "",
        hand: [],
        melds: [],
        red_threes: [],
        score: 0,
        total: 0,
      },
      stock: [],
      discardPile: [],
    },
  };
  games.push(game);
  gameChanged(game.gameId);
  publishGameList(broker);
  return res.send({ id: game.gameId });
});

app.put("/join_game", async (req: Request, res: Response) => {
  const id: string = req.body.id.toUpperCase();
  const name = req.body.name;
  if (!id) {
    return res.send({ msg: "Please enter a game id" });
  }
  if (!name) {
    return res.send({ msg: "Please log in to join game" });
  }
  const game = games.find((game) => game.gameId === id);
  if (game === undefined) {
    return res.send({ msg: "Game not found" });
  }
  const { gameState } = game;
  if (gameState.player1.name === name || gameState.player2.name === name) {
    // Already seated: let the player back in.
    return res.send({ id: id });
  }
  if (gameState.player1.name && gameState.player2.name) {
    return res.send({ msg: "Game is full" });
  }
  if (gameState.player1.name && !gameState.player2.name) {
    if (gameState.player1.name === name) {
      return res.send({ msg: "Name already taken" });
    }
    const updatedGame = { ...game };
    updatedGame.gameState.player2.name = name;
    games.map((game) => {
      if (game.gameId === id) return updatedGame;
    });
    gameChanged(id);
    publishGameList(broker);
    return res.send({ id: id });
  }
  return res.send({ msg: "Game not found" });
});
// https
//   .createServer(
//     {
//       key: fs.readFileSync("./eu.dawidroszman.key"),
//       cert: fs.readFileSync("./eu.dawidroszman.cert.pem"),
//     },
//     app,
//   )
//   .listen(port, () => {
//     console.log(`[server]: Server is running at http://localhost:${port}`);
//   });
