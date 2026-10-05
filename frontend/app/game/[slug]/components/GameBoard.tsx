"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import client from "@/app/lib/socket";
import { useUserContext } from "@/app/components/UserContext";
import { useConfirm, useToast } from "@/app/components/ui/Feedback";
import { PlayingCard, pileBlocker, sortHand } from "@/app/lib/cards/draw";
import { useGameContext, useGameDispatch } from "./GameContext";
import { Type } from "./gameReducer";
import type { ClickTarget, LayoutInput } from "./three/tableLayout";
import GameHud, { Phase } from "./GameHud";
import TableSkeleton from "./TableSkeleton";

const Scene = dynamic(() => import("./three/Scene"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});

export default function GameBoard() {
  const game = useGameContext();
  const dispatch = useGameDispatch();
  const user = useUserContext();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [staged, setStaged] = useState<string[][]>([]);

  const gameState = game?.gameState;
  const username = user?.username ?? "";
  const myTurn = gameState !== undefined && gameState.turn === username;

  const phase: Phase = !gameState
    ? "loading"
    : game.closed
      ? "closed"
      : gameState.gameOver
      ? "over"
      : game.roundResult
      ? "round"
      : !gameState.player2.name || gameState.turn === null
        ? "waiting"
        : !myTurn
          ? "opponent"
          : gameState.canDraw
            ? "draw"
            : "play";

  const pileProblem = gameState
    ? pileBlocker(
        gameState.discardPileTopCard,
        gameState.discardPileCount,
        gameState.player1.hand,
        gameState.player1.melds.length > 0,
      )
    : null;

  const handById = useMemo(() => {
    const map = new Map<string, PlayingCard>();
    gameState?.player1.hand.forEach((card) => map.set(card.id, card));
    return map;
  }, [gameState?.player1.hand]);

  // Drop selections and staged melds that refer to cards no longer in hand.
  const liveSelected = useMemo(
    () => new Set([...selected].filter((id) => handById.has(id))),
    [selected, handById],
  );
  const liveStaged = useMemo(
    () => staged.filter((meld) => meld.every((id) => handById.has(id))),
    [staged, handById],
  );

  const stagedIds = useMemo(() => new Set(liveStaged.flat()), [liveStaged]);
  const hand = useMemo(
    () => sortHand((gameState?.player1.hand ?? []).filter((card) => !stagedIds.has(card.id))),
    [gameState?.player1.hand, stagedIds],
  );

  const send = useCallback(
    (type: string, extra: Record<string, unknown> = {}) => {
      client.publish(
        "catnasta/game",
        JSON.stringify({ type, id: game?.gameId, name: username, ...extra }),
      );
    },
    [game?.gameId, username],
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) {
        clearSelection();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [clearSelection]);

  if (!game || !gameState || !dispatch) {
    return null;
  }

  const notYourTurn = () => {
    toast(
      phase === "opponent"
        ? `Hold your whiskers — it's ${gameState.player2.name}'s turn.`
        : phase === "round"
          ? "The next round is being dealt."
          : "The game hasn't started yet.",
    );
  };

  const drawFromStock = () => {
    if (phase !== "draw") {
      if (phase === "play") {
        toast("You've already drawn this turn. Meld or discard a card.");
      } else {
        notYourTurn();
      }
      return;
    }
    send("DRAW_FROM_STOCK");
    dispatch({ type: Type.PLAYER_DRAW_CARD, payload: { name: username } });
  };

  const pickUpDiscardPile = () => {
    if (phase !== "draw") {
      if (phase === "play") {
        toast("You've already drawn this turn.");
      } else {
        notYourTurn();
      }
      return;
    }
    if (pileProblem !== null) {
      toast(pileProblem, { tone: "error" });
      return;
    }
    send("PICKUP_DISCARD_PILE");
    dispatch({ type: Type.PLAYER_DRAW_CARD, payload: { name: username } });
  };

  const toggleCard = (id: string) => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((cardId) => handById.has(cardId)));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const requirePlayPhase = () => {
    if (phase === "play") {
      return true;
    }
    if (phase === "draw") {
      toast("Draw a card first — from the stock or the discard pile.");
    } else {
      notYourTurn();
    }
    return false;
  };

  const stageMeld = () => {
    if (!requirePlayPhase()) {
      return;
    }
    if (liveSelected.size < 3) {
      toast("A meld needs at least three cards.");
      return;
    }
    setStaged([...liveStaged, [...liveSelected]]);
    clearSelection();
  };

  const confirmMelds = () => {
    if (!requirePlayPhase() || liveStaged.length === 0) {
      return;
    }
    send("MELD_CARDS", { melds: liveStaged });
    setStaged([]);
  };

  const addToMeld = (meldIndex: number) => {
    if (liveSelected.size === 0) {
      toast("Select cards from your hand, then tap a meld to add them.");
      return;
    }
    if (!requirePlayPhase()) {
      return;
    }
    send("ADD_TO_MELD", { meldId: meldIndex, cardsIds: [...liveSelected] });
    clearSelection();
  };

  const discard = async () => {
    if (!requirePlayPhase()) {
      return;
    }
    if (liveSelected.size !== 1) {
      toast("Select exactly one card to discard.");
      return;
    }
    if (liveStaged.length > 0) {
      const proceed = await confirm({
        title: "Discard without melding?",
        message: "Your staged melds haven't been played yet. They'll go back to your hand.",
        confirmLabel: "Discard anyway",
      });
      if (!proceed) {
        return;
      }
      setStaged([]);
    }
    send("DISCARD_CARD", { cardId: [...liveSelected][0] });
    dispatch({ type: Type.MODIFY, payload: { canDiscard: false, canMeld: false } });
    clearSelection();
  };

  const leave = async () => {
    if (phase === "over" || phase === "closed" || phase === "loading") {
      router.push("/game");
      return;
    }
    const opponent = gameState.player2.name;
    const ok = await confirm(
      phase === "waiting"
        ? {
            title: "Close this table?",
            message: opponent
              ? `${opponent} will be sent back to the lobby.`
              : "Nobody will be able to join it any more.",
            confirmLabel: "Close table",
          }
        : {
            title: "Forfeit the game?",
            message: `Leaving now ends the game and hands the win to ${opponent}.`,
            confirmLabel: "Forfeit and leave",
            cancelLabel: "Keep playing",
            danger: true,
          },
    );
    if (!ok) {
      return;
    }
    send("LEAVE_GAME");
    router.push("/game");
  };

  const handleCardClick = (target: ClickTarget) => {
    switch (target.type) {
      case "hand":
        toggleCard(target.id);
        break;
      case "meld":
        addToMeld(target.index);
        break;
      case "staged":
        setStaged(liveStaged.filter((_, index) => index !== target.index));
        break;
      case "discard":
        pickUpDiscardPile();
        break;
    }
  };

  const layout: LayoutInput = {
    hand,
    selected: liveSelected,
    staged: liveStaged.map((meld) => meld.map((id) => handById.get(id)!)),
    myMelds: gameState.player1.melds,
    opponentMelds: gameState.player2.melds,
    myRedThrees: gameState.player1.red_threes,
    opponentRedThrees: gameState.player2.red_threes,
    opponentHandCount: gameState.player2.num_of_cards_in_hand,
    discardTop: gameState.discardPileTopCard,
    discardCount: gameState.discardPileCount,
    meldsAreTargets: phase === "play" && liveSelected.size > 0,
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-felt-950">
      <div className="absolute inset-0">
        <Scene
          layout={layout}
          stockCount={Math.max(gameState.stockCardCount, 0)}
          canDraw={phase === "draw"}
          canPickUp={phase === "draw" && pileProblem === null}
          onCardClick={handleCardClick}
          onStockClick={drawFromStock}
          onDiscardClick={pickUpDiscardPile}
        />
      </div>
      <GameHud
        game={game}
        phase={phase}
        selectedCount={liveSelected.size}
        stagedCount={liveStaged.length}
        onDraw={drawFromStock}
        onPickUp={pickUpDiscardPile}
        pileProblem={pileProblem}
        onStageMeld={stageMeld}
        onConfirmMelds={confirmMelds}
        onDiscard={discard}
        onClearSelection={clearSelection}
        onLeave={leave}
      />
    </div>
  );
}
