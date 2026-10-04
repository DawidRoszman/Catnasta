import { api } from "./api";

type MessageHandler = (topic: string, message: string) => void;

const RECONNECT_DELAY = 1000;
const socketUrl = api.replace(/^http/, "ws") + "/ws";

const topics = new Set<string>();
const handlers = new Set<MessageHandler>();
const pending: string[] = [];
let socket: WebSocket | null = null;

function connect() {
  socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    topics.forEach((topic) =>
      socket!.send(JSON.stringify({ type: "subscribe", topic })),
    );
    while (pending.length > 0) {
      socket!.send(pending.shift()!);
    }
  };

  socket.onmessage = (event) => {
    const { topic, message } = JSON.parse(event.data);
    handlers.forEach((handler) => handler(topic, message));
  };

  socket.onclose = () => {
    socket = null;
    setTimeout(connect, RECONNECT_DELAY);
  };
}

function isOpen() {
  // The socket only exists in the browser; server renders never connect.
  if (typeof window === "undefined") {
    return false;
  }
  if (socket === null) {
    connect();
  }
  return socket!.readyState === WebSocket.OPEN;
}

const client = {
  subscribe(topic: string) {
    if (topics.has(topic)) {
      return;
    }
    topics.add(topic);
    // Topics are (re)subscribed on open, so only send when already connected.
    if (isOpen()) {
      socket!.send(JSON.stringify({ type: "subscribe", topic }));
    }
  },
  unsubscribe(topic: string) {
    topics.delete(topic);
    if (isOpen()) {
      socket!.send(JSON.stringify({ type: "unsubscribe", topic }));
    }
  },
  publish(topic: string, message: string) {
    const data = JSON.stringify({ type: "publish", topic, message });
    if (isOpen()) {
      socket!.send(data);
    } else if (typeof window !== "undefined") {
      pending.push(data);
    }
  },
  on(_event: "message", handler: MessageHandler) {
    handlers.add(handler);
  },
  off(_event: "message", handler: MessageHandler) {
    handlers.delete(handler);
  },
};

export default client;
