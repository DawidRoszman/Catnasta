"use client";
import client from "@/app/lib/mqtt";
import { useCookies } from "next-client-cookies";
import React, { useContext, useEffect } from "react";
import { GameContext } from "./gameContext";

const DisplayPlayers = () => {
  const cookies = useCookies();
  const gameContext = useContext(GameContext);
  useEffect(() => {
    client.subscribe(`catnasta-game-${gameContext}-${cookies.get("username")}`);
    const handleMessage = (topic: any, message: any) => {
      console.log(message);
    };
    client.on("message", handleMessage);
  }, [cookies, gameContext]);
  return (
    <div className="flex justify-between">
      <div>Player 1</div>
      <div>Player 2</div>
    </div>
  );
};

export default DisplayPlayers;
