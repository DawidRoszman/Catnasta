import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

// Topics clients are allowed to publish to. Everything else is server-only.
const CLIENT_TOPICS = new Set(["catnasta/chat", "catnasta/game"]);

type ClientFrame =
  | { type: "subscribe" | "unsubscribe"; topic: string }
  | { type: "publish"; topic: string; message: string };

type MessageHandler = (topic: string, message: string) => void | Promise<void>;
type SubscriptionHandler = (topic: string, subscribers: number) => void;

export interface Broker {
  publish(topic: string, message: string): void;
  onMessage(handler: MessageHandler): void;
  /** Called whenever a topic gains or loses a subscriber, with the new count. */
  onSubscriptionChange(handler: SubscriptionHandler): void;
}

export function createBroker(server: Server): Broker {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const subscriptions = new Map<string, Set<WebSocket>>();
  const handlers: MessageHandler[] = [];
  const subscriptionHandlers: SubscriptionHandler[] = [];

  const notify = (topic: string) => {
    const count = subscriptions.get(topic)?.size ?? 0;
    subscriptionHandlers.forEach((handler) => handler(topic, count));
  };

  const publish = (topic: string, message: string) => {
    const frame = JSON.stringify({ topic, message });
    subscriptions.get(topic)?.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(frame);
      }
    });
  };

  const unsubscribe = (socket: WebSocket, topic: string) => {
    const sockets = subscriptions.get(topic);
    if (!sockets?.delete(socket)) {
      return;
    }
    if (sockets.size === 0) {
      subscriptions.delete(topic);
    }
    notify(topic);
  };

  const unsubscribeAll = (socket: WebSocket) => {
    [...subscriptions.keys()].forEach((topic) => unsubscribe(socket, topic));
  };

  wss.on("connection", (socket) => {
    socket.on("message", (data) => {
      let frame: ClientFrame;
      try {
        frame = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (typeof frame.topic !== "string") {
        return;
      }
      switch (frame.type) {
        case "subscribe":
          if (!subscriptions.has(frame.topic)) {
            subscriptions.set(frame.topic, new Set());
          }
          if (!subscriptions.get(frame.topic)!.has(socket)) {
            subscriptions.get(frame.topic)!.add(socket);
            notify(frame.topic);
          }
          break;
        case "unsubscribe":
          unsubscribe(socket, frame.topic);
          break;
        case "publish":
          if (
            !CLIENT_TOPICS.has(frame.topic) ||
            typeof frame.message !== "string"
          ) {
            return;
          }
          publish(frame.topic, frame.message);
          for (const handler of handlers) {
            Promise.resolve()
              .then(() => handler(frame.topic, frame.message))
              .catch((err) => console.error("Socket handler error:", err));
          }
          break;
      }
    });
    socket.on("close", () => unsubscribeAll(socket));
  });

  return {
    publish,
    onMessage: (handler) => {
      handlers.push(handler);
    },
    onSubscriptionChange: (handler) => {
      subscriptionHandlers.push(handler);
    },
  };
}
