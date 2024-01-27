import express, { Express, Request, Response } from "express";
import mqtt from "mqtt";
import cors from "cors";
import fs from "fs";
import https from "https";
import {
  discardCardDispatch,
  dispatchAddToMeld,
  drawCardDispatch,
  games,
  meldCardDispatch,
  startRoundDispatch,
} from "./src/gameService";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

require("dotenv").config();

const clientId = "mqttjs_server_" + Math.random().toString(16).slice(2, 8);
const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt", {
  clientId: clientId,
});

const uri = process.env.MONGO_URI || "";

const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await mongoClient.connect();
    await mongoClient.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    await mongoClient.close();
  }
}
run().catch((err) => {
  console.log(err);
  fs.appendFileSync("log.json", JSON.stringify(err));
});

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

      req.body.user = user;

      next();
    },
  );
}
client.publish("catnasta", "Hello mqtt");

const app: Express = express();
const port = 5000;
app.use(express.json());
app.use(cors());

client.subscribe("catnasta/chat");
client.subscribe("catnasta/game");

client.on("message", async (topic, message) => {
  if (topic === "catnasta/chat") {
    const msg = JSON.parse(message.toString());
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
    const msg = JSON.parse(message.toString());
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
        client.publish(
          `catnasta/game/${msg.id}`,
          JSON.stringify({
            type: "PLAYER_JOINED",
            player1: gameState.player1.name,
            player2: gameState.player2.name,
          }),
        );
        if (gameState.player1.name && gameState.player2.name) {
          startRoundDispatch(client, gameState, msg);
        }
        break;
      case "PLAYER_LEFT":
        client.publish(
          `catnasta/game/${msg.id}`,
          JSON.stringify({
            type: "PLAYER_LEFT",
            player: msg.name,
          }),
        );
      case "DRAW_FROM_STOCK":
        drawCardDispatch(client, gameState, msg);
        break;
      case "DISCARD_CARD":
        discardCardDispatch(client, gameState, msg, mongoClient);
        break;
      case "MELD_CARDS":
        console.log(msg);
        meldCardDispatch(client, gameState, msg);
        break;
      case "ADD_TO_MELD":
        console.log(msg);
        dispatchAddToMeld(client, gameState, msg);
        break;
    }
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
      const id = req.params.id;
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
      const id = req.params.id;
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
  client.publish("catnasta/messages", JSON.stringify({ message: message }));
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
    const id = req.params.id;
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
    const id = req.params.id;
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
  const id = req.params.id;
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

app.get(
  "/live_games",
  authenticateToken,
  async (req: Request, res: Response) => {
    return res.status(200).send(
      games.map((game) => {
        return {
          id: game.gameId,
          players_in_game:
            game.gameState.player1.name && game.gameState.player2.name ? 2 : 1,
        };
      }),
    );
  },
);

app.delete("/games/:id", authenticateToken, async (req, res) => {
  const user = req.body.user.data;
  if (user !== "admin") {
    return res.send({ msg: "You are not authorized to view this page" });
  }
  const id = req.params.id;
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
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();
  const game = {
    gameId: id,
    gameState: {
      turn: "",
      gameOver: false,
      gameStarted: false,
      player1: {
        name: name,
        hand: [],
        melds: [],
        red_threes: [],
        score: 0,
      },
      player2: {
        name: "",
        hand: [],
        melds: [],
        red_threes: [],
        score: 0,
      },
      stock: [],
      discardPile: [],
    },
  };
  games.push(game);
  client.publish(
    "catnasta/game_list",
    JSON.stringify(
      games.map((game) => {
        return {
          id: game.gameId,
          players_in_game:
            game.gameState.player1.name && game.gameState.player2.name ? 2 : 1,
        };
      }),
    ),
  );
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
    client.publish(
      "catnasta/game_list",
      JSON.stringify(
        games.map((game) => {
          return {
            id: game.gameId,
            players_in_game:
              game.gameState.player1.name && game.gameState.player2.name
                ? 2
                : 1,
          };
        }),
      ),
    );
    return res.send({ id: id });
  }
  return res.send({ msg: "Game not found" });
});
https
  .createServer(
    {
      key: fs.readFileSync("./eu.dawidroszman.key"),
      cert: fs.readFileSync("./eu.dawidroszman.cert.pem"),
    },
    app,
  )
  .listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
// app.listen(port, () => {
//   console.log(`[server]: Server is running at http://localhost:${port}`);
// });
