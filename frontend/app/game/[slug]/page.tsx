"use client";
import React from "react";
import DisplayPlayers from "./components/DisplayPlayers";
import DisplayGameInfo from "./components/DisplayGameInfo";
import Table from "./components/Table";
import { useGameContext } from "./components/GameContext";
import GameResults from "./components/GameResults";

const Game = () => {
  const gameContext = useGameContext();
  return (
    <div className="mx-32">
      <DisplayGameInfo />
      <DisplayPlayers />
      {!gameContext?.gameState.gameOver && <Table />}
      {gameContext?.gameState.gameOver && <GameResults />}
    </div>
  );
};

export default Game;
