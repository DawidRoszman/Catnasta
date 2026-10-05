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

import { getMinimumFirstMeldPoints, lowestCardToDiscard } from "../game";
import {
  DEFAULT_SETTINGS,
  discardCardDispatch,
  drawCardDispatch,
  games,
  meldCardDispatch,
  newTableCode,
  parseTableSettings,
  pickUpPileDispatch,
  resumeGame,
  setGameChangeListener,
  startRoundDispatch,
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
    settings: { ...DEFAULT_SETTINGS },
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
    [-500, 30],
    [0, 30],
    [495, 30],
    [500, 50],
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

  test("three kings (30 points) are enough to open a game", () => {
    const kings = cards(3, Rank.KING);
    const { broker, gameState } = setup({
      hasDrawn: true,
      player1: player("ann", { hand: [...kings, card(Rank.FOUR)] }),
    });
    meldCardDispatch(broker, gameState, msg("ann", { melds: [kings.map((k) => k.id)] }));
    expect(gameState.player1.melds).toEqual([kings]);
  });
});

describe("scores", () => {
  test("each player sees only their own round score, which would reveal the other's hand", async () => {
    const card4 = card(Rank.FOUR);
    const { broker, gameState, published } = setup({
      hasDrawn: true,
      player1: player("ann", { total: 120, melds: [cards(3, Rank.KING)], hand: [card4, card(Rank.ACE)] }),
      player2: player("bob", { total: 80, hand: cards(4, Rank.QUEEN) }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: card4.id }), {} as any, games);

    const scores = published.filter(({ msg }) => msg.type === "UPDATE_SCORE");
    expect(scores.map(({ topic }) => topic).sort()).toEqual(["catnasta/game/T1/ann", "catnasta/game/T1/bob"]);
    const forAnn = scores.find(({ topic }) => topic.endsWith("/ann"))!.msg;
    const forBob = scores.find(({ topic }) => topic.endsWith("/bob"))!.msg;
    expect(forAnn.player1Score).toEqual({ name: "ann", score: gameState.player1.score, total: 120 });
    expect(forAnn.player2Score).toEqual({ name: "bob", score: null, total: 80 });
    expect(forBob.player1Score).toEqual({ name: "ann", score: null, total: 120 });
    expect(forBob.player2Score.score).toBe(gameState.player2.score);
  });
});

describe("one meld per rank", () => {
  test("melding a rank already on the table adds the cards to that meld", () => {
    const queens = cards(3, Rank.QUEEN);
    const more = cards(3, Rank.QUEEN, Suit.CLUB);
    const { broker, gameState, ofType } = setup({
      hasDrawn: true,
      player1: player("ann", { melds: [queens], hand: [...more, card(Rank.FOUR)] }),
    });
    const expected = [...queens, ...more];
    meldCardDispatch(broker, gameState, msg("ann", { melds: [more.map(({ id }) => id)] }));
    expect(gameState.player1.melds).toEqual([expected]);
    expect(gameState.player1.hand).toHaveLength(1);
    expect(ofType("MELDED_CARDS").at(-1)!.msg.melds).toHaveLength(1);
  });

  test("two sets of the same rank laid down together become one meld", () => {
    const first = cards(3, Rank.KING);
    const second = cards(3, Rank.KING, Suit.DIAMOND);
    const { broker, gameState } = setup({
      hasDrawn: true,
      player1: player("ann", { hand: [...first, ...second, card(Rank.FOUR)] }),
    });
    meldCardDispatch(
      broker,
      gameState,
      msg("ann", { melds: [first.map(({ id }) => id), second.map(({ id }) => id)] }),
    );
    expect(gameState.player1.melds).toHaveLength(1);
    expect(gameState.player1.melds[0]).toHaveLength(6);
  });

  test("joining is refused if wild cards would no longer be outnumbered", () => {
    // Fine on their own (two naturals, three wilds), but together it's four of each.
    const meld = [...cards(2, Rank.JACK), card(Rank.TWO)];
    const wildHeavy = [
      ...cards(2, Rank.JACK, Suit.CLUB),
      card(Rank.TWO),
      card(Rank.TWO, Suit.CLUB),
      { id: "jk", rank: "JOKER" as const, suit: Suit.HEART },
    ];
    const { broker, gameState, ofType } = setup({
      hasDrawn: true,
      player1: player("ann", { melds: [meld], hand: [...wildHeavy, card(Rank.FOUR)] }),
    });
    meldCardDispatch(broker, gameState, msg("ann", { melds: [wildHeavy.map(({ id }) => id)] }));
    expect(gameState.player1.melds).toEqual([meld]);
    expect(ofType("MELD_ERROR")[0].msg.message).toMatch(/more natural cards than wild cards/);
  });
});

