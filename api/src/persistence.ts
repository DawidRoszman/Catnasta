import { Game } from "./types/types";

/** How long changes are gathered before they're written, so a burst of moves is one write. */
const SAVE_DELAY_MS = 100;

/** A live game as stored, keyed by its table code. */
export interface SavedGame {
  _id: string;
  game: Game;
  /** Epoch ms of the write; on a clean shutdown, when the server stopped. */
  savedAt: number;
}

/** The subset of a MongoDB collection the store uses. */
export interface SavedGameCollection {
  replaceOne(filter: { _id: string }, doc: SavedGame, options: { upsert: true }): Promise<unknown>;
  deleteOne(filter: { _id: string }): Promise<unknown>;
  find(): { toArray(): Promise<SavedGame[]> };
}

/**
 * Keeps unfinished games in the database so a restart (e.g. a deploy) can
 * pick them up again. Changed games are written shortly after they change;
 * games that are no longer live are deleted.
 */
export function createGameStore(
  collection: () => Promise<SavedGameCollection>,
  findGame: (gameId: string) => Game | undefined,
) {
  const dirty = new Set<string>();
  let timer: NodeJS.Timeout | undefined;
  let writing: Promise<void> = Promise.resolve();

  const write = async (gameIds: string[]) => {
    const games = await collection();
    const savedAt = Date.now();
    await Promise.all(
      gameIds.map(async (gameId) => {
        const game = findGame(gameId);
        try {
          if (game) {
            // A copy taken now, so later moves can't slip into this write half-done.
            const snapshot: Game = JSON.parse(JSON.stringify(game));
            await games.replaceOne({ _id: gameId }, { _id: gameId, game: snapshot, savedAt }, { upsert: true });
          } else {
            await games.deleteOne({ _id: gameId });
          }
        } catch (err) {
          console.error(`Could not save game ${gameId}`, err);
        }
      }),
    );
  };

  /** Writes everything that changed, after any write already under way. */
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    const gameIds = [...dirty];
    dirty.clear();
    writing = writing
      .then(() => (gameIds.length > 0 ? write(gameIds) : undefined))
      .catch((err) => console.error("Could not save games", err));
    return writing;
  };

  return {
    /** Queues a game to be saved, or deleted once it is no longer live. */
    changed(gameId: string) {
      dirty.add(gameId);
      timer ??= setTimeout(flush, SAVE_DELAY_MS);
    },
    /** Saves the given games (plus anything pending) right away, e.g. before shutting down. */
    saveNow(gameIds: string[] = []) {
      gameIds.forEach((gameId) => dirty.add(gameId));
      return flush();
    },
    /** Every game that was live when the server last stopped. */
    async load(): Promise<SavedGame[]> {
      return (await collection()).find().toArray();
    },
  };
}
