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
import { useCookies } from "next-client-cookies";

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
  gameState: {
    turn: null,
    canDraw: false,
    canDiscard: false,
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
  },
};

export function GameContextProvider({
  children,
  gameId,
}: {
  children: React.ReactNode;
  gameId: string;
}) {
  const cookies = useCookies();
  initalContext.gameId = gameId;
  initalContext.gameState.player1.name = cookies.get("username")!;
  const [state, dispatch] = useReducer(gameReducer, initalContext);
  useEffect(() => {
    client.on("connect", () => {
      console.log("connected");
      client.subscribe(`catnasta/game/${gameId}`);
      client.subscribe(`catnasta/game/${gameId}/${cookies.get("username")}`);
      client.publish(
        "catnasta/game",
        JSON.stringify({
          id: gameId,
          name: cookies.get("username"),
          type: "PLAYER_JOINED",
        }),
      );
    });
    const handleMessage = (topic: any, message: any) => {
      const msg = JSON.parse(message.toString());
      switch (msg.type) {
        case "PLAYER_JOINED":
          console.log("Player joined");
          dispatch({
            type: Type.SET_SECOND_PLAYER,
            payload: {
              name:
                cookies.get("username")! === msg.player1
                  ? msg.player2
                  : msg.player1,
            },
          });
          break;
        case "GAME_START":
          console.log("Game started");
          dispatch({
            type: Type.SET_CURRENT_PLAYER,
            payload: msg.current_player,
          });
          break;
        case "TURN":
          dispatch({
            type: Type.SET_CURRENT_PLAYER,
            payload: msg.current_player,
          });
          break;
        case "HAND":
          console.log("Hand received");
          console.log(msg.hand);
          dispatch({
            type: Type.EDIT_PLAYER_HAND,
            payload: msg.hand,
          });
          break;
        case "RED_THREES":
          console.log("Red threes received");
          console.log(msg.red_threes);
          if (msg.player === cookies.get("username")) {
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
          console.log("Enemy hand received");
          console.log(msg.enemy_hand);
          dispatch({
            type: Type.EDIT_SECOND_PLAYER_HAND,
            payload: msg.enemy_hand,
          });
          break;
        case "DISCARD_PILE_TOP_CARD":
          console.log("Discard pile top card received");
          console.log(msg.discard_pile_top_card);
          dispatch({
            type: Type.EDIT_DISCARD_PILE_TOP_CARD,
            payload: msg.discard_pile_top_card,
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
  }, [gameId, cookies]);
  if (cookies.get("username") === undefined) {
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
