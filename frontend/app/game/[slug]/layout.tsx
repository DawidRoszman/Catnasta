"use client";
import React from "react";
import { GameContext } from "./components/gameContext";
const GameLayout = ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) => {
  return (
    <GameContext.Provider value={params.slug}>{children}</GameContext.Provider>
  );
};

export default GameLayout;
