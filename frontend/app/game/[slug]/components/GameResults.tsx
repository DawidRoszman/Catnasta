"use client";
import React from "react";
import { useGameContext } from "./GameContext";

const GameResults = () => {
  const gameContext = useGameContext();
  return (
    <div>
      <p>
        Winner: {gameContext?.gameResult.winner?.name} with{" "}
        <span className="text-primary">
          {gameContext?.gameResult.winner?.points}
        </span>{" "}
        points
      </p>
      <p>
        Loser: {gameContext?.gameResult.loser?.name} with{" "}
        <span className="text-primary">
          {gameContext?.gameResult.loser?.points}
        </span>{" "}
        points
      </p>
    </div>
  );
};

export default GameResults;
