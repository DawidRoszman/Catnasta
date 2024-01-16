"use client";
import React from "react";
import { useGameContext } from "./GameContext";
import { useCookies } from "next-client-cookies";

const DisplayPlayers = () => {
  const gameContext = useGameContext();
  const cookies = useCookies();
  return (
    <div className="flex justify-between">
      <div>
        Player1:{" "}
        <span
          className={
            gameContext?.gameState.turn === cookies.get("username")
              ? "text-primary"
              : ""
          }
        >
          {gameContext?.gameState.player1.name}
        </span>
      </div>
      <div>
        Player2:{" "}
        <span
          className={
            gameContext?.gameState.turn !== cookies.get("username")
              ? "text-primary"
              : ""
          }
        >
          {gameContext?.gameState.player2.name}
        </span>
      </div>
    </div>
  );
};

export default DisplayPlayers;
