"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import { Button } from "./ui/Button";

const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID;
/** How often an open tab asks whether a new version is live; it also asks when refocused. */
const CHECK_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_UPDATE_CHECK_SECONDS ?? 300) * 1000;

/** Offers a reload once a newer build of the site has been deployed. */
export default function UpdateNotice() {
  const pathname = usePathname();
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!CURRENT_BUILD) {
      return;
    }
    let active = true;
    const check = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      try {
        const response = await fetch("/version", { cache: "no-store" });
        const { buildId } = await response.json();
        if (active && typeof buildId === "string" && buildId !== CURRENT_BUILD) {
          setLatest(buildId);
        }
      } catch {
        // Offline or mid-deploy; try again on the next tick.
      }
    };
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!latest || latest === dismissed) {
    return null;
  }

  const onTable = pathname.startsWith("/game/");
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4" role="status">
      <div
        id="update-notice"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-surface-raised/95 p-2.5 pl-4 ring-1 ring-brass/50 shadow-glow backdrop-blur-xl animate-slide-up"
      >
        <RefreshCw className="h-4 w-4 shrink-0 text-brass" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-cream">
          A new version of Catnasta is available.
          {onTable && <span className="block text-xs text-muted">Reloading keeps your seat.</span>}
        </p>
        <Button size="sm" onClick={() => window.location.reload()} id="update-reload">
          Reload
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setDismissed(latest)}
          aria-label="Dismiss update notice"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
