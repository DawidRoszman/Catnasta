import mqtt from "mqtt/*";
import {
  addToMeld,
  calculatePlayerScore,
  discardCard,
  drawCard,
  formatCardsForMelding,
  getMeldPoints,
  meldCards,
  startRound,
} from "./game";
import { Game, GameState } from "./types/types";
import { MongoClient } from "mongodb";

export const games: Game[] = [];

export function startRoundDispatch(
  client: mqtt.MqttClient,
  gameState: GameState,
  msg: any,
) {
  if (!gameState.gameStarted) {
    startRound(gameState);
    const playerTurn =
      Math.random() < 0.5 ? gameState.player1.name : gameState.player2.name;
    gameState.turn = playerTurn;
    gameState.gameStarted = true;
  }
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "GAME_START",
      current_player: gameState.turn,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player1.name}`,
    JSON.stringify({
      type: "HAND",
      hand: gameState.player1.hand,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "RED_THREES",
      player: gameState.player1.name,
      red_threes: gameState.player1.red_threes,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player1.name}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: gameState.player2.hand.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player2.name}`,
    JSON.stringify({
      type: "HAND",
      hand: gameState.player2.hand,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "RED_THREES",
      player: gameState.player2.name,
      red_threes: gameState.player2.red_threes,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${gameState.player2.name}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: gameState.player1.hand.length,
    }),
  );

  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "DISCARD_PILE_TOP_CARD",
      discard_pile_top_card: gameState.discardPile[0],
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "EDIT_STOCK_CARD_COUNT",
      stock_card_count: gameState.stock.length,
    }),
  );
}

export const drawCardDispatch = (
  client: mqtt.MqttClient,
  gameState: GameState,
  msg: any,
) => {
  if (
    msg.name !== gameState.player1.name &&
    msg.name !== gameState.player2.name
  ) {
    console.log("wrong player");
    return;
  }
  if (msg.name === undefined) {
    console.log("no name");
    return;
  }
  const player =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  if (player.name !== gameState.turn) {
    console.log("wrong turn");
    return;
  }
  if (gameState.stock.length === 0) {
    console.log("no cards in stock");
  }
  const currPlayer =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  if (
    currPlayer.hand.length + currPlayer.melds.flatMap((c) => c).length >=
    16
  ) {
    console.log("too many cards");
    return;
  }
  drawCard(gameState.stock, currPlayer);
  if (gameState.stock.length === 0) {
    gameState.gameOver = true;
  }
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: player.hand,
    }),
  );
  //send red threes
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "RED_THREES",
      player: gameState.player1.name,
      red_threes: gameState.player1.red_threes,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "DISCARD_PILE_TOP_CARD",
      discard_pile_top_card: gameState.discardPile[0],
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "STOCK",
      stock: gameState.stock.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${
      currPlayer.name === gameState.player1.name
        ? gameState.player2.name
        : gameState.player1.name
    }`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: currPlayer.hand.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "EDIT_STOCK_CARD_COUNT",
      stock_card_count: gameState.stock.length,
    }),
  );
};

export const discardCardDispatch = async (
  client: mqtt.MqttClient,
  gameState: GameState,
  msg: any,
  mongoClient: MongoClient,
  games: Game[],
) => {
  if (
    msg.name !== gameState.player1.name &&
    msg.name !== gameState.player2.name
  ) {
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
  if (!msg.cardId) {
    console.log("no card id");
    return;
  }

  const player =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  discardCard(player.hand, gameState.discardPile, msg.cardId);
  console.log(gameState);
  const newTurn =
    player.name === gameState.player1.name
      ? gameState.player2.name
      : gameState.player1.name;
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
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "DISCARD_PILE_TOP_CARD",
      discard_pile_top_card: gameState.discardPile.reverse()[0],
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "STOCK",
      stock: gameState.stock.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${newTurn}`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: player.hand.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "TURN",
      current_player: newTurn,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "UPDATE_SCORE",
      player1Score: {
        name: gameState.player1.name,
        score: gameState.player1.score,
      },
      player2Score: {
        name: gameState.player2.name,
        score: gameState.player2.score,
      },
    }),
  );
  if (player.hand.length === 0 || gameState.gameOver) {
    const winner =
      p1Score.points > p2Score.points
        ? gameState.player1.name
        : gameState.player2.name;
    const loser =
      p1Score.points > p2Score.points
        ? gameState.player2.name
        : gameState.player1.name;
    client.publish(
      `catnasta/game/${msg.id}`,
      JSON.stringify({
        type: "GAME_END",
        winner: winner === gameState.player1.name ? p1Score : p2Score,
        loser: loser === gameState.player1.name ? p1Score : p2Score,
      }),
    );
    await mongoClient.connect();
    mongoClient.db("catnasta").collection("games").insertOne(gameState);
    games.splice(
      games.findIndex((game) => game.gameId === msg.id),
      1,
    );

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

    return;
  }
};

export const meldCardDispatch = (
  client: mqtt.MqttClient,
  gameState: GameState,
  msg: any,
) => {
  if (
    msg.name !== gameState.player1.name &&
    msg.name !== gameState.player2.name
  ) {
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
  if (!msg.melds) {
    console.log("no cards");
    return;
  }
  const currPlayer =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  const melds = formatCardsForMelding(currPlayer, msg.melds);
  if (melds.length === 0) {
    console.log("wrong cards");
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        msg: "Wrong cards",
      }),
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
      }),
    );
    return;
  }
  //check if player will have at least one card in hand after melding
  if (currPlayer.hand.length - melds.flatMap((c) => c).length === 0) {
    console.log("wrong meld");
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        message: "You need to have at least one card in hand after melding",
      }),
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
        }),
      );
      return;
    }
  });
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: currPlayer.hand,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "MELDED_CARDS",
      name: currPlayer.name,
      melds: currPlayer.melds,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${
      currPlayer.name === gameState.player1.name
        ? gameState.player2.name
        : gameState.player1.name
    }`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: currPlayer.hand.length,
    }),
  );
};

export const dispatchAddToMeld = (
  client: mqtt.MqttClient,
  gameState: GameState,
  msg: any,
) => {
  if (
    msg.name !== gameState.player1.name &&
    msg.name !== gameState.player2.name
  ) {
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
  if (!msg.cardsIds) {
    console.log("no cards");
    return;
  }
  if (msg.meldId === undefined) {
    console.log("no meld id");
    return;
  }
  const currPlayer =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  const cards = currPlayer.hand.filter((card) =>
    msg.cardsIds.includes(card.id),
  );
  const error = addToMeld(currPlayer, msg.meldId, cards);
  if (error !== undefined) {
    console.log(error);
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        message: error.msg,
      }),
    );
    return;
  }
  client.publish(
    `catnasta/game/${msg.id}/${msg.name}`,
    JSON.stringify({
      type: "HAND",
      hand: currPlayer.hand,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "MELDED_CARDS",
      name: currPlayer.name,
      melds: currPlayer.melds,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${
      currPlayer.name === gameState.player1.name
        ? gameState.player2.name
        : gameState.player1.name
    }`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: currPlayer.hand.length,
    }),
  );
};
