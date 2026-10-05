/// <reference types="jest" />
// import { randomUUID } from "crypto";
// import { Card, Joker, Rank, Suit, deck } from "../cards";
// import {
//   Player,
//   GameState,
//   revealFirstCard,
//   checkForRedThreeInPlayerHand,
//   startRound,
//   dealCards,
//   drawCard,
// } from "../game";
//
// describe("Game", () => {
//   let player1: Player;
//   let player2: Player;
//   let gameState: GameState;
//
//   beforeEach(() => {
//     player1 = {
//       hand: [],
//       melds: [],
//       red_threes: [],
//       score: 0,
//       name: "Player 1",
//     };
//
//     player2 = {
//       hand: [],
//       melds: [],
//       red_threes: [],
//       score: 0,
//       name: "Player 2",
//     };
//
//     gameState = {
//       player1,
//       player2,
//       discardPile: [],
//       stock: [],
//     };
//   });
//
//   test("should deal 15 cards to each player and the rest to the stock", () => {
//     const startingCards = deck;
//     dealCards(gameState, startingCards);
//
//     expect(gameState.player1.hand.length).toBe(15);
//     expect(gameState.player2.hand.length).toBe(15);
//     expect(gameState.stock.length).toBe(startingCards.length - 30);
//   });
//
//   test("should deal the first 15 cards to player1", () => {
//     const startingCards = deck;
//     dealCards(gameState, startingCards);
//
//     expect(gameState.player1.hand).toEqual(startingCards.slice(0, 15));
//   });
//
//   test("should deal the next 15 cards to player2", () => {
//     const startingCards = deck;
//     dealCards(gameState, startingCards);
//
//     expect(gameState.player2.hand).toEqual(startingCards.slice(15, 30));
//   });
//
//   test("should put the remaining cards in the stock", () => {
//     const startingCards = deck;
//     dealCards(gameState, startingCards);
//
//     expect(gameState.stock).toEqual(startingCards.slice(30));
//   });
//
//   test("should not put red three to player hand after drawing", () => {
//     const startingCards = [
//       { rank: "3", suit: "HEART" } as Card,
//       { rank: "3", suit: "DIAMOND" } as Card,
//       { rank: "4", suit: "CLUB" } as Card,
//     ];
//     const drawnCard = drawCard(startingCards, gameState.player1);
//     expect(drawnCard).toEqual({ rank: "4", suit: "CLUB" });
//   });
//
//   test("checkForRedThreeInPlayerHand", () => {
//     player1.hand = [
//       { rank: "3", suit: "HEART" } as Card,
//       { rank: "3", suit: "DIAMOND" } as Card,
//       { rank: "4", suit: "CLUB" } as Card,
//     ];
//     checkForRedThreeInPlayerHand(player1);
//     expect(player1.red_threes.length).toBe(2);
//     expect(player1.hand.length).toBe(1);
//   });
//   test("should reveal the first card that is not a joker, 2, or red 3", () => {
//     gameState.stock = [
//       {
//         id: randomUUID(),
//         rank: Rank.THREE,
//         suit: Suit.HEART,
//       },
//       {
//         id: randomUUID(),
//         rank: Rank.TWO,
//         suit: Suit.HEART,
//       },
//       {
//         id: randomUUID(),
//         rank: "JOKER",
//         suit: "RED",
//       },
//       {
//         id: randomUUID(),
//         rank: Rank.FOUR,
//         suit: Suit.DIAMOND,
//       },
//     ];
//     revealFirstCard(gameState);
//     console.log(gameState);
//     const topCard = gameState.discardPile[gameState.discardPile.length - 1];
//     expect(topCard.rank.match(/(JOKER|2)/)).toBeNull();
//     expect(
//       topCard.suit.match(/(HEART|DIAMOND)/) && topCard.rank === "3"
//     ).toBeFalsy();
//   });
//
//   test("should throw an error if the stock is empty", () => {
//     gameState.stock = [];
//     expect(() => revealFirstCard(gameState)).toThrow("Stock is empty");
//   });
// });

// uuid ships as ESM only, which Jest's CommonJS runtime can't load.
jest.mock("uuid", () => ({ v4: () => require("crypto").randomUUID() }));

import { getMinimumFirstMeldPoints } from "../game";
import {
  ROUND_BREAK_MS,
  WINNING_SCORE,
  discardCardDispatch,
  drawCardDispatch,
  games,
  meldCardDispatch,
  pickUpPileDispatch,
} from "../gameService";
import { Broker } from "../socket";
import { Card, GameState, Player, Rank, Suit } from "../types/types";

let nextId = 0;
const card = (rank: Rank, suit = Suit.HEART): Card => ({ id: `c${nextId++}`, rank, suit });
const cards = (n: number, rank: Rank, suit = Suit.SPADE) =>
  Array.from({ length: n }, () => card(rank, suit));

const player = (name: string, overrides: Partial<Player> = {}): Player => ({
  name,
  hand: [],
  melds: [],
  red_threes: [],
  score: 0,
  total: 0,
  ...overrides,
});

const setup = (overrides: Partial<GameState> = {}) => {
  const published: { topic: string; msg: any }[] = [];
  const broker: Broker = {
    publish: (topic, message) => published.push({ topic, msg: JSON.parse(message) }),
    onMessage: () => {},
    onSubscriptionChange: () => {},
  };
  const gameState: GameState = {
    gameStarted: true,
    gameOver: false,
    round: 1,
    roundStarter: "ann",
    turn: "ann",
    hasDrawn: false,
    player1: player("ann"),
    player2: player("bob"),
    stock: cards(20, Rank.FIVE, Suit.CLUB),
    discardPile: [card(Rank.NINE)],
    ...overrides,
  };
  games.splice(0, games.length, { gameId: "T1", gameState });
  const insertOne = jest.fn();
  const mongo = {
    connect: jest.fn(async () => undefined),
    db: () => ({ collection: () => ({ insertOne }) }),
  } as any;
  const ofType = (type: string) => published.filter(({ msg }) => msg.type === type);
  return { broker, gameState, published, ofType, mongo, insertOne };
};

