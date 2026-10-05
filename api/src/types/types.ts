export interface ClientGame {
  gameId: string;
  gameState: {
    turn: string;
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
  /** Hidden from the lobby; reachable only by its code or invite link. */
  private?: boolean;
  gameState: GameState;
}
export interface Player {
  hand: (Card | Joker)[];
  melds: (Card | Joker)[][];
  red_threes: (Card | Joker)[];
  /** This round's score so far. */
  score: number;
  /** Points banked from finished rounds. */
  total: number;
  name: string;
}

/** Chosen by the host when the table is dealt. */
export interface TableSettings {
  /** First total to reach this wins the game. */
  winningScore: number;
  /** How long the summary of a finished round shows before the next deal. */
  roundBreakSeconds: number;
  /** Time each player has for a turn, or null for no limit. */
  turnSeconds: number | null;
  /** Cards dealt to each player at the start of a round. */
  handSize: number;
}

export interface GameState {
  settings: TableSettings;
  gameStarted: boolean;
  turn: string;
  /** Whether the player whose turn it is has already drawn this turn. */
  hasDrawn?: boolean;
  /** The player whose turn it is took the litterbox pile, so all that's left is the discard. */
  tookPile?: boolean;
  /** Epoch ms when the current turn is played automatically, if turns are timed. */
  turnDeadline?: number;
  gameOver: boolean;
  /** 1-based number of the round being played. */
  round: number;
  /** Who took the first turn this round; the other player opens the next one. */
  roundStarter?: string;
  /** Set between rounds, while the summary of the round just played is shown. */
  roundBreak?: RoundResult;
  player1: Player;
  player2: Player;
  discardPile: (Card | Joker)[];
  stock: (Card | Joker)[];
}
export interface RoundResult {
  round: number;
  results: { name: string; points: number; total: number }[];
  /** Epoch ms when the next round is dealt. */
  nextRoundAt: number;
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
