import React from "react";
import DisplayPlayers from "./components/DisplayPlayers";
import DisplayGameInfo from "./components/DisplayGameInfo";
import Table from "./components/Table";

const Game = () => {
  return (
    <div className="mx-32">
      <DisplayGameInfo />
      <DisplayPlayers />
      <Table />
    </div>
  );
};

export default Game;
