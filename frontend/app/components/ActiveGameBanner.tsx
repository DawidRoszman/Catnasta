"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { Play, Spade } from "lucide-react";
import { api } from "../lib/api";
import client from "../lib/socket";
import { useUserContext } from "./UserContext";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/Feedback";

type ActiveGame = { id: string; opponent: string; started: boolean };

/** Reminds players who stepped away from a game that their seat is waiting. */
export default function ActiveGameBanner() {
  const pathname = usePathname();
  const user = useUserContext();
  const cookies = useCookies();
  const router = useRouter();
  const confirm = useConfirm();
  const [game, setGame] = useState<ActiveGame | null>(null);

  const token = cookies.get("token");
  const onTable = pathname.startsWith("/game/");

  useEffect(() => {
    if (!user?.username || !token || onTable) {
      return;
    }
    let active = true;
    // A short delay lets a just-sent LEAVE_GAME land before we ask.
    const timeout = setTimeout(() => {
      axios
        .get(api + "/active_game", { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => active && setGame(response.data.id ? response.data : null))
        .catch(() => active && setGame(null));
    }, 400);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [user?.username, token, onTable, pathname]);

  if (!game || onTable || !user?.username) {
    return null;
  }

  const forfeit = async () => {
    const ok = await confirm(
      game.started
        ? {
            title: "Forfeit the game?",
            message: `${game.opponent} wins if you leave now.`,
            confirmLabel: "Forfeit",
            danger: true,
          }
        : { title: "Close your table?", confirmLabel: "Close table" },
    );
    if (!ok) {
      return;
    }
    client.publish(
      "catnasta/game",
      JSON.stringify({ type: "LEAVE_GAME", id: game.id, name: user.username }),
    );
    setGame(null);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 sm:bottom-6">
      <div
        id="active-game"
        className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-3 rounded-2xl bg-surface-raised/95 p-3 pl-4 ring-1 ring-brass/50 shadow-glow backdrop-blur-xl animate-slide-up"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass/15 text-brass">
          <Spade className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cream">
            {game.started ? "Your game is still on" : "Your table is open"}
          </p>
          <p className="truncate text-xs text-muted">
            {game.started
              ? `Table ${game.id} against ${game.opponent} — your seat is held for a short while.`
              : `Table ${game.id} is waiting for an opponent.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={forfeit}>
            {game.started ? "Forfeit" : "Close"}
          </Button>
          <Button size="sm" onClick={() => router.push("/game/" + game.id)}>
            <Play className="h-4 w-4" />
            Return to table
          </Button>
        </div>
      </div>
    </div>
  );
}
