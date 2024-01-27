"use client";
import {
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { Action, Game, Type, gameReducer } from "./gameReducer";
import client from "@/app/lib/mqtt";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/app/components/UserContext";

export const GameContext = createContext<Game | null>(null);
export const GameDispatchContext = createContext<Dispatch<Action> | null>(null);

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
}

export function useGameDispatch() {
  const context = useContext(GameDispatchContext);
  if (context === undefined) {
    throw new Error("useGameDispatch must be used within a GameProvider");
  }
  return context;
}

const initalContext: Game = {
  gameId: "",
  gameResult: {
    winner: null,
    loser: null,
  },
  gameState: {
    gameOver: false,
    turn: null,
    canDraw: false,
    canDiscard: false,
    canMeld: false,
    player1: {
      name: "",
      hand: [],
      melds: [],
      red_threes: [],
      score: 0,
    },
    player2: {
      name: "",
      num_of_cards_in_hand: 0,
      melds: [],
      red_threes: [],
      score: 0,
    },
    discardPileTopCard: null,
    stockCardCount: -1,
  },
};

export function GameContextProvider({
  children,
  gameId,
}: {
  children: React.ReactNode;
  gameId: string;
}) {
  const router = useRouter();
  const userContext = useUserContext();
  useEffect(() => {
    if (userContext === null) {
      return;
    }
    client.subscribe(`catnasta/game/${gameId}`);
    client.subscribe(`catnasta/game/${gameId}/${userContext.username}`);
    client.publish(
      "catnasta/game",
      JSON.stringify({
        id: gameId,
        name: userContext.username,
        type: "PLAYER_JOINED",
      }),
    );
    client.on("disconnect", () => {
      client.publish(
        "catnasta/game",
        JSON.stringify({
          type: "PLAYER_LEFT",
          id: gameId,
          name: userContext.username,
        }),
      );
    });
    const handleMessage = (topic: any, message: any) => {
      const msg = JSON.parse(message.toString());
      switch (msg.type) {
        case "PLAYER_JOINED":
          dispatch({
            type: Type.SET_SECOND_PLAYER,
            payload: {
              name:
                userContext.username === msg.player1
                  ? msg.player2
                  : msg.player1,
            },
          });
          break;
        case "GAME_START":
          dispatch({
            type: Type.SET_CURRENT_PLAYER,
            payload: msg.current_player,
          });
          break;
        case "PLAYER_LEFT":
          console.log("Player left");
          break;
        case "EDIT_STOCK_CARD_COUNT":
          dispatch({
            type: Type.EDIT_STOCK_CARD_COUNT,
            payload: msg.stock_card_count,
          });
          break;
        case "TURN":
          dispatch({
            type: Type.SET_CURRENT_PLAYER,
            payload: msg.current_player,
          });
          break;
        case "HAND":
          dispatch({
            type: Type.EDIT_PLAYER_HAND,
            payload: msg.hand,
          });
          break;
        case "RED_THREES":
          if (msg.player === userContext.username) {
            dispatch({
              type: Type.EDIT_PLAYER_RED_THREES,
              payload: msg.red_threes,
            });
          } else {
            dispatch({
              type: Type.EDIT_SECOND_PLAYER_RED_THREES,
              payload: msg.red_threes,
            });
          }
          break;
        case "ENEMY_HAND":
          dispatch({
            type: Type.EDIT_SECOND_PLAYER_HAND,
            payload: msg.enemy_hand,
          });
          break;
        case "DISCARD_PILE_TOP_CARD":
          dispatch({
            type: Type.EDIT_DISCARD_PILE_TOP_CARD,
            payload: msg.discard_pile_top_card,
          });
          break;
        case "MELDED_CARDS":
          if (msg.name === userContext.username) {
            dispatch({
              type: Type.EDIT_PLAYER_MELDS,
              payload: msg.melds,
            });
          } else {
            dispatch({
              type: Type.EDIT_SECOND_PLAYER_MELDS,
              payload: msg.melds,
            });
          }
          break;
        case "MELD_ERROR":
          alert(msg.message);
          break;
        case "UPDATE_SCORE":
          if (msg.player1Score.name === userContext.username) {
            dispatch({
              type: Type.UPDATE_SCORE,
              payload: {
                player1Score: msg.player1Score.score,
                player2Score: msg.player2Score.score,
              },
            });
          } else {
            dispatch({
              type: Type.UPDATE_SCORE,
              payload: {
                player1Score: msg.player2Score.score,
                player2Score: msg.player1Score.score,
              },
            });
          }
          break;
        case "GAME_END":
          dispatch({
            type: Type.SET_GAME_RESULT,
            payload: {
              winner: msg.winner,
              loser: msg.loser,
            },
          });
          dispatch({
            type: Type.EDIT_GAME_OVER,
            payload: true,
          });

          break;
      }
    };
    client.on("message", handleMessage);

    // client.on("disconnect", () => {
    //   client.publish(
    //     `catnasta-game-${gameId}`,
    //     JSON.stringify({
    //       type: "PLAYER_LEFT",
    //     }),
    //   );
    // });
  }, [gameId, userContext]);

  initalContext.gameId = gameId;
  initalContext.gameState.player1.name = userContext?.username || "";

  const [state, dispatch] = useReducer(gameReducer, initalContext);
  if (userContext === null) {
    router.replace("/");
    return null;
  }
  if (userContext.username === undefined) {
    window.location.href = "/";
    return null;
  }
  return (
    <GameContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameContext.Provider>
  );
}
