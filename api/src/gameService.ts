import {
  addToMeld,
  calculatePlayerScore,
  discardCard,
  drawCard,
  formatCardsForMelding,
  getMeldPoints,
  getMinimumFirstMeldPoints,
  meldCards,
  startRound,
  pickUpPile,
} from "./game";
import { Game, GameState, Player, RoundResult } from "./types/types";
import { MongoClient } from "mongodb";
import { Broker } from "./socket";

export const games: Game[] = [];

/** Rounds are played until a player's total reaches this. */
export const WINNING_SCORE = Number(process.env.WINNING_SCORE ?? 5000);
/** How long the summary of a finished round shows before the next deal. */
export const ROUND_BREAK_MS = Number(process.env.ROUND_BREAK_SECONDS ?? 10) * 1000;

/** The lobby listing: every table except private ones. */
export const gameListPayload = () =>
  games.filter((game) => !game.private).map((game) => ({
    id: game.gameId,
    players_in_game:
      game.gameState.player1.name && game.gameState.player2.name ? 2 : 1,
  }));

export function publishGameList(client: Broker) {
  client.publish("catnasta/game_list", JSON.stringify(gameListPayload()));
}

/** Drops a game from the live list and tells the lobby. */
export function removeGame(client: Broker, gameId: string) {
  const index = games.findIndex((game) => game.gameId === gameId);
  if (index !== -1) {
    games.splice(index, 1);
  }
  publishGameList(client);
}

export function startRoundDispatch(
  client: Broker,
  gameState: GameState,
  msg: any,
) {
  if (!gameState.gameStarted) {
    startRound(gameState);
    gameState.roundStarter =
      Math.random() < 0.5 ? gameState.player1.name : gameState.player2.name;
    gameState.turn = gameState.roundStarter;
    gameState.hasDrawn = false;
    gameState.gameStarted = true;
  }
  publishTable(client, msg.id, gameState);
}

/** Sends everything a player needs to draw the table, e.g. after a deal or a rejoin. */
function publishTable(client: Broker, gameId: string, gameState: GameState) {
  const msg = { id: gameId };
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "GAME_START",
      current_player: gameState.turn,
      has_drawn: gameState.hasDrawn ?? false,
      round: gameState.round,
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
      discard_pile_top_card: gameState.discardPile.at(-1) ?? null,
      discard_pile_count: gameState.discardPile.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "EDIT_STOCK_CARD_COUNT",
      stock_card_count: gameState.stock.length,
    }),
  );
  // Melds and scores so a player who rejoins sees the table as it was.
  for (const player of [gameState.player1, gameState.player2]) {
    client.publish(
      `catnasta/game/${msg.id}`,
      JSON.stringify({
        type: "MELDED_CARDS",
        name: player.name,
        melds: player.melds,
      }),
    );
  }
  publishScores(client, gameId, gameState);
  if (gameState.roundBreak) {
    publishRoundEnd(client, gameId, gameState.roundBreak);
  }
}

function publishScores(client: Broker, gameId: string, gameState: GameState) {
  const score = ({ name, score, total }: Player) => ({ name, score, total });
  client.publish(
    `catnasta/game/${gameId}`,
    JSON.stringify({
      type: "UPDATE_SCORE",
      player1Score: score(gameState.player1),
      player2Score: score(gameState.player2),
      round: gameState.round,
      winning_score: WINNING_SCORE,
    }),
  );
}

function publishRoundEnd(client: Broker, gameId: string, result: RoundResult) {
  client.publish(
    `catnasta/game/${gameId}`,
    JSON.stringify({
      type: "ROUND_END",
      round: result.round,
      results: result.results,
      next_round_at: result.nextRoundAt,
    }),
  );
}

/**
 * Banks the round's scores. Ends the game once someone reaches the winning
 * score, otherwise shows the round summary and deals the next round.
 */
