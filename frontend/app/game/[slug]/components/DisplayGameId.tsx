"use client";
import React from "react";
import { GameContext } from "./gameContext";

const DisplayGameId = () => {
  const gameContext = React.useContext(GameContext);
  return <div>{gameContext}</div>;
};

export default DisplayGameId;
