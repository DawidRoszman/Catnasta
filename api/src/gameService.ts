import {
  DEFAULT_HAND_SIZE,
  addToMeld,
  calculatePlayerScore,
  discardCard,
  drawCard,
  formatCardsForMelding,
  getMeldPoints,
  getMinimumFirstMeldPoints,
  lowestCardToDiscard,
  meldCards,
  startRound,
  pickUpPile,
} from "./game";
import { Game, GameState, Player, RoundResult, TableSettings } from "./types/types";
import { MongoClient } from "mongodb";
import { Broker } from "./socket";

export const games: Game[] = [];

let onGameChanged: (gameId: string) => void = () => {};

/** Registers who to tell whenever a live game changes, e.g. to save it. */
export function setGameChangeListener(listener: (gameId: string) => void) {
  onGameChanged = listener;
}

/** Marks a live game as changed so it gets saved. */
export function gameChanged(gameId: string) {
  onGameChanged(gameId);
}

export const DEFAULT_SETTINGS: TableSettings = {
  winningScore: Number(process.env.WINNING_SCORE ?? 5000),
  roundBreakSeconds: Number(process.env.ROUND_BREAK_SECONDS ?? 10),
  turnSeconds: null,
  handSize: DEFAULT_HAND_SIZE,
};

/** The turn lengths a host can pick; 0 or null turns the clock off. */
export const TURN_SECONDS_CHOICES = [30, 60, 90];

const SETTING_LIMITS: Record<
  Exclude<keyof TableSettings, "turnSeconds">,
  { min: number; max: number; label: string }
> = {
  winningScore: { min: 500, max: 20000, label: "Points to win" },
  roundBreakSeconds: { min: 3, max: 60, label: "Break between rounds" },
  handSize: { min: 9, max: 17, label: "Cards in hand" },
};

/** Validates the settings a host asked for, filling in defaults for anything left out. */
export function parseTableSettings(
  body: Partial<Record<keyof TableSettings, unknown>>,
): TableSettings | { error: string } {
  const settings = { ...DEFAULT_SETTINGS };
  const turnSeconds = body.turnSeconds;
  if (turnSeconds !== undefined && turnSeconds !== null && turnSeconds !== 0) {
    if (typeof turnSeconds !== "number" || !TURN_SECONDS_CHOICES.includes(turnSeconds)) {
      return { error: `Time per turn must be off or ${TURN_SECONDS_CHOICES.join(", ")} seconds` };
    }
    settings.turnSeconds = turnSeconds;
  }
  for (const key of Object.keys(SETTING_LIMITS) as (keyof typeof SETTING_LIMITS)[]) {
    const value = body[key];
    if (value === undefined || value === null) {
      continue;
    }
    const { min, max, label } = SETTING_LIMITS[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
      return { error: `${label} must be a whole number from ${min} to ${max}` };
    }
    settings[key] = value;
  }
  return settings;
}

