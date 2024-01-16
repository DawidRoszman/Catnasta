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
  suit: "RED" | "BLACK";
};

export interface Game {
  gameId: string;
  gameState: {
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
    discardPileTopCard: Card | Joker | null;
  };
}

export enum Type {
  SET,
  MODIFY,
  SET_SECOND_PLAYER,
}

export interface Action {
  type: Type;
  payload: any;
}

export const gameReducer = (state: Game, action: Action) => {
  const { type, payload } = action;
  switch (type) {
    case Type.SET:
      return {
        ...state,
        ...payload,
      };
    case Type.MODIFY:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          ...payload,
        },
      };
    case Type.SET_SECOND_PLAYER:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player2: {
            ...state.gameState.player2,
            name: payload.name,
          },
        },
      };
    default:
      return state;
  }
};
