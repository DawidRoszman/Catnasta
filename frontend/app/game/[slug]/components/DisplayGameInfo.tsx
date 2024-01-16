"use client";
import React from "react";
import { useGameContext } from "./GameContext";

const DisplayGameInfo = () => {
  const gameContext = useGameContext();
  return (
    <div className="grid place-items-center">
      Let others join game using this code:{" "}
      <span className="bold text-primary text-xl">{gameContext?.gameId}</span>
    </div>
  );
};

export default DisplayGameInfo;