describe("taking the discard pile", () => {
  test("melds the top card with two naturals from the hand and takes the rest", () => {
    const nines = cards(2, Rank.NINE);
    const top = card(Rank.NINE);
    const rest = cards(3, Rank.SEVEN);
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { melds: [cards(3, Rank.ACE)], hand: [...nines, card(Rank.FOUR)] }),
      discardPile: [...rest, top],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));

    expect(gameState.player1.melds[1]).toEqual([top, ...nines]);
    expect(gameState.player1.hand.map(({ rank }) => rank).sort()).toEqual(["4", "7", "7", "7"]);
    expect(gameState.discardPile).toEqual([]);
    expect(ofType("MELDED_CARDS").at(-1)!.msg.melds[1]).toHaveLength(3);
  });

  test("joins a meld of the same rank the player already has", () => {
    const nines = cards(2, Rank.NINE);
    const meld = cards(3, Rank.NINE, Suit.CLUB);
    const { broker, gameState } = setup({
      player1: player("ann", { melds: [meld], hand: [...nines, card(Rank.FOUR)] }),
      discardPile: [card(Rank.NINE)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(gameState.player1.melds).toHaveLength(1);
    expect(gameState.player1.melds[0]).toHaveLength(6);
    expect(gameState.player1.hand).toHaveLength(1);
  });

  test("a catnasta of the top card's rank takes the pile without a pair in hand", () => {
    const catnasta = cards(7, Rank.EIGHT);
    const top = card(Rank.EIGHT, Suit.DIAMOND);
    const rest = [card(Rank.SIX), card(Rank.KING)];
    const hand = [card(Rank.FOUR)];
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { melds: [catnasta], hand }),
      discardPile: [...rest, top],
    });
    const expectedHand = [...hand, ...rest];
    pickUpPileDispatch(broker, gameState, msg("ann"));

    expect(ofType("PICKUP_ERROR")).toHaveLength(0);
    // Taking the pile ends the turn.
    expect(gameState.turn).toBe("bob");
    expect(gameState.player1.melds).toHaveLength(1);
    expect(gameState.player1.melds[0]).toHaveLength(8);
    expect(gameState.player1.melds[0].at(-1)).toBe(top);
    expect(gameState.player1.hand).toEqual(expectedHand);
    expect(gameState.discardPile).toEqual([]);
  });

  test("with a catnasta and a pair, only the top card joins and the pair stays in hand", () => {
    const pair = cards(2, Rank.EIGHT, Suit.HEART);
    const { broker, gameState } = setup({
      player1: player("ann", { melds: [cards(7, Rank.EIGHT)], hand: pair }),
      discardPile: [card(Rank.EIGHT)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(gameState.player1.melds[0]).toHaveLength(8);
    expect(gameState.player1.hand).toEqual(pair);
  });

  test("a meld of that rank that isn't a catnasta yet still needs the pair", () => {
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { melds: [cards(5, Rank.EIGHT)], hand: [card(Rank.EIGHT), card(Rank.FOUR)] }),
      discardPile: [card(Rank.EIGHT)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(ofType("PICKUP_ERROR")).toHaveLength(1);
    expect(gameState.discardPile).toHaveLength(1);
  });

  test("a catnasta doesn't unblock a black three on top", () => {
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { melds: [cards(7, Rank.THREE, Suit.HEART)], hand: [card(Rank.FOUR)] }),
      discardPile: [card(Rank.THREE, Suit.CLUB)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(ofType("PICKUP_ERROR")).toHaveLength(1);
  });

  test("is refused when nothing would be left to discard", () => {
    const nines = cards(2, Rank.NINE);
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { melds: [cards(3, Rank.ACE)], hand: nines }),
      discardPile: [card(Rank.NINE)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(ofType("PICKUP_ERROR")).toHaveLength(1);
    expect(gameState.player1.hand).toEqual(nines);
    expect(gameState.discardPile).toHaveLength(1);
    expect(gameState.hasDrawn).toBe(false);
  });
});

describe("turns around the litterbox", () => {
  test("taking the pile with a pair ends the turn: no meld or discard after it", () => {
    const nines = cards(2, Rank.NINE);
    const { broker, gameState, ofType } = setup({
      player1: player("ann", { melds: [cards(3, Rank.ACE)], hand: [...nines, card(Rank.FOUR)] }),
      discardPile: [card(Rank.SIX), card(Rank.NINE)],
    });
    pickUpPileDispatch(broker, gameState, msg("ann"));
    expect(gameState.turn).toBe("bob");
    expect(gameState.hasDrawn).toBe(false);
    expect(ofType("TURN").at(-1)!.msg.current_player).toBe("bob");

    // Ann can't carry on with her turn.
    const handBefore = gameState.player1.hand.length;
    discardCardDispatch(broker, gameState, msg("ann", { cardId: gameState.player1.hand[0].id }), {} as any, games);
    expect(gameState.player1.hand).toHaveLength(handBefore);
  });

  test("discarding a card that matches the opponent's catnasta hands them the pile and skips their turn", async () => {
    const eight = card(Rank.EIGHT, Suit.CLUB);
    const catnasta = cards(7, Rank.EIGHT);
    const bobHand = cards(3, Rank.QUEEN);
    const { broker, gameState, ofType } = setup({
      hasDrawn: true,
      player1: player("ann", { hand: [eight, card(Rank.FOUR), card(Rank.FIVE)] }),
      player2: player("bob", { melds: [catnasta], hand: bobHand }),
      discardPile: [card(Rank.SIX), card(Rank.KING)],
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: eight.id }), {} as any, games);

    expect(gameState.player2.melds[0]).toHaveLength(8);
    expect(gameState.player2.melds[0].at(-1)).toBe(eight);
    expect(gameState.player2.hand.map(({ rank }) => rank).sort()).toEqual(["6", "K", "Q", "Q", "Q"]);
    expect(gameState.discardPile).toEqual([]);
    // Bob's turn was spent taking the pile, so it's Ann's turn again.
    expect(gameState.turn).toBe("ann");
    expect(gameState.hasDrawn).toBe(false);
    expect(ofType("PILE_FORCED")[0].msg).toMatchObject({ player: "bob", card: eight });
    expect(ofType("TURN").map(({ msg }) => msg.current_player)).toEqual(["ann"]);
  });

  test("a card that doesn't match the catnasta's rank leaves the turn alone", async () => {
    const four = card(Rank.FOUR);
    const { broker, gameState, ofType } = setup({
      hasDrawn: true,
      player1: player("ann", { hand: [four, card(Rank.FIVE)] }),
      player2: player("bob", { melds: [cards(7, Rank.EIGHT)], hand: cards(2, Rank.QUEEN) }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: four.id }), {} as any, games);
    expect(gameState.turn).toBe("bob");
    expect(ofType("PILE_FORCED")).toHaveLength(0);
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
    expect(gameState.player1.hand.length).toBeGreaterThan(16);

    // A later turn: drawing from the stock must still work.
    gameState.turn = "ann";
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

    jest.advanceTimersByTime(DEFAULT_SETTINGS.roundBreakSeconds * 1000);
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
        total: DEFAULT_SETTINGS.winningScore - 100,
        melds: [cards(7, Rank.KING)],
        hand: [last],
      }),
      player2: player("bob", { total: 3000, hand: cards(3, Rank.QUEEN) }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: last.id }), mongo, games);

    expect(ofType("ROUND_END")).toHaveLength(0);
    expect(ofType("GAME_END")[0].msg).toEqual({
      type: "GAME_END",
      winner: { name: "ann", points: DEFAULT_SETTINGS.winningScore + 570 },
      loser: { name: "bob", points: 2970 },
    });
    expect(gameState.gameOver).toBe(true);
    expect(games).toHaveLength(0);
    expect(insertOne).toHaveBeenCalled();
  });
});

