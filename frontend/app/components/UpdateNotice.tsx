"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import { Button } from "./ui/Button";

const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID;
/** Longest wait between attempts to reopen the version stream after it fails. */
const MAX_RETRY_MS = 60_000;

/**
 * Offers a reload once a newer build of the site has been deployed. The server
 * pushes its build id over a long-lived stream; a deploy drops that stream and
 * the reconnect lands on the new build.
 */
export default function UpdateNotice() {
  const pathname = usePathname();
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!CURRENT_BUILD) {
      return;
    }
    let active = true;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let retryMs = 3000;

    const seen = (buildId: unknown) => {
      if (active && typeof buildId === "string" && buildId !== CURRENT_BUILD) {
        setLatest(buildId);
      }
    };

    const connect = () => {
      source = new EventSource("/version/stream");
      source.addEventListener("version", (event) => {
        retryMs = 3000;
        try {
          seen(JSON.parse((event as MessageEvent<string>).data).buildId);
        } catch {
          // Ignore a malformed event.
        }
      });
      source.onerror = () => {
        // The browser retries dropped connections itself, but gives up for good
        // when a retry gets an error response (e.g. a proxy's 502 mid-deploy).
        if (source?.readyState === EventSource.CLOSED && active) {
          source.close();
          retry = setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
        }
      };
    };

    // Fallback for networks that block or buffer the stream.
    const check = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      try {
        const response = await fetch("/version", { cache: "no-store" });
        seen((await response.json()).buildId);
      } catch {
        // Offline or mid-deploy; the stream will catch up.
      }
    };

    connect();
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearTimeout(retry);
      source?.close();
      document.removeEventListener("visibilitychange", check);
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
