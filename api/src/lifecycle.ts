import { MongoClient } from "mongodb";
import { Broker } from "./socket";
import { Game } from "./types/types";
import { games, publishGameList, removeGame } from "./gameService";

/** How long a player may be away before they forfeit (or the table closes). */
export const GRACE_MS = Number(process.env.FORFEIT_GRACE_SECONDS ?? 90) * 1000;

type Seat = {
  online: boolean;
  /** Epoch ms when the player forfeits unless they come back. */
  deadline?: number;
  timer?: NodeJS.Timeout;
};

const PRIVATE_TOPIC = /^catnasta\/game\/([^/]+)\/([^/]+)$/;

export type EndReason = "forfeit" | "left";

/**
 * Tracks who is sitting at each table. A player counts as present while they
 * are subscribed to their private game topic, which the game page does for as
 * long as it is open. Players who stay away past the grace period forfeit.
 */
export function createLifecycle(broker: Broker, mongoClient: MongoClient) {
  const seats = new Map<string, Map<string, Seat>>();

  const findGame = (gameId: string) => games.find((game) => game.gameId === gameId);

  const playerNames = (game: Game) =>
    [game.gameState.player1.name, game.gameState.player2.name].filter(Boolean);

  const seatOf = (gameId: string, name: string) => {
    let table = seats.get(gameId);
    if (!table) {
      table = new Map();
      seats.set(gameId, table);
    }
    let seat = table.get(name);
    if (!seat) {
      seat = { online: false };
      table.set(name, seat);
    }
    return seat;
  };

  const clearTable = (gameId: string) => {
    seats.get(gameId)?.forEach((seat) => clearTimeout(seat.timer));
    seats.delete(gameId);
  };

  const publishPresence = (gameId: string, name: string) => {
    const seat = seatOf(gameId, name);
    broker.publish(
      `catnasta/game/${gameId}`,
      JSON.stringify({
        type: "PRESENCE",
        player: name,
        online: seat.online,
        forfeit_at: seat.online ? null : (seat.deadline ?? null),
      }),
    );
  };

  /** Ends a running game with `loser` forfeiting to their opponent. */
  const forfeit = async (game: Game, loser: string, reason: EndReason) => {
    const { gameState } = game;
    if (gameState.gameOver) {
      return;
    }
    gameState.gameOver = true;
    const [loserState, winnerState] =
      loser === gameState.player1.name
        ? [gameState.player1, gameState.player2]
        : [gameState.player2, gameState.player1];
    broker.publish(
      `catnasta/game/${game.gameId}`,
      JSON.stringify({
        type: "GAME_END",
        winner: { name: winnerState.name, points: winnerState.total },
        loser: { name: loserState.name, points: loserState.total },
        reason,
        forfeited_by: loser,
      }),
    );
    clearTable(game.gameId);
    removeGame(broker, game.gameId);
    try {
      await mongoClient.connect();
      await mongoClient
        .db("catnasta")
        .collection("games")
        .insertOne({ ...gameState, result: { reason, forfeitedBy: loser } });
    } catch (err) {
      console.error("Could not save forfeited game", err);
    }
  };

  /** Closes a table that never started, or frees the second seat. */
  const closeTable = (game: Game, leaver: string) => {
    const { gameState } = game;
    if (leaver === gameState.player2.name) {
      gameState.player2.name = "";
      seats.get(game.gameId)?.delete(leaver);
      broker.publish(
        `catnasta/game/${game.gameId}`,
        JSON.stringify({ type: "PLAYER_LEFT", player: leaver }),
      );
      publishGameList(broker);
      return;
    }
    broker.publish(
      `catnasta/game/${game.gameId}`,
      JSON.stringify({ type: "TABLE_CLOSED", player: leaver }),
    );
    clearTable(game.gameId);
    removeGame(broker, game.gameId);
  };

  const onGraceExpired = (gameId: string) => {
    const game = findGame(gameId);
    if (!game) {
      clearTable(gameId);
      return;
    }
    const absent = playerNames(game).filter((name) => !seatOf(gameId, name).online);
    if (absent.length === 0) {
      return;
    }
    if (!game.gameState.gameStarted) {
      // Nobody is waiting at an unstarted table any more.
      if (absent.includes(game.gameState.player1.name)) {
        closeTable(game, game.gameState.player1.name);
      }
      return;
    }
    if (absent.length === playerNames(game).length) {
      // Both players walked away: abandon without a winner.
      clearTable(gameId);
      removeGame(broker, gameId);
      return;
    }
    forfeit(game, absent[0], "forfeit");
  };

  const startGrace = (gameId: string, name: string) => {
    const seat = seatOf(gameId, name);
    if (seat.timer) {
      return;
    }
    seat.deadline = Date.now() + GRACE_MS;
    seat.timer = setTimeout(() => {
      seat.timer = undefined;
      onGraceExpired(gameId);
    }, GRACE_MS);
  };

  const setOnline = (gameId: string, name: string, online: boolean) => {
    const game = findGame(gameId);
    if (!game || game.gameState.gameOver || !playerNames(game).includes(name)) {
      return;
    }
    const seat = seatOf(gameId, name);
    if (seat.online === online && (online || seat.timer)) {
      return;
    }
    seat.online = online;
    if (online) {
      clearTimeout(seat.timer);
      seat.timer = undefined;
      seat.deadline = undefined;
    } else {
      startGrace(gameId, name);
    }
    publishPresence(gameId, name);
  };

  broker.onSubscriptionChange((topic, subscribers) => {
    const match = PRIVATE_TOPIC.exec(topic);
    if (match) {
      setOnline(match[1], match[2], subscribers > 0);
    }
  });

  return {
    /**
     * Sends both players' presence and starts the clock for anyone who
     * hasn't sat down yet (e.g. joined from the lobby but never opened the table).
     */
    sync(game: Game) {
      for (const name of playerNames(game)) {
        const seat = seatOf(game.gameId, name);
        if (!seat.online) {
          startGrace(game.gameId, name);
        }
        publishPresence(game.gameId, name);
      }
    },
    /** A player chose to leave: close an unstarted table or forfeit a running game. */
    leave(game: Game, name: string) {
      if (!playerNames(game).includes(name) || game.gameState.gameOver) {
        return;
      }
      if (!game.gameState.gameStarted) {
        closeTable(game, name);
      } else {
        forfeit(game, name, "left");
      }
    },
  };
}