describe("table settings", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("fill in defaults and reject values out of range", () => {
    expect(parseTableSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(
      parseTableSettings({ winningScore: 1000, roundBreakSeconds: 5, turnSeconds: 60, handSize: 11 }),
    ).toEqual({
      winningScore: 1000,
      roundBreakSeconds: 5,
      turnSeconds: 60,
      handSize: 11,
    });
    expect(parseTableSettings({ handSize: 8 })).toEqual({
      error: "Cards in hand must be a whole number from 9 to 17",
    });
    expect(parseTableSettings({ handSize: 18 })).toHaveProperty("error");
    expect(parseTableSettings({ turnSeconds: 0 })).toEqual(DEFAULT_SETTINGS);
    expect(parseTableSettings({ turnSeconds: 45 })).toEqual({
      error: "Time per turn must be off or 30, 60, 90 seconds",
    });
    expect(parseTableSettings({ winningScore: 100 })).toEqual({
      error: "Points to win must be a whole number from 500 to 20000",
    });
    expect(parseTableSettings({ roundBreakSeconds: 2.5 })).toHaveProperty("error");
    expect(parseTableSettings({ winningScore: "5000" })).toHaveProperty("error");
  });

  test.each([9, 17])("deals %i cards to each player when the table asks for it", (handSize) => {
    const { broker, gameState } = setup({
      gameStarted: false,
      turn: "",
      settings: { ...DEFAULT_SETTINGS, handSize },
    });
    startRoundDispatch(broker, gameState, msg("ann"), {} as any);
    // Red threes are laid out and replaced, so the hand stays at the dealt size.
    expect(gameState.player1.hand).toHaveLength(handSize);
    expect(gameState.player2.hand).toHaveLength(handSize);
  });

  test("a table's own target and break decide when rounds and the game end", async () => {
    const last = card(Rank.FOUR);
    const { broker, gameState, ofType } = setup({
      settings: { ...DEFAULT_SETTINGS, winningScore: 1000, roundBreakSeconds: 3 },
      hasDrawn: true,
      player1: player("ann", { total: 200, melds: [cards(7, Rank.KING)], hand: [last] }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: last.id }), {} as any, games);
    // 870 is short of the 1000 target, so another round follows after 3 seconds.
    expect(ofType("ROUND_END")).toHaveLength(1);
    expect(ofType("UPDATE_SCORE").at(-1)!.msg.winning_score).toBe(1000);
    jest.advanceTimersByTime(2999);
    expect(gameState.round).toBe(1);
    jest.advanceTimersByTime(1);
    expect(gameState.round).toBe(2);
  });
});

