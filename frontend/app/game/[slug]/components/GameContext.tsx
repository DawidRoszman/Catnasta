"use client";
import {
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { Action, Game, Type, gameReducer } from "./gameReducer";
import client from "@/app/lib/socket";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/app/components/UserContext";
import { useToast } from "@/app/components/ui/Feedback";

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

function createInitialGame({ gameId, username }: { gameId: string; username: string }): Game {
  return {
    gameId,
    gameResult: {
      winner: null,
      loser: null,
      reason: "score",
      forfeitedBy: null,
    },
    opponentPresence: { online: true, forfeitAt: null },
    closed: false,
    gameState: {
      gameOver: false,
      turn: null,
      canDraw: false,
      canDiscard: false,
      canMeld: false,
      player1: {
        name: username,
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
      discardPileCount: 0,
      stockCardCount: -1,
    },
  };
}

export function GameContextProvider({
  children,
  gameId,
}: {
  children: React.ReactNode;
  gameId: string;
}) {
  const router = useRouter();
  const userContext = useUserContext();
  const toast = useToast();
  const username = userContext?.username ?? "";
  const [state, dispatch] = useReducer(gameReducer, { gameId, username }, createInitialGame);

  useEffect(() => {
    if (userContext?.ready && !userContext.username) {
      router.replace("/login");
    }
  }, [userContext, router]);

  useEffect(() => {
    if (!username) {
      return;
    }
    const fresh = createInitialGame({ gameId, username });
    dispatch({
      type: Type.SET,
      payload: {
        gameState: fresh.gameState,
        gameResult: fresh.gameResult,
        opponentPresence: fresh.opponentPresence,
        closed: false,
      },
    });

    const gameTopic = `catnasta/game/${gameId}`;
    const privateTopic = `catnasta/game/${gameId}/${username}`;
    client.subscribe(gameTopic);
    client.subscribe(privateTopic);
    client.publish(
      "catnasta/game",
      JSON.stringify({
        id: gameId,
        name: username,
        type: "PLAYER_JOINED",
      }),
    );

    const handleMessage = (topic: string, message: string) => {
      if (topic !== gameTopic && topic !== privateTopic) {
        return;
      }
      const msg = JSON.parse(message);
      switch (msg.type) {
        case "PLAYER_JOINED":
          dispatch({
            type: Type.SET_SECOND_PLAYER,
            payload: {
              name: username === msg.player1 ? msg.player2 : msg.player1,
            },
          });
          break;
        case "GAME_START":
        case "TURN":
          dispatch({
            type: Type.SET_CURRENT_PLAYER,
            payload: msg.current_player,
          });
          // Rejoining mid-turn: the server remembers whether we already drew.
          if (msg.has_drawn && msg.current_player === username) {
            dispatch({ type: Type.PLAYER_DRAW_CARD, payload: { name: username } });
          }
          break;
        case "PRESENCE":
          if (msg.player !== username) {
            dispatch({
              type: Type.SET_OPPONENT_PRESENCE,
              payload: { online: msg.online, forfeitAt: msg.forfeit_at },
            });
          }
          break;
        case "PLAYER_LEFT":
          if (msg.player !== username) {
            // They left before the game started; the seat is free again.
            dispatch({ type: Type.SET_SECOND_PLAYER, payload: { name: "" } });
            toast(`${msg.player} left the table.`);
          }
          break;
        case "TABLE_CLOSED":
          if (msg.player !== username) {
            dispatch({ type: Type.TABLE_CLOSED, payload: null });
          }
          break;
        case "EDIT_STOCK_CARD_COUNT":
          dispatch({
            type: Type.EDIT_STOCK_CARD_COUNT,
            payload: msg.stock_card_count,
          });
          break;
        case "STOCK":
          dispatch({
            type: Type.EDIT_STOCK_CARD_COUNT,
            payload: msg.stock,
          });
          break;
        case "HAND":
          dispatch({
            type: Type.EDIT_PLAYER_HAND,
            payload: msg.hand,
          });
          break;
        case "RED_THREES":
          dispatch({
            type:
              msg.player === username
                ? Type.EDIT_PLAYER_RED_THREES
                : Type.EDIT_SECOND_PLAYER_RED_THREES,
            payload: msg.red_threes,
          });
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
            payload: { card: msg.discard_pile_top_card, count: msg.discard_pile_count },
          });
          break;
        case "MELDED_CARDS":
          dispatch({
            type: msg.name === username ? Type.EDIT_PLAYER_MELDS : Type.EDIT_SECOND_PLAYER_MELDS,
            payload: msg.melds,
          });
          break;
        case "MELD_ERROR":
          toast(msg.message ?? msg.msg ?? "Those cards can't be melded.", {
            tone: "error",
            title: "Meld rejected",
          });
          break;
        case "PICKUP_ERROR":
          // The pickup was optimistic; give the draw back.
          dispatch({
            type: Type.MODIFY,
            payload: { canDraw: true, canDiscard: false, canMeld: false },
          });
          toast(msg.message, { tone: "error", title: "Can't take the pile" });
          break;
        case "UPDATE_SCORE": {
          const mine = msg.player1Score.name === username;
          dispatch({
            type: Type.UPDATE_SCORE,
            payload: {
              player1Score: mine ? msg.player1Score.score : msg.player2Score.score,
              player2Score: mine ? msg.player2Score.score : msg.player1Score.score,
            },
          });
          break;
        }
        case "GAME_END":
          dispatch({
            type: Type.SET_GAME_RESULT,
            payload: {
              winner: msg.winner,
              loser: msg.loser,
              reason: msg.reason ?? "score",
              forfeitedBy: msg.forfeited_by ?? null,
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

    return () => {
      client.off("message", handleMessage);
      client.unsubscribe(gameTopic);
      client.unsubscribe(privateTopic);
    };
  }, [gameId, username, toast]);

  return (
    <GameContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameContext.Provider>
  );
}
