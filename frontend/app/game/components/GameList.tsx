"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import type { Game } from "../page";
import client from "@/app/lib/socket";
import { createGame, joinGame } from "@/app/lib/joinGame";
import { useUserContext } from "@/app/components/UserContext";
import { useToast } from "@/app/components/ui/Feedback";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Panel";
import PlayingCard from "@/app/components/PlayingCard";

const GameList = ({ games }: { games: Game[] }) => {
  const [gameList, setGameList] = useState<Game[]>(games);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const user = useUserContext();
  const toast = useToast();

  useEffect(() => {
    client.subscribe("catnasta/game_list");
    const handleMessage = (topic: string, msg: string) => {
      if (topic === "catnasta/game_list") {
        setGameList(JSON.parse(msg));
      }
    };
    client.on("message", handleMessage);
    return () => {
      client.off("message", handleMessage);
    };
  }, []);

  const username = user?.username ?? "";

  const go = async (action: () => ReturnType<typeof joinGame>, key: string) => {
    if (!username) {
      return;
    }
    setBusy(key);
    const result = await action();
    if ("error" in result) {
      toast(result.error, { tone: "error" });
      setBusy(null);
      return;
    }
    router.push("/game/" + result.id);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Open tables</h1>
          <p className="mt-2 text-cream-dim">Pick a seat, or deal a new table and invite a friend.</p>
        </div>
        <Button
          size="lg"
          onClick={() => go(() => createGame(username), "create")}
          loading={busy === "create"}
          disabled={!username}
        >
          <Plus className="h-5 w-5" />New table
        </Button>
      </div>

      {gameList.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center">
          <div className="flex -space-x-10" aria-hidden>
            <PlayingCard card={null} width={84} className="-rotate-12" />
            <PlayingCard card={null} width={84} />
            <PlayingCard card={null} width={84} className="rotate-12" />
          </div>
          <h2 className="mt-8 font-display text-2xl font-semibold">No open tables yet</h2>
          <p className="mt-2 max-w-sm text-muted">Deal the first one — your friend can join with the table code.</p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" id="game-list">
          {gameList.map((game) => {
            const full = game.players_in_game >= 2;
            return (
              <li
                key={game.id}
                className="group relative overflow-hidden rounded-2xl bg-surface/80 p-5 ring-1 ring-line transition-shadow hover:ring-line-strong"
              >
                <div className="pointer-events-none absolute -right-6 -top-4 rotate-12 opacity-60 transition-transform group-hover:rotate-6" aria-hidden>
                  <PlayingCard card={null} width={70} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Table</p>
                <p className="font-mono text-2xl font-bold tracking-[0.2em] text-brass">{game.id}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Badge tone={full ? "coral" : "mint"}>
                    <Users className="h-3.5 w-3.5" />{game.players_in_game}/2
                    {full ? " · in play" : " · seat open"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={full ? "secondary" : "primary"}
                    disabled={full || !username}
                    loading={busy === game.id}
                    onClick={() => go(() => joinGame(game.id, username), game.id)}
                  >
                    Join
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default GameList;
