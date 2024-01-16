"use client";
import React, { useEffect } from "react";
import client from "@/app/lib/mqtt";
import { GameContextProvider } from "./components/GameContext";
const GameLayout = ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string; };
}) => {

  return (
    <GameContextProvider gameId={params.slug}>{children}</GameContextProvider>
  );
};

export default GameLayout;
