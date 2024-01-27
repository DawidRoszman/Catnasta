import axios from "axios";
import { redirect } from "next/navigation";
import React from "react";
import { api } from "../lib/api";
import { getCookies } from "next-client-cookies/server";
import GameList from "./components/GameList";

export interface Game {
  id: string;
  players_in_game: number;
}

const Game = async () => {
  const cookies = getCookies();
  if (cookies.get("token") === undefined) {
    redirect("/login");
  }
  const games: Game[] = await axios
    .get(api + "/live_games", {
      headers: {
        Authorization: `Bearer ${cookies.get("token")}`,
      },
    })
    .then((res) => res.data);
  return (
    <div>
      <GameList games={games} />
    </div>
  );
};

export default Game;
