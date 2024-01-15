import express, { Express, Request, Response } from "express";
import mqtt from "mqtt";
import PocketBase from "pocketbase";
import cors from "cors";

const clientId = "mqttjs_server_" + Math.random().toString(16).slice(2, 8);
const client = mqtt.connect("ws://broker.emqx.io:8083/mqtt", {
  clientId: clientId,
});

const pb = new PocketBase("http://127.0.0.1:8090");
pb.admins.authWithPassword("dawidroszman@gmail.com", "ypjTRaf!s6K7H:x");

client.publish("catnasta", "Hello mqtt");

const app: Express = express();
const port = 5000;
app.use(express.json());
app.use(cors());

client.subscribe("catnasta-chat");
client.subscribe("catnasta-game");

client.on("message", async (topic, message) => {
  if (topic === "catnasta-chat") {
    const msg = JSON.parse(message.toString());
    pb.collection("chat").create({
      username: msg.username,
      message: msg.msg,
    });
  }
  if (topic === "catnasta-game") {
    const msg = JSON.parse(message.toString());
    switch (msg.state) {
      case "PLAYER_JOINED": {
        const game = await pb
          .collection("games")
          .getFirstListItem(`id = "${msg.id}"`);
        const { gameState } = game;
        client.publish(
          `catnasta-game-${msg.id}-${msg.name}`,
          JSON.stringify({
            player1: gameState.player1,
            player2: gameState.player2,
          }),
        );
      }
    }
  }
});

app.get("/chat", async (req: Request, res: Response) => {
  const chat = await pb.collection("chat").getList();
  const messages = chat.items;
  res.send(messages);
});

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Catnasta");
});

app.post("/create_game", async (req: Request, res: Response) => {
  const name = req.body.name;
  // random id for game lenght 6 can be characters and numbers

  if (!name) {
    res.send("Please enter a name");
  }
  const id = Math.random().toString(36).substring(2, 8);
  const game = await pb.collection("games").create({
    gameId: id,
    gameState: {
      player1: name,
    },
  });
  res.send({ id: game.gameId });
});

app.put("/join_game", async (req: Request, res: Response) => {
  const id = req.body.id;
  const name = req.body.name;
  if (!id) {
    res.send("Please enter a game id");
  }
  if (!name) {
    res.send("Please enter a name");
  }
  console.log(id);
  const game = await pb
    .collection("games")
    .getFirstListItem('gameId = "' + id + '"');
  console.log(game);
  const { gameState } = game;
  if (gameState.player1 && gameState.player2) {
    res.send({ msg: "Game is full" });
  }
  if (gameState.player1 && !gameState.player2) {
    await pb.collection("games").update(game.id, {
      gameState: {
        ...gameState,
        player2: req.body.name,
      },
    });
    res.send({ id: id });
  }
  res.send({ msg: "Game not found" });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
