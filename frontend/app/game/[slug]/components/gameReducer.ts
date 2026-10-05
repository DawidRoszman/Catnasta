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

export type EndReason = "score" | "forfeit" | "left";

export type RoundResult = {
  round: number;
  results: { name: string; points: number; total: number }[];
  /** Epoch ms when the next round is dealt. */
  nextRoundAt: number;
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
    reason: EndReason;
    forfeitedBy: string | null;
  };
  /** The opponent's connection, as reported by the server. */
  opponentPresence: {
    online: boolean;
    /** Epoch ms when they forfeit unless they return. */
    forfeitAt: number | null;
  };
  /** The host closed the table before the game started. */
  closed: boolean;
  /** Summary of the round just finished, shown until the next deal. */
  roundResult: RoundResult | null;
  gameState: {
    round: number;
    /** First total to reach this wins the game. */
    winningScore: number;
    gameOver: boolean;
    turn: string | null;
    canDraw: boolean;
    canDiscard: boolean;
    canMeld: boolean;
    player1: {
      name: string;
      score: number;
      total: number;
      hand: (Card | Joker)[];
      red_threes: Card[];
      melds: (Card | Joker)[][];
    };
    player2: {
      name: string;
      num_of_cards_in_hand: number;
      score: number;
      total: number;
      red_threes: Card[];
      melds: (Card | Joker)[][];
    };
    discardPileTopCard: Card | Joker | null;
    discardPileCount: number;
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
  PLAYER_DRAW_CARD,
  SET_OPPONENT_PRESENCE,
  TABLE_CLOSED,
  NEW_ROUND,
  SET_ROUND_RESULT,
}

export interface Action {
  type: Type;
  payload: any;
}

export const gameReducer = (state: Game, action: Action): Game => {
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
            canMeld: false,
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
          discardPileTopCard: payload.card ?? null,
          discardPileCount: payload.count ?? (payload.card ? 1 : 0),
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
        gameResult: { reason: "score", forfeitedBy: null, ...payload },
      };
    case Type.SET_OPPONENT_PRESENCE:
      return {
        ...state,
        opponentPresence: payload,
      };
    case Type.NEW_ROUND:
      return {
        ...state,
        roundResult: null,
        gameState: { ...state.gameState, round: payload },
      };
    case Type.SET_ROUND_RESULT:
      return {
        ...state,
        roundResult: payload,
      };
    case Type.TABLE_CLOSED:
      return {
        ...state,
        closed: true,
      };
    case Type.UPDATE_SCORE:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          round: payload.round ?? state.gameState.round,
          winningScore: payload.winningScore ?? state.gameState.winningScore,
          player1: {
            ...state.gameState.player1,
            score: payload.player1Score,
            total: payload.player1Total,
          },
          player2: {
            ...state.gameState.player2,
            score: payload.player2Score,
            total: payload.player2Total,
          },
        },
      };
    case Type.PLAYER_DRAW_CARD:
      return {
        ...state,
        gameState: {
          ...state.gameState,
          canDraw: false,
          canDiscard: true,
          canMeld: true,
        },
      };
    default:
      return state;
  }
};
