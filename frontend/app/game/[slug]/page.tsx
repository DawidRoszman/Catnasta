import React from "react";
import DisplayPlayers from "./components/DisplayPlayers";
import DisplayGameId from "./components/DisplayGameId";

const Game = () => {
  return (
    <div className="mx-32">
      <DisplayPlayers />
      <DisplayGameId />
    </div>
  );
};

export default Game;