// No 0/O or 1/I/L, so a code read off a screen can't be typed wrong.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A six-character table code that no live table is using. */
export function newTableCode() {
  let code: string;
  do {
    code = Array.from(
      { length: 6 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  } while (games.some((game) => game.gameId === code));
  return code;
}

/** The lobby listing: every table except private ones. */
export const gameListPayload = () =>
  games.filter((game) => !game.private).map((game) => ({
    id: game.gameId,
    winning_score: game.gameState.settings.winningScore,
    turn_seconds: game.gameState.settings.turnSeconds,
    hand_size: game.gameState.settings.handSize ?? DEFAULT_HAND_SIZE,
    players_in_game:
      game.gameState.player1.name && game.gameState.player2.name ? 2 : 1,
  }));

export function publishGameList(client: Broker) {
  client.publish("catnasta/game_list", JSON.stringify(gameListPayload()));
}

/** Drops a game from the live list and tells the lobby. */
export function removeGame(client: Broker, gameId: string) {
  stopTurnClock(gameId);
  const index = games.findIndex((game) => game.gameId === gameId);
  if (index !== -1) {
    games.splice(index, 1);
  }
  gameChanged(gameId);
  publishGameList(client);
}

const turnClocks = new Map<string, NodeJS.Timeout>();

function stopTurnClock(gameId: string) {
  clearTimeout(turnClocks.get(gameId));
  turnClocks.delete(gameId);
}

/**
 * Starts the clock on the turn that just began, if the table times turns.
 * When it runs out the player draws (unless they already did) and their
 * lowest card is discarded for them, which passes the turn on. `ms` resumes
 * a turn that already had part of its time used.
 */
function startTurnClock(
  client: Broker,
  gameId: string,
  gameState: GameState,
  mongoClient: MongoClient,
  ms?: number,
) {
  stopTurnClock(gameId);
  gameState.turnDeadline = undefined;
  gameChanged(gameId);
  const seconds = gameState.settings.turnSeconds;
  const player = gameState.turn;
  if (!seconds || !player) {
    return;
  }
  const duration = ms ?? seconds * 1000;
  gameState.turnDeadline = Date.now() + duration;
  turnClocks.set(
    gameId,
    setTimeout(() => {
      turnClocks.delete(gameId);
      const game = games.find((game) => game.gameId === gameId);
      if (game?.gameState !== gameState || gameState.gameOver || gameState.turn !== player) {
        return;
      }
      const msg = { id: gameId, name: player };
      if (!gameState.hasDrawn) {
        drawCardDispatch(client, gameState, msg);
      }
      const hand = (player === gameState.player1.name ? gameState.player1 : gameState.player2).hand;
      const card = lowestCardToDiscard(hand);
      if (!card) {
        return;
      }
      client.publish(
        `catnasta/game/${gameId}`,
        JSON.stringify({ type: "TURN_TIMEOUT", player, discarded: card }),
      );
      discardCardDispatch(client, gameState, { ...msg, cardId: card.id }, mongoClient, games).catch(
        (err) => console.error("Could not play a timed-out turn", err),
      );
    }, duration),
  );
}

export function startRoundDispatch(
  client: Broker,
  gameState: GameState,
  msg: any,
  mongoClient: MongoClient,
) {
  if (!gameState.gameStarted) {
    startRound(gameState);
    gameState.roundStarter =
      Math.random() < 0.5 ? gameState.player1.name : gameState.player2.name;
    gameState.turn = gameState.roundStarter;
    gameState.hasDrawn = false;
    gameState.gameStarted = true;
    startTurnClock(client, msg.id, gameState, mongoClient);
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
      turn_deadline: gameState.turnDeadline ?? null,
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
      winning_score: gameState.settings.winningScore,
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
  stopTurnClock(gameId);
  gameState.turnDeadline = undefined;
  publishScores(client, gameId, gameState);

  if (players.some((player) => player.total >= gameState.settings.winningScore)) {
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

  const breakMs = gameState.settings.roundBreakSeconds * 1000;
  gameState.roundBreak = {
    round: gameState.round,
    results,
    nextRoundAt: Date.now() + breakMs,
  };
  publishRoundEnd(client, gameId, gameState.roundBreak);
  gameChanged(gameId);
  scheduleNextRound(client, gameId, gameState, mongoClient, breakMs);
}

/** Deals the next round once the break after the last one is over. */
function scheduleNextRound(
  client: Broker,
  gameId: string,
  gameState: GameState,
  mongoClient: MongoClient,
  delayMs: number,
) {
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
    startTurnClock(client, gameId, gameState, mongoClient);
    publishTable(client, gameId, gameState);
  }, delayMs);
}

/** A resumed turn always gets at least this long, so nobody is played for the moment the server is back. */
const MIN_RESUMED_TURN_MS = 10_000;

/**
 * Restarts the clocks of a game restored after a restart. Time stood still
 * while the server was down: a turn or round break carries on with whatever
 * it had left at `pausedAt`.
 */
export function resumeGame(
  client: Broker,
  game: Game,
  mongoClient: MongoClient,
  pausedAt: number,
) {
  const { gameId, gameState } = game;
  if (!gameState.gameStarted || gameState.gameOver) {
    return;
  }
  if (gameState.roundBreak) {
    const remaining = Math.max(gameState.roundBreak.nextRoundAt - pausedAt, 0);
    gameState.roundBreak.nextRoundAt = Date.now() + remaining;
    scheduleNextRound(client, gameId, gameState, mongoClient, remaining);
    return;
  }
  if (gameState.turnDeadline != null) {
    const remaining = Math.max(gameState.turnDeadline - pausedAt, MIN_RESUMED_TURN_MS);
    startTurnClock(client, gameId, gameState, mongoClient, remaining);
  }
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
  startTurnClock(client, msg.id, gameState, mongoClient);
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "TURN",
      current_player: newTurn,
      turn_deadline: gameState.turnDeadline ?? null,
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

  // The top card was melded with two naturals from the hand.
  client.publish(
    `catnasta/game/${msg.id}`,
    JSON.stringify({
      type: "MELDED_CARDS",
      name: player.name,
      melds: player.melds,
    }),
  );
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
