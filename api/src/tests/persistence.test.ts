/// <reference types="jest" />
import { SavedGame, createGameStore } from "../persistence";
import { DEFAULT_SETTINGS } from "../gameService";
import { Game } from "../types/types";

jest.mock("uuid", () => ({ v4: () => require("crypto").randomUUID() }));

const game = (gameId: string): Game => ({
  gameId,
  gameState: {
    settings: { ...DEFAULT_SETTINGS },
    gameStarted: true,
    gameOver: false,
    round: 1,
    turn: "ann",
    turnDeadline: undefined,
    player1: { name: "ann", hand: [], melds: [], red_threes: [], score: 0, total: 0 },
    player2: { name: "bob", hand: [], melds: [], red_threes: [], score: 0, total: 0 },
    stock: [],
    discardPile: [],
  },
});

const setup = () => {
  const live = new Map<string, Game>();
  const docs = new Map<string, SavedGame>();
  const collection = {
    replaceOne: jest.fn(async (_filter: { _id: string }, doc: SavedGame) => {
      docs.set(doc._id, doc);
    }),
    deleteOne: jest.fn(async ({ _id }: { _id: string }) => {
      docs.delete(_id);
    }),
    find: () => ({ toArray: async () => [...docs.values()] }),
  };
  const store = createGameStore(async () => collection, (id) => live.get(id));
  return { live, docs, collection, store };
};

describe("live game store", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("a burst of changes is written once, as it is after the last change", async () => {
    const { live, docs, collection, store } = setup();
    const table = game("T1");
    live.set("T1", table);
    store.changed("T1");
    table.gameState.turn = "bob";
    store.changed("T1");
    expect(collection.replaceOne).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(100);
    expect(collection.replaceOne).toHaveBeenCalledTimes(1);
    expect(docs.get("T1")!.game.gameState.turn).toBe("bob");
    expect(docs.get("T1")!.savedAt).toBe(Date.now());
  });

  test("the saved copy doesn't change with later moves", async () => {
    const { live, docs, store } = setup();
    const table = game("T1");
    live.set("T1", table);
    await store.saveNow(["T1"]);
    table.gameState.turn = "bob";
    expect(docs.get("T1")!.game.gameState.turn).toBe("ann");
  });

  test("a game that is no longer live is deleted", async () => {
    const { live, docs, store } = setup();
    live.set("T1", game("T1"));
    await store.saveNow(["T1"]);
    live.delete("T1");
    store.changed("T1");
    await jest.advanceTimersByTimeAsync(100);
    expect(docs.has("T1")).toBe(false);
  });

  test("games come back as they were saved, without unset fields", async () => {
    const { live, store } = setup();
    live.set("T1", game("T1"));
    live.set("T2", game("T2"));
    await store.saveNow(["T1", "T2"]);
    const saved = await store.load();
    expect(saved.map(({ _id }) => _id).sort()).toEqual(["T1", "T2"]);
    expect("turnDeadline" in saved[0].game.gameState).toBe(false);
  });

  test("a failed write is logged and later saves still go through", async () => {
    const { live, docs, collection, store } = setup();
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    collection.replaceOne.mockRejectedValueOnce(new Error("down"));
    live.set("T1", game("T1"));
    await store.saveNow(["T1"]);
    expect(error).toHaveBeenCalled();
    await store.saveNow(["T1"]);
    expect(docs.has("T1")).toBe(true);
    error.mockRestore();
  });
});
