"use client";
import React from "react";
import { useGameContext } from "./GameContext";
import client from "@/app/lib/mqtt";
import { useCookies } from "next-client-cookies";

const Table = () => {
  const gameContext = useGameContext();
  const cookies = useCookies();

  const drawFromStock = () => {
    console.log(gameContext?.gameState.turn);
    client.publish(
      `catnasta/game`,
      JSON.stringify({
        type: "DRAW_FROM_STOCK",
        id: gameContext?.gameId,
        name: gameContext?.gameState.player1.name,
      }),
    );
    gameContext!.gameState.canDraw = false;
    gameContext!.gameState.canDiscard = true;
  };

  const discardCard = (cardId: string) => {
    if (
      !gameContext?.gameState.canDiscard ||
      gameContext?.gameState.turn !== cookies.get("username")
    ) {
      alert("Not your turn");
      return;
    }
    client.publish(
      `catnasta/game`,
      JSON.stringify({
        type: "DISCARD_CARD",
        id: gameContext?.gameId,
        name: gameContext?.gameState.player1.name,
        cardId,
      }),
    );
    gameContext!.gameState.canDiscard = false;
  };
  return (
    <div>
      <div className="flex justify-between">
        <div>
          {gameContext?.gameState.player1.hand.map((card) => {
            return (
              <div key={card.id}>
                <button className="" onClick={() => discardCard(card.id)}>
                  {card.rank} {card.suit}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col align-middle justify-center">
          Discard Pile:
          <span className="text-center">
            {gameContext?.gameState.discardPileTopCard?.rank}{" "}
            {gameContext?.gameState.discardPileTopCard?.suit}
          </span>
        </div>

        <div>
          {Array.from(
            Array(gameContext?.gameState.player2.num_of_cards_in_hand),
          ).map((_, id) => {
            return <div key={id}>{id + 1}. Back of the card</div>;
          })}
        </div>
      </div>
      <div className="grid place-items-center">
        {gameContext?.gameState.turn === cookies.get("username") &&
          gameContext?.gameState.canDraw && (
            <button
              onClick={() => drawFromStock()}
              className="btn btn-primary btn-outline"
            >
              Draw from stock
            </button>
          )}
      </div>
    </div>
  );
};

export default Table;
