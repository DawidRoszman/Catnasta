"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { v4 as uuidv4 } from "uuid";
import { Check, MessageCircle, Pencil, SendHorizontal, Trash2, X } from "lucide-react";
import client from "../lib/socket";
import { api } from "../lib/api";
import { cn } from "../lib/cn";
import { useUserContext } from "./UserContext";
import { useConfirm, useToast } from "./ui/Feedback";
import { Input } from "./ui/Input";

interface Message {
  id: string;
  username: string;
  message: string;
}

const Chat = () => {
  const cookies = useCookies();
  const user = useUserContext();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const openRef = useRef(false);
  const usernameRef = useRef("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    usernameRef.current = user?.username ?? "";
  }, [user?.username]);

  useEffect(() => {
    client.subscribe("catnasta/chat");

    axios
      .get(api + "/chat")
      .then((response) =>
        setMessages(
          response.data.map((message: Message) => ({
            id: message.id,
            username: message.username,
            message: message.message,
          })),
        ),
      )
      .catch(() => undefined);

    const handleMessage = (topic: string, msg: string) => {
      if (topic !== "catnasta/chat") {
        return;
      }
      const { id, username, message } = JSON.parse(msg);
      setMessages((prev) => [...prev, { id, username, message }]);
      if (!openRef.current && username !== usernameRef.current) {
        setUnread(true);
      }
    };

    client.on("message", handleMessage);
    return () => {
      client.off("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages.length]);

  const username = user?.username ?? "";
  const authHeaders = { headers: { Authorization: "Bearer " + cookies.get("token") } };

  const handleSend = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!draft.trim() || !username) {
      return;
    }
    client.publish(
      "catnasta/chat",
      JSON.stringify({ id: uuidv4(), username, message: draft.trim() }),
    );
    setDraft("");
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete message?",
      message: "This removes it for everyone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) {
      return;
    }
    const response = await axios.delete(api + "/chat/delete/" + id, authHeaders);
    if (response.data.msg !== "Message deleted") {
      toast(response.data.msg, { tone: "error" });
      return;
    }
    setMessages((prev) => prev.filter((message) => message.id !== id));
  };

  const handleSaveEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editing || !editing.text.trim()) {
      return;
    }
    const response = await axios.put(
      api + "/chat/update/" + editing.id,
      { message: editing.text.trim() },
      authHeaders,
    );
    if (response.data.msg !== "Message updated") {
      toast(response.data.msg, { tone: "error" });
      return;
    }
    setMessages((prev) =>
      prev.map((message) =>
        message.id === editing.id ? { ...message, message: editing.text.trim() } : message,
      ),
    );
    setEditing(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3">
      {open && (
        <section
          className="flex h-[min(520px,70dvh)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-surface/95 ring-1 ring-line-strong shadow-card backdrop-blur-xl animate-pop-in"
          aria-label="Lobby chat"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Lobby chat</h2>
              <p className="text-xs text-muted">{messages.length} messages</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-cream"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" id="chat-messages">
            {messages.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted">No messages yet. Say hello!</p>
            )}
            {messages.map((message) => {
              const mine = message.username === username;
              const isEditing = editing?.id === message.id;
              return (
                <div key={message.id} className={cn("group flex flex-col", mine ? "items-end" : "items-start")}>
                  <span className="mb-1 px-1 text-[11px] font-semibold text-muted">{message.username}</span>
                  {isEditing ? (
                    <form onSubmit={handleSaveEdit} className="flex w-full gap-1.5">
                      <Input
                        value={editing.text}
                        onChange={(e) => setEditing({ id: message.id, text: e.target.value })}
                        onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                        className="h-9 text-sm"
                        aria-label="Edit message"
                        autoFocus
                      />
                      <button type="submit" className="rounded-lg px-2 text-mint hover:bg-white/5" aria-label="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-lg px-2 text-muted hover:bg-white/5"
                        aria-label="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <div className={cn("flex max-w-[85%] items-center gap-1", mine && "flex-row-reverse")}>
                      <p
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm break-words",
                          mine
                            ? "rounded-br-md bg-brass text-felt-950"
                            : "rounded-bl-md bg-surface-raised text-cream ring-1 ring-line",
                        )}
                      >
                        {message.message}
                      </p>
                      {mine && (
                        <div className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => setEditing({ id: message.id, text: message.message })}
                            className="rounded-md p-1 text-muted hover:text-cream"
                            aria-label="Edit message"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(message.id)}
                            className="rounded-md p-1 text-muted hover:text-coral"
                            aria-label="Delete message"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={username ? "Write a message…" : "Log in to chat"}
              disabled={!username}
              aria-label="Message"
              className="h-10"
            />
            <button
              type="submit"
              disabled={!draft.trim() || !username}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass text-felt-950 transition-colors hover:bg-brass-strong disabled:opacity-40"
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setUnread(false);
        }}
        className="relative grid h-14 w-14 place-items-center rounded-2xl bg-surface-raised text-cream ring-1 ring-line-strong shadow-card transition-transform hover:-translate-y-0.5 hover:ring-brass/60"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        id="chat-toggle"
      >
        <MessageCircle className="h-6 w-6" />
        {unread && (
          <span className="absolute right-2.5 top-2.5 h-3 w-3 rounded-full bg-coral ring-2 ring-surface-raised" aria-label="New messages" />
        )}
      </button>
    </div>
  );
};

export default Chat;