describe("turn timer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const timed = (overrides: Partial<GameState> = {}) =>
    setup({
      gameStarted: false,
      turn: "",
      settings: { ...DEFAULT_SETTINGS, turnSeconds: 30 },
      ...overrides,
    });

  test("discards the lowest card from three up, keeping wild cards", () => {
    const hand = [card(Rank.KING), card(Rank.TWO), card(Rank.FIVE), card(Rank.THREE, Suit.CLUB)];
    expect(lowestCardToDiscard(hand)?.rank).toBe(Rank.THREE);
    expect(lowestCardToDiscard([card(Rank.ACE), card(Rank.TEN)])?.rank).toBe(Rank.TEN);
    expect(lowestCardToDiscard([card(Rank.TWO), { id: "j", rank: "JOKER", suit: Suit.HEART }])?.rank).toBe(
      Rank.TWO,
    );
  });

  test("a turn that runs out draws a card, discards the lowest and passes the turn", async () => {
    const { broker, gameState, ofType } = timed();
    startRoundDispatch(broker, gameState, msg("ann"), {} as any);
    const starter = gameState.turn;
    const other = starter === "ann" ? "bob" : "ann";
    const start = ofType("GAME_START")[0].msg;
    expect(start.turn_deadline).toBe(Date.now() + 30_000);

    const seat = starter === "ann" ? gameState.player1 : gameState.player2;
    const before = seat.hand.length;
    const lowest = lowestCardToDiscard([...seat.hand, gameState.stock[0]])!;
    jest.advanceTimersByTime(29_999);
    expect(gameState.turn).toBe(starter);
    jest.advanceTimersByTime(1);
    await Promise.resolve();

    expect(ofType("TURN_TIMEOUT")[0].msg).toMatchObject({ player: starter });
    expect(gameState.discardPile.at(-1)!.rank).toBe(lowest.rank);
    expect(seat.hand).toHaveLength(before);
    expect(gameState.turn).toBe(other);
    expect(ofType("TURN").at(-1)!.msg).toMatchObject({
      current_player: other,
      turn_deadline: Date.now() + 30_000,
    });
  });

  test("a player who already drew only has the lowest card discarded", async () => {
    const { broker, gameState } = timed();
    startRoundDispatch(broker, gameState, msg("ann"), {} as any);
    const starter = gameState.turn;
    drawCardDispatch(broker, gameState, msg(starter));
    const seat = starter === "ann" ? gameState.player1 : gameState.player2;
    const stock = gameState.stock.length;
    const handAfterDraw = seat.hand.length;
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    expect(gameState.stock).toHaveLength(stock);
    expect(seat.hand).toHaveLength(handAfterDraw - 1);
  });

  test("discarding in time restarts the clock for the next player", async () => {
    const { broker, gameState, ofType } = timed();
    startRoundDispatch(broker, gameState, msg("ann"), {} as any);
    const starter = gameState.turn;
    drawCardDispatch(broker, gameState, msg(starter));
    jest.advanceTimersByTime(20_000);
    const seat = starter === "ann" ? gameState.player1 : gameState.player2;
    await discardCardDispatch(broker, gameState, msg(starter, { cardId: seat.hand[0].id }), {} as any, games);
    // The first clock would have fired at 30 s; the new turn gets its own 30 s.
    jest.advanceTimersByTime(15_000);
    expect(ofType("TURN_TIMEOUT")).toHaveLength(0);
    jest.advanceTimersByTime(15_000);
    await Promise.resolve();
    expect(ofType("TURN_TIMEOUT")).toHaveLength(1);
  });

  test("untimed tables never play for anyone", () => {
    const { broker, gameState, ofType } = setup({ gameStarted: false, turn: "" });
    startRoundDispatch(broker, gameState, msg("ann"), {} as any);
    expect(ofType("GAME_START")[0].msg.turn_deadline).toBeNull();
    jest.advanceTimersByTime(10 * 60_000);
    expect(ofType("TURN_TIMEOUT")).toHaveLength(0);
  });
});