const msg = (name: string, extra: object = {}) => ({ id: "T1", name, ...extra });

describe("first meld minimum", () => {
  test.each([
    [-10, 15],
    [0, 50],
    [1495, 50],
    [1500, 90],
    [2995, 90],
    [3000, 120],
  ])("a total of %i needs %i points", (total, minimum) => {
    expect(getMinimumFirstMeldPoints(total)).toBe(minimum);
  });

  test("is based on the points banked in earlier rounds", () => {
    // Five kings are worth 50: enough to open at a total of 0, but not at 1500 (needs 90).
    const kings = cards(5, Rank.KING);
    const { broker, gameState, ofType } = setup({
      hasDrawn: true,
      player1: player("ann", { total: 1500, hand: [...kings, card(Rank.FOUR)] }),
    });
    meldCardDispatch(broker, gameState, msg("ann", { melds: [kings.map((k) => k.id)] }));
    expect(gameState.player1.melds).toHaveLength(0);
    expect(ofType("MELD_ERROR")[0].msg.message).toMatch(/at least 90 points/);

    gameState.player1.total = 0;
    meldCardDispatch(broker, gameState, msg("ann", { melds: [kings.map((k) => k.id)] }));
    expect(gameState.player1.melds).toHaveLength(1);
  });
});

describe("drawing after taking the pile", () => {
  test("a big hand from the pile does not block later draws", () => {
    const { broker, gameState } = setup({
      player1: player("ann", {
        melds: [cards(3, Rank.ACE)],
        hand: [...cards(2, Rank.NINE), ...cards(12, Rank.SIX)],
      }),
      discardPile: [...cards(10, Rank.SEVEN), card(Rank.NINE)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(gameState.player1.hand.length + 3).toBeGreaterThan(16);

    // A later turn: drawing from the stock must still work.
    gameState.hasDrawn = false;
    const before = gameState.player1.hand.length;
    drawCardDispatch(broker, gameState, msg("ann"));
    expect(gameState.player1.hand).toHaveLength(before + 1);
  });
});

describe("rounds", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("going out banks the scores and deals the next round", async () => {
    const last = card(Rank.FOUR);
    const { broker, gameState, ofType } = setup({
      hasDrawn: true,
      player1: player("ann", { total: 200, melds: [cards(7, Rank.KING)], hand: [last] }),
      player2: player("bob", { total: 100, hand: cards(3, Rank.QUEEN) }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: last.id }), {} as any, games);

    // ann: 70 melded + 500 natural Catnasta + 100 for going out; bob: -30 in hand.
    const roundEnd = ofType("ROUND_END")[0].msg;
    expect(roundEnd.round).toBe(1);
    expect(roundEnd.results).toEqual([
      { name: "ann", points: 670, total: 870 },
      { name: "bob", points: -30, total: 70 },
    ]);
    expect(ofType("TURN")).toHaveLength(0);
    expect(gameState.turn).toBe("");
    expect(ofType("GAME_END")).toHaveLength(0);

    // Nobody can play during the break.
    drawCardDispatch(broker, gameState, msg("bob"));
    expect(gameState.player2.hand).toHaveLength(3);

    jest.advanceTimersByTime(ROUND_BREAK_MS);
    expect(gameState.round).toBe(2);
    expect(gameState.roundBreak).toBeUndefined();
    expect(gameState.turn).toBe("bob");
    expect(gameState.player1.melds).toEqual([]);
    expect(gameState.player1.score).toBe(0);
    expect(gameState.player1.total).toBe(870);
    expect(gameState.player1.hand.length).toBeGreaterThanOrEqual(15);
    const start = ofType("GAME_START").at(-1)!.msg;
    expect(start).toMatchObject({ round: 2, current_player: "bob" });
  });

  test("an empty stock ends the round too", async () => {
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { hand: cards(3, Rank.SIX) }),
      stock: [card(Rank.EIGHT)],
    });
    drawCardDispatch(broker, gameState, msg("ann"));
    expect(gameState.gameOver).toBe(false);
    const toDiscard = gameState.player1.hand[0].id;
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: toDiscard }), {} as any, games);
    expect(ofType("ROUND_END")).toHaveLength(1);
  });

  test("the game ends once a total reaches the winning score", async () => {
    const last = card(Rank.FOUR);
    const { broker, gameState, ofType, mongo, insertOne } = setup({
      hasDrawn: true,
      player1: player("ann", {
        total: WINNING_SCORE - 100,
        melds: [cards(7, Rank.KING)],
        hand: [last],
      }),
      player2: player("bob", { total: 3000, hand: cards(3, Rank.QUEEN) }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: last.id }), mongo, games);

    expect(ofType("ROUND_END")).toHaveLength(0);
    expect(ofType("GAME_END")[0].msg).toEqual({
      type: "GAME_END",
      winner: { name: "ann", points: WINNING_SCORE + 570 },
      loser: { name: "bob", points: 2970 },
    });
    expect(gameState.gameOver).toBe(true);
    expect(games).toHaveLength(0);
    expect(insertOne).toHaveBeenCalled();
  });
});
