"use client";
import React from "react";
import { useGameContext } from "./GameContext";

const DisplayPlayers = () => {
  const gameContext = useGameContext();
  return (
    <div className="flex justify-between">
      <div>Player1: {gameContext?.gameState.player1.name}</div>
      <div>Player2: {gameContext?.gameState.player2.name}</div>
    </div>
  );
};

export default DisplayPlayers;