describe("resuming after a restart", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("a timed turn carries on with the time it had left when the server stopped", async () => {
    const { broker, gameState, ofType } = setup({
      settings: { ...DEFAULT_SETTINGS, turnSeconds: 60 },
      player1: player("ann", { hand: cards(5, Rank.KING) }),
    });
    const stoppedAt = Date.now();
    gameState.turnDeadline = stoppedAt + 25_000;
    // The server was down for two minutes.
    jest.advanceTimersByTime(120_000);
    resumeGame(broker, games[0], {} as any, stoppedAt);

    expect(gameState.turnDeadline).toBe(Date.now() + 25_000);
    jest.advanceTimersByTime(24_999);
    expect(ofType("TURN_TIMEOUT")).toHaveLength(0);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(ofType("TURN_TIMEOUT")[0].msg).toMatchObject({ player: "ann" });
    expect(gameState.turn).toBe("bob");
  });

  test("a turn that was nearly out still gets a few seconds", () => {
    const { broker, gameState } = setup({ settings: { ...DEFAULT_SETTINGS, turnSeconds: 30 } });
    const stoppedAt = Date.now();
    gameState.turnDeadline = stoppedAt + 1_000;
    resumeGame(broker, games[0], {} as any, stoppedAt);
    expect(gameState.turnDeadline).toBe(Date.now() + 10_000);
  });

  test("a round break finishes and deals the next round", () => {
    const { broker, gameState, ofType } = setup({ turn: "" });
    const stoppedAt = Date.now();
    gameState.roundBreak = { round: 1, results: [], nextRoundAt: stoppedAt + 4_000 };
    jest.advanceTimersByTime(60_000);
    resumeGame(broker, games[0], {} as any, stoppedAt);
    expect(gameState.roundBreak.nextRoundAt).toBe(Date.now() + 4_000);

    jest.advanceTimersByTime(4_000);
    expect(gameState.round).toBe(2);
    expect(gameState.turn).toBe("bob");
    expect(ofType("GAME_START").at(-1)!.msg).toMatchObject({ round: 2 });
  });

  test("untimed turns and unstarted tables need no clock", () => {
    const { broker, gameState, ofType } = setup();
    resumeGame(broker, games[0], {} as any, Date.now());
    expect(gameState.turnDeadline).toBeUndefined();
    jest.advanceTimersByTime(10 * 60_000);
    expect(ofType("TURN_TIMEOUT")).toHaveLength(0);
  });

  test("every change to a live game is reported so it can be saved", async () => {
    const changed = jest.fn();
    setGameChangeListener(changed);
    const last = card(Rank.FOUR);
    const { broker, gameState } = setup({
      hasDrawn: true,
      player1: player("ann", { melds: [cards(7, Rank.KING)], hand: [last] }),
      player2: player("bob", { hand: cards(3, Rank.QUEEN) }),
    });
    await discardCardDispatch(broker, gameState, msg("ann", { cardId: last.id }), {} as any, games);
    expect(changed).toHaveBeenCalledWith("T1");
    setGameChangeListener(() => {});
  });
});

describe("table codes", () => {
  test("never use characters that look alike", () => {
    games.splice(0, games.length);
    for (let i = 0; i < 500; i++) {
      expect(newTableCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    }
  });
});
