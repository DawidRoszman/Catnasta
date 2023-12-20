import { randomUUID } from "crypto";
import { Card, Joker, Rank, Suit, deck } from "../cards";
import {
  Player,
  GameState,
  revealFirstCard,
  checkForRedThreeInPlayerHand,
  startRound,
  dealCards,
} from "../game";

describe("Game", () => {
  let player1: Player;
  let player2: Player;
  let gameState: GameState;

  beforeEach(() => {
    player1 = {
      hand: [],
      melds: [],
      red_threes: [],
      score: 0,
      name: "Player 1",
    };

    player2 = {
      hand: [],
      melds: [],
      red_threes: [],
      score: 0,
      name: "Player 2",
    };

    gameState = {
      player1,
      player2,
      discardPile: [],
      stock: [],
    };
  });

  test("should deal 15 cards to each player and the rest to the stock", () => {
    const startingCards = deck;
    dealCards(gameState, startingCards);

    expect(gameState.player1.hand.length).toBe(15);
    expect(gameState.player2.hand.length).toBe(15);
    expect(gameState.stock.length).toBe(startingCards.length - 30);
  });

  test("should deal the first 15 cards to player1", () => {
    const startingCards = deck;
    dealCards(gameState, startingCards);

    expect(gameState.player1.hand).toEqual(startingCards.slice(0, 15));
  });

  test("should deal the next 15 cards to player2", () => {
    const startingCards = deck;
    dealCards(gameState, startingCards);

    expect(gameState.player2.hand).toEqual(startingCards.slice(15, 30));
  });

  test("should put the remaining cards in the stock", () => {
    const startingCards = deck;
    dealCards(gameState, startingCards);

    expect(gameState.stock).toEqual(startingCards.slice(30));
  });

  test("checkForRedThreeInPlayerHand", () => {
    player1.hand = [
      { rank: "3", suit: "HEART" } as Card,
      { rank: "3", suit: "DIAMOND" } as Card,
      { rank: "4", suit: "CLUB" } as Card,
    ];
    checkForRedThreeInPlayerHand(player1);
    expect(player1.red_threes.length).toBe(2);
    expect(player1.hand.length).toBe(1);
  });
  test("should reveal the first card that is not a joker, 2, or red 3", () => {
    gameState.stock = [
      {
        id: randomUUID(),
        rank: Rank.THREE,
        suit: Suit.HEART,
      },
      {
        id: randomUUID(),
        rank: Rank.TWO,
        suit: Suit.HEART,
      },
      {
        id: randomUUID(),
        rank: "JOKER",
        suit: "RED",
      },
      {
        id: randomUUID(),
        rank: Rank.FOUR,
        suit: Suit.DIAMOND,
      },
    ];
    revealFirstCard(gameState);
    console.log(gameState);
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    expect(topCard.rank.match(/(JOKER|2)/)).toBeNull();
    expect(
      topCard.suit.match(/(HEART|DIAMOND)/) && topCard.rank === "3"
    ).toBeFalsy();
  });

  test("should throw an error if the stock is empty", () => {
    gameState.stock = [];
    expect(() => revealFirstCard(gameState)).toThrow("Stock is empty");
  });
});
