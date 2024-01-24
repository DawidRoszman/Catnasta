"use client";
import React from "react";
import { useGameContext } from "./GameContext";
import { useUserContext } from "@/app/components/UserContext";

const DisplayPlayers = () => {
  const gameContext = useGameContext();
  const userContext = useUserContext();
  if (gameContext === null || userContext === null) {
    return <div>Loading...</div>;
  }
  return (
    <div className="flex justify-between">
      <div>
        Player1:{" "}
        <span
          className={
            gameContext?.gameState.turn === userContext.username
              ? "text-primary"
              : ""
          }
        >
          {gameContext?.gameState.player1.name}
        </span>
        <span> Score: {gameContext?.gameState.player1.score}</span>
      </div>
      <div>
        Player2:{" "}
        <span
          className={
            gameContext?.gameState.turn !== userContext.username
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
