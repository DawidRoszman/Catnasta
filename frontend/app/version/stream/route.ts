// Server-sent events carrying the build this server runs. A deploy replaces the
// server and drops the stream; tabs reconnect to the new one and receive its id.
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();
const open = new Set<ReadableStreamDefaultController<Uint8Array>>();

// Close streams on shutdown so they don't hold up a graceful stop.
let shutdownHooked = false;
let shuttingDown = false;
function hookShutdown() {
  if (shutdownHooked) {
    return;
  }
  shutdownHooked = true;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      shuttingDown = true;
      open.forEach((controller) => {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
      open.clear();
    });
  }
}

export function GET(request: Request) {
  hookShutdown();
  if (shuttingDown) {
    // A stopping server still answers requests on connections it already has;
    // turn them away so the browser reconnects to whatever replaces us.
    return new Response(null, { status: 503, headers: { Connection: "close" } });
  }
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let self: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stop = () => {
    clearInterval(heartbeat);
    if (self) {
      open.delete(self);
    }
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      self = controller;
      open.add(controller);
      const buildId = JSON.stringify({ buildId: process.env.NEXT_PUBLIC_BUILD_ID });
      controller.enqueue(encoder.encode(`retry: 3000\nevent: version\ndata: ${buildId}\n\n`));
      // Comments keep proxies from closing an idle connection.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          stop();
        }
      }, HEARTBEAT_MS);
      request.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
    cancel: stop,
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      // Drop the connection when the stream ends, so the browser's reconnect
      // opens a new one instead of reusing a socket to a server shutting down.
      Connection: "close",
      // Ask nginx-style proxies not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
