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
  gameResult: {
    winner: {
      name: string;
      points: number;
    } | null;
    loser: {
      name: string;
      points: number;
    } | null;
  };
  gameState: {
    gameOver: boolean;
    turn: string | null;
    canDraw: boolean;
    canDiscard: boolean;
    canMeld: boolean;
    player1: {
      name: string;
      score: number;
      hand: (Card | Joker)[];
      red_threes: Card[];
      melds: (Card | Joker)[][];
    };
    player2: {
      name: string;
      num_of_cards_in_hand: number;
      score: number;
      red_threes: Card[];
      melds: (Card | Joker)[][];
    };
    discardPileTopCard: Card | Joker | null;
    stockCardCount: number;
  };
}

export enum Type {
  SET,
  MODIFY,
  SET_CURRENT_PLAYER,
  SET_SECOND_PLAYER,
  EDIT_PLAYER_HAND,
  EDIT_SECOND_PLAYER_HAND,
  EDIT_PLAYER_RED_THREES,
  EDIT_SECOND_PLAYER_RED_THREES,
  EDIT_DISCARD_PILE_TOP_CARD,
  EDIT_PLAYER_MELDS,
  EDIT_SECOND_PLAYER_MELDS,
  EDIT_STOCK_CARD_COUNT,
  EDIT_GAME_OVER,
  SET_GAME_RESULT,
  UPDATE_SCORE,
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
    case Type.SET_CURRENT_PLAYER:
      if (payload === state.gameState.player1.name) {
        return {
          ...state,
          gameState: {
            ...state.gameState,
            turn: payload,
            canDraw: true,
            canDiscard: false,
            canMel: false,
          },
        };
      } else {
        return {
          ...state,
          gameState: {
            ...state.gameState,
            turn: payload,
          },
        };
      }
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
    case Type.EDIT_PLAYER_HAND:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player1: {
            ...state.gameState.player1,
            hand: payload,
          },
        },
      };
    case Type.EDIT_SECOND_PLAYER_HAND:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player2: {
            ...state.gameState.player2,
            num_of_cards_in_hand: payload,
          },
        },
      };
    case Type.EDIT_PLAYER_RED_THREES:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player1: {
            ...state.gameState.player1,
            red_threes: payload,
          },
        },
      };
    case Type.EDIT_SECOND_PLAYER_RED_THREES:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player2: {
            ...state.gameState.player2,
            red_threes: payload,
          },
        },
      };
    case Type.EDIT_DISCARD_PILE_TOP_CARD:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          discardPileTopCard: payload,
        },
      };
    case Type.EDIT_PLAYER_MELDS:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player1: {
            ...state.gameState.player1,
            melds: payload,
          },
        },
      };
    case Type.EDIT_SECOND_PLAYER_MELDS:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player2: {
            ...state.gameState.player2,
            melds: payload,
          },
        },
      };
    case Type.EDIT_STOCK_CARD_COUNT:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          stockCardCount: payload,
        },
      };
    case Type.EDIT_GAME_OVER:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          gameOver: payload,
        },
      };
    case Type.SET_GAME_RESULT:
      return {
        ...state,
        gameResult: payload,
      };
    case Type.UPDATE_SCORE:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          player1: {
            ...state.gameState.player1,
            score: payload.player1Score,
          },
          player2: {
            ...state.gameState.player2,
            score: payload.player2Score,
          },
        },
      };
    default:
      return state;
  }
};
