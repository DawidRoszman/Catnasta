"use client";
import React, { use, useEffect } from "react";
import client from "@/app/lib/mqtt";
import { GameContextProvider } from "./components/GameContext";
const GameLayout = ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = use(params);

  return (
    <GameContextProvider gameId={slug}>{children}</GameContextProvider>
  );
};

export default GameLayout;
