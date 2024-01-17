import express, { Express, Request, Response } from "express";
import mqtt from "mqtt";
import PocketBase from "pocketbase";
import cors from "cors";
import { games } from "./src/gameService.ts";
import { ClientGame, GameState } from "./src/types/types.ts";
import { addToMeld, calculatePlayerScore, checkIfIsFirstMeld, checkIfIsWildMeld, discardCard, drawCard, formatCardsForMelding, getMeldPoints, meldCards, startRound } from "./src/game.ts";
import e from "express";

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
      case "MELD_CARDS":
        console.log(msg)
        meldCardDispatch(gameState, msg);
        break;
      case "ADD_TO_MELD":
        console.log(msg)
        dispatchAddToMeld(gameState, msg);
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
      gameOver: false,
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
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "EDIT_STOCK_CARD_COUNT",
      stock_card_count: gameState.stock.length,
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
    console.log("no cards in stock");
  }
  const currPlayer = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  drawCard(gameState.stock, currPlayer)
  if(gameState.stock.length === 0) {
    gameState.gameOver = true;
  }
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
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "EDIT_STOCK_CARD_COUNT",
      stock_card_count: gameState.stock.length,
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
  if(!msg.cardId) {
    console.log("no card id");
    return;
  }
  
  const player = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  discardCard(player.hand, gameState.discardPile, msg.cardId)
  console.log(gameState)
  const newTurn = player.name === gameState.player1.name ? gameState.player2.name : gameState.player1.name;
  gameState.turn = newTurn;
  const p1Score = calculatePlayerScore(gameState.player1);
  const p2Score = calculatePlayerScore(gameState.player2);
  gameState.player1.score = p1Score.points;
  gameState.player2.score = p2Score.points;

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
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "UPDATE_SCORE",
      player1Score: {name: gameState.player1.name, score: gameState.player1.score},
      player2Score: {name: gameState.player2.name, score: gameState.player2.score},
    })
  );
  if (player.hand.length === 0 || gameState.gameOver) {
    const winner = p1Score.points > p2Score.points ? gameState.player1.name : gameState.player2.name;
    const loser = p1Score.points > p2Score.points ? gameState.player2.name : gameState.player1.name;
        pb.collection("games").create({
      gameId: msg.id,
      gameState
    })
    client.publish(
      `catnasta/game/${msg.id}`,
      JSON.stringify({
        type: "GAME_END",
        winner: winner === gameState.player1.name ? p1Score : p2Score,
        loser: loser === gameState.player1.name ? p1Score : p2Score,
      })
    );
    return;
  }
}

const meldCardDispatch = (gameState: GameState, msg: any) => {
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
  if(!msg.melds) {
    console.log("no cards");
    return;
  }
  const currPlayer = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  const melds = formatCardsForMelding(currPlayer, msg.melds);
  if (melds.length === 0) {
    console.log("wrong cards");
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        msg: "Wrong cards",
      })
    );
    return;
  }
  const meldPoints = melds.reduce((acc, meld) => acc + getMeldPoints(meld), 0);
  if (meldPoints < 50 && currPlayer.melds.length === 0) {
    console.log("wrong meld");
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        message: "You need to have at least 50 points in your first melds",
      })
    );
    return;
  }
  //check if player will have at least one card in hand after melding
  if (currPlayer.hand.length - melds.flatMap(c => c).length === 0) {
    console.log("wrong meld");
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        message: "You need to have at least one card in hand after melding",
      })
    );
    return;
  }
  melds.forEach((meld) => {
    const error = meldCards(currPlayer.hand, currPlayer.melds, meld);
    if (error !== undefined) {
      console.log(error);
      client.publish(
        `catnasta/game/${msg.id}/${msg.name}`,
        JSON.stringify({
          type: "MELD_ERROR",
          message: error.msg,
        })
      );
      return;
    }
  });
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: currPlayer.hand,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "MELDED_CARDS",
      name: currPlayer.name,
      melds: currPlayer.melds,
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

const dispatchAddToMeld = (gameState: GameState, msg: any) => {
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
  if(!msg.cardsIds) {
    console.log("no cards");
    return;
  }
  if(msg.meldId === undefined) {
    console.log("no meld id");
    return;
  }
  const currPlayer = msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  const cards = currPlayer.hand.filter(card => msg.cardsIds.includes(card.id));
  const error = addToMeld(currPlayer, msg.meldId, cards);
  if (error !== undefined){
    console.log(error);
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        message: error.msg,
      })
    );
    return;
  }
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: currPlayer.hand,
    })
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "MELDED_CARDS",
      name: currPlayer.name,
      melds: currPlayer.melds,
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