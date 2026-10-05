"use client";
import {
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { Action, Game, Type, gameReducer } from "./gameReducer";
import client from "@/app/lib/socket";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/app/components/UserContext";
import { useToast } from "@/app/components/ui/Feedback";
import { joinGame } from "@/app/lib/joinGame";

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
    roundResult: null,
    gameState: {
      round: 1,
      winningScore: 5000,
      gameOver: false,
      turn: null,
      turnDeadline: null,
      tookPile: false,
      canDraw: false,
      canDiscard: false,
      canMeld: false,
      player1: {
        name: username,
        hand: [],
        melds: [],
        red_threes: [],
        score: 0,
        total: 0,
      },
      player2: {
        name: "",
        num_of_cards_in_hand: 0,
        melds: [],
        red_threes: [],
        score: 0,
        total: 0,
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
  // Once the game is over there's nothing to catch up on, and the table is gone.
  const finished = useRef(false);
  useEffect(() => {
    finished.current = state.gameState.gameOver || state.closed;
  }, [state.gameState.gameOver, state.closed]);

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
        roundResult: null,
        closed: false,
      },
    });

    const gameTopic = `catnasta/game/${gameId}`;
    const privateTopic = `catnasta/game/${gameId}/${username}`;
    let cancelled = false;
    client.subscribe(gameTopic);
    client.subscribe(privateTopic);
    // Opening an invite link lands here without going through the lobby, so
    // claim the seat first. The server lets already-seated players straight back in,
    // and answers a join with the whole table, which is also how we catch up after
    // the connection drops.
    const sitDown = (reconnect: boolean) =>
      joinGame(gameId, username).then((result) => {
        if (cancelled) {
          return;
        }
        if ("error" in result) {
          if (reconnect) {
            toast("The game ended while you were disconnected.", { title: "Table closed" });
          } else {
            toast(result.error, { tone: "error", title: "Can't join this table" });
          }
          router.replace("/game");
          return;
        }
        client.publish(
          "catnasta/game",
          JSON.stringify({
            id: gameId,
            name: username,
            type: "PLAYER_JOINED",
          }),
        );
      });
    sitDown(false);
    const stopResync = client.onReconnect(() => {
      if (!finished.current) {
        sitDown(true);
      }
    });

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
          dispatch({ type: Type.NEW_ROUND, payload: msg.round ?? 1 });
        // falls through
        case "TURN":
          dispatch({
            type: Type.SET_CURRENT_PLAYER,
            payload: msg.current_player,
          });
          dispatch({ type: Type.SET_TURN_DEADLINE, payload: msg.turn_deadline ?? null });
          dispatch({
            type: Type.MODIFY,
            payload: { tookPile: msg.current_player === username && Boolean(msg.took_pile) },
          });
          // Rejoining mid-turn: the server remembers whether we already drew.
          if (msg.has_drawn && msg.current_player === username) {
            dispatch({ type: Type.PLAYER_DRAW_CARD, payload: { name: username } });
          }
          break;
        case "PILE_TAKEN":
          if (msg.player === username) {
            dispatch({ type: Type.MODIFY, payload: { tookPile: true } });
          }
          break;
        case "PILE_FORCED":
          toast(
            msg.player === username
              ? "Your catnasta took the litterbox pile. Discard a card to end your turn."
              : `${msg.player}'s catnasta took the litterbox pile.`,
            { title: "Litterbox taken" },
          );
          break;
        case "TURN_TIMEOUT":
          toast(
            msg.player === username
              ? "Time's up — a card was drawn for you and your lowest card discarded."
              : `${msg.player} ran out of time, so a card was played for them.`,
            { tone: msg.player === username ? "error" : undefined, title: "Turn timed out" },
          );
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
          const [me, them] = mine
            ? [msg.player1Score, msg.player2Score]
            : [msg.player2Score, msg.player1Score];
          dispatch({
            type: Type.UPDATE_SCORE,
            payload: {
              player1Score: me.score,
              // The server keeps the opponent's round score to itself.
              player2Score: them.score ?? 0,
              player1Total: me.total ?? 0,
              player2Total: them.total ?? 0,
              round: msg.round,
              winningScore: msg.winning_score,
            },
          });
          break;
        }
        case "ROUND_END":
          dispatch({
            type: Type.SET_ROUND_RESULT,
            payload: {
              round: msg.round,
              results: msg.results,
              nextRoundAt: msg.next_round_at,
            },
          });
          break;
        case "GAME_END":
          dispatch({
            type: Type.SET_GAME_RESULT,
            payload: {
              winner: msg.winner,
              loser: msg.loser,
              reason: msg.reason ?? "score",
              forfeitedBy: msg.forfeited_by ?? null,
              lastRound: msg.last_round ?? null,
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
      cancelled = true;
      stopResync();
      client.off("message", handleMessage);
      client.unsubscribe(gameTopic);
      client.unsubscribe(privateTopic);
    };
  }, [gameId, username, toast, router]);

  return (
    <GameContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameContext.Provider>
  );
}
