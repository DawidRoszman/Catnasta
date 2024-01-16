export interface ClientGame {
  gameId: string;
  gameState: {
    turn: string,
    player1: {
      name: string;
      score: number;
      hand: (Card | Joker)[];
      red_threes: Card[];
      melds: (Card | Joker)[][];
    };
    player2: {
      name: string;
      score: number;
      red_threes: Card[];
      melds: (Card | Joker)[][];
    };
    discardPileTopCard: Card | Joker;
  };
}
export interface Game {
  gameId: string;
  gameState: GameState;
}
export interface Player {
  hand: (Card | Joker)[];
  melds: (Card | Joker)[][];
  red_threes: (Card | Joker)[];
  score: number;
  name: string;
}

export interface GameState {
  turn: string;
  player1: Player;
  player2: Player;
  discardPile: (Card | Joker)[];
  stock: (Card | Joker)[];
}
export enum Rank {
  ACE = "A",
  KING = "K",
  QUEEN = "Q",
  JACK = "J",
  TEN = "10",
  NINE = "9",
  EIGHT = "8",
  SEVEN = "7",
  SIX = "6",
  FIVE = "5",
  FOUR = "4",
  THREE = "3",
  TWO = "2",
}

export enum Suit {
  HEART = "HEART",
  DIAMOND = "DIAMOND",
  CLUB = "CLUB",
  SPADE = "SPADE",
}

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
};

export type Joker = {
  id: string;
  rank: "JOKER";
  suit: Suit;
};
