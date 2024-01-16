import express, { Express, Request, Response } from "express";
import mqtt from "mqtt";
import PocketBase from "pocketbase";
import cors from "cors";
import { games } from "./src/gameService.ts";
import { ClientGame, GameState } from "./src/types/types.ts";
import { discardCard, drawCard, startRound } from "./src/game.ts";

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

client.subscribe("catnasta/chat");
client.subscribe("catnasta/game");

client.on("message", async (topic, message) => {
  if (topic === "catnasta/chat") {
    const msg = JSON.parse(message.toString());
    pb.collection("chat").create({
      username: msg.username,
      message: msg.msg,
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
          startRoundDispatch(gameState, msg);
        }
        break;
      case "DRAW_FROM_STOCK":
        drawCardDispatch(gameState, msg);
        break;
      case "DISCARD_CARD":
        discardCardDispatch(gameState, msg);
        break;
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
  const name: string = req.body.name;
  // random id for game lenght 6 can be characters and numbers

  if (!name) {
    res.send("Please enter a name");
  }
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();
  const game = {
    gameId: id,
    gameState: {
      turn: "",
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
  res.send({ id: game.gameId });
});

app.put("/join_game", async (req: Request, res: Response) => {
  const id: string = req.body.id.toUpperCase();
  const name = req.body.name;
  if (!id) {
    res.send("Please enter a game id");
  }
  if (!name) {
    res.send("Please enter a name");
  }
  console.log(id);
  const game = games.find((game) => game.gameId === id);
  if (game === undefined) {
    res.send({ msg: "Game not found" });
    return;
  }
  console.log(game);
  const { gameState } = game;
  if (gameState.player1.name && gameState.player2.name) {
    res.send({ msg: "Game is full" });
  }
  if (gameState.player1.name && !gameState.player2.name) {
    if (gameState.player1.name === name) {
      res.send({ msg: "Name already taken" });
      return;
    }
    const updatedGame = { ...game };
    updatedGame.gameState.player2.name = name;
    games.map((game) => {
      if (game.gameId === id) return updatedGame;
    });
    res.send({ id: id });
  }
  res.send({ msg: "Game not found" });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
function startRoundDispatch(gameState: GameState, msg: any) {
  startRound(gameState);
  const playerTurn = Math.random() < 0.5 ? gameState.player1.name : gameState.player2.name
  gameState.turn = playerTurn;
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "GAME_START",
      current_player: gameState.turn,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player1.name}`,
    JSON.stringify({
      type: "HAND",
      hand: gameState.player1.hand,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "RED_THREES",
      player: gameState.player1.name,
      red_threes: gameState.player1.red_threes,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player1.name}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: gameState.player2.hand.length,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player2.name}`,
    JSON.stringify({
      type: "HAND",
      hand: gameState.player2.hand,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "RED_THREES",
      player: gameState.player2.name,
      red_threes: gameState.player2.red_threes,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player2.name}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: gameState.player1.hand.length,
    })
  );

  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "DISCARD_PILE_TOP_CARD",
      discard_pile_top_card: gameState.discardPile[0],
    })
  );
}

const drawCardDispatch = (gameState: GameState, msg: any) => {
  if (msg.name !== gameState.player1.name && msg.name !== gameState.player2.name) {
    console.log("wrong player");
    return;
  }
  if (msg.name === undefined) {
    console.log("no name");
    return;
  }
  const player = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  if (player.name !== gameState.turn) {
    console.log("wrong turn");
    return;
  }
  if (gameState.stock.length === 0) {
    throw new Error("Stock is empty");
  }
  const currPlayer = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  drawCard(gameState.stock, currPlayer)
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: player.hand,
    })
  );
  //send red threes
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "RED_THREES",
      player: gameState.player1.name,
      red_threes: gameState.player1.red_threes,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "DISCARD_PILE_TOP_CARD",
      discard_pile_top_card: gameState.discardPile[0],
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "STOCK",
      stock: gameState.stock.length,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}/${currPlayer.name === gameState.player1.name ? gameState.player2.name : gameState.player1.name}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: currPlayer.hand.length,
    })
  );
}

const discardCardDispatch = (gameState: GameState, msg: any) => {
  if (msg.name !== gameState.player1.name && msg.name !== gameState.player2.name) {
    console.log("wrong player");
    return;
  }
  if (msg.name === undefined) {
    console.log("no name");
    return;
  }
  if (gameState.turn !== msg.name) {
    console.log("wrong turn");
    return;
  }
  const player = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  discardCard(player.hand, gameState.discardPile, msg.cardId)
  console.log(gameState)
  const newTurn = player.name === gameState.player1.name ? gameState.player2.name : gameState.player1.name;
  gameState.turn = newTurn;
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: player.hand,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "DISCARD_PILE_TOP_CARD",
      discard_pile_top_card: gameState.discardPile.reverse()[0],
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "STOCK",
      stock: gameState.stock.length,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}/${newTurn}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: player.hand.length,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "TURN",
      current_player: newTurn,
    })
  );
}