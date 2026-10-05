import type { Metadata } from "next";
import axios from "axios";
import { redirect } from "next/navigation";
import { getCookies } from "next-client-cookies/server";
import { api } from "../lib/api";
import GameList from "./components/GameList";
import Chat from "../components/Chat";

export const metadata: Metadata = { title: "Lobby" };

export interface Game {
  id: string;
  players_in_game: number;
  /** Total that wins the game at this table. */
  winning_score?: number;
  /** Seconds per turn, or null when turns are untimed. */
  turn_seconds?: number | null;
}

const Lobby = async () => {
  const cookies = await getCookies();
  const token = cookies.get("token");
  if (token === undefined) {
    redirect("/login");
  }
  const games: Game[] = await axios
    .get(api + "/live_games", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => (Array.isArray(res.data) ? res.data : []))
    .catch(() => []);
  return (
    <main className="flex-1">
      <GameList games={games} />
      <Chat />
    </main>
  );
};

export default Lobby;