async function endRound(
  client: Broker,
  gameId: string,
  gameState: GameState,
  mongoClient: MongoClient,
) {
  const players = [gameState.player1, gameState.player2];
  const results = players.map((player) => {
    player.total += player.score;
    return { name: player.name, points: player.score, total: player.total };
  });
  gameState.turn = "";
  gameState.hasDrawn = false;
  publishScores(client, gameId, gameState);

  if (players.some((player) => player.total >= WINNING_SCORE)) {
    gameState.gameOver = true;
    const [winner, loser] =
      gameState.player1.total > gameState.player2.total ? players : [...players].reverse();
    client.publish(
      `catnasta/game/${gameId}`,
      JSON.stringify({
        type: "GAME_END",
        winner: { name: winner.name, points: winner.total },
        loser: { name: loser.name, points: loser.total },
      }),
    );
    removeGame(client, gameId);
    await mongoClient.connect();
    mongoClient.db("catnasta").collection("games").insertOne(gameState);
    return;
  }

  gameState.roundBreak = {
    round: gameState.round,
    results,
    nextRoundAt: Date.now() + ROUND_BREAK_MS,
  };
  publishRoundEnd(client, gameId, gameState.roundBreak);
  setTimeout(() => {
    const game = games.find((game) => game.gameId === gameId);
    if (game?.gameState !== gameState || gameState.gameOver) {
      return;
    }
    gameState.roundBreak = undefined;
    gameState.round += 1;
    startRound(gameState);
    gameState.roundStarter =
      gameState.roundStarter === gameState.player1.name
        ? gameState.player2.name
        : gameState.player1.name;
    gameState.turn = gameState.roundStarter;
    publishTable(client, gameId, gameState);
  }, ROUND_BREAK_MS);
}

export const drawCardDispatch = (
  client: Broker,
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
  if (gameState.hasDrawn) {
    console.log("already drew this turn");
    return;
  }
  if (gameState.stock.length === 0) {
    console.log("no cards in stock");
  }
  const currPlayer =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;
  drawCard(gameState.stock, currPlayer);
  gameState.hasDrawn = true;
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
      discard_pile_top_card: gameState.discardPile.at(-1) ?? null,
      discard_pile_count: gameState.discardPile.length,
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
  client: Broker,
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
  if (!gameState.hasDrawn) {
    console.log("must draw before discarding");
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
  gameState.hasDrawn = false;
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
      discard_pile_top_card: gameState.discardPile.at(-1) ?? null,
      discard_pile_count: gameState.discardPile.length,
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
  // The round ends when a player goes out or the last stock card has been drawn.
  if (player.hand.length === 0 || gameState.stock.length === 0) {
    await endRound(client, msg.id, gameState, mongoClient);
    return;
  }
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "TURN",
      current_player: newTurn,
    }),
  );
  publishScores(client, msg.id, gameState);
};

export const meldCardDispatch = (
  client: Broker,
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
  // The opening requirement grows with the points banked in earlier rounds.
  const minimum = getMinimumFirstMeldPoints(currPlayer.total);
  if (meldPoints < minimum && currPlayer.melds.length === 0) {
    console.log("wrong meld");
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "MELD_ERROR",
        message: `Your first melds need at least ${minimum} points`,
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
  client: Broker,
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

export const pickUpPileDispatch = (
  client: Broker,
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

  if (gameState.hasDrawn) {
    console.log("already drew this turn");
    return;
  }

  const player =
    msg.name === gameState.player1.name ? gameState.player1 : gameState.player2;

  const result = pickUpPile(gameState.discardPile, player);

  if (!result.success) {
    client.publish(
      `catnasta/game/${msg.id}/${msg.name}`,
      JSON.stringify({
        type: "PICKUP_ERROR",
        message: result.message,
      }),
    );
    return;
  }
  gameState.hasDrawn = true;

  // Notify all players about the updated game state
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
      discard_pile_top_card: gameState.discardPile.at(-1) ?? null,
      discard_pile_count: gameState.discardPile.length,
    }),
  );
  client.publish(
    `catnasta/game/${msg.id}/${
      player.name === gameState.player1.name
        ? gameState.player2.name
        : gameState.player1.name
    }`,
    JSON.stringify({
      type: "ENEMY_HAND",
      enemy_hand: player.hand.length,
    }),
  );
};
