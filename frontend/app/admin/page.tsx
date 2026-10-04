"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { Gamepad2, Megaphone, MessagesSquare, Search, Trash2, Users } from "lucide-react";
import { useUserContext } from "../components/UserContext";
import { CheckIsAdmin } from "../lib/CheckIsAdmin";
import { api } from "../lib/api";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { useConfirm, useToast } from "../components/ui/Feedback";

interface User {
  _id: string;
  username: string;
}

interface Game {
  _id: string;
}

interface ChatMessage {
  _id: string;
  id: string;
  username: string;
  message: string;
}

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [chat, setChat] = useState<ChatMessage[] | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const user = useUserContext();
  const cookies = useCookies();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const token = cookies.get("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    CheckIsAdmin(token).then(setIsAdmin);
    axios(api + "/users", headers).then((r) => setUsers(Array.isArray(r.data) ? r.data : []));
    axios(api + "/games", headers).then((r) => setGames(Array.isArray(r.data) ? r.data : []));
    axios(api + "/chat").then((r) => setChat(r.data));
  }, [token, router]);

  useEffect(() => {
    if (isAdmin === false) {
      router.replace("/");
    }
  }, [isAdmin, router]);

  if (isAdmin === null || user === null || isAdmin === false) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[84px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[76px] rounded-2xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  const remove = async (kind: "user" | "game" | "message", id: string, label: string) => {
    const ok = await confirm({
      title: `Delete ${kind}?`,
      message: `${label} will be permanently removed.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) {
      return;
    }
    const url = {
      user: api + "/users/" + id,
      game: api + "/games/" + id,
      message: api + "/chat/delete/" + id,
    }[kind];
    const response = await axios.delete(url, auth);
    const msg: string = response.data.msg;
    if (!/deleted/i.test(msg)) {
      toast(msg, { tone: "error" });
      return;
    }
    toast(msg, { tone: "success" });
    if (kind === "user") setUsers((prev) => prev!.filter((u) => u._id !== id));
    if (kind === "game") setGames((prev) => prev!.filter((g) => g._id !== id));
    if (kind === "message") setChat((prev) => prev!.filter((m) => m.id !== id));
  };

  const searchMessages = async (query: string) => {
    const response = query
      ? await axios.get(api + "/chat/search?search=" + encodeURIComponent(query), auth)
      : await axios(api + "/chat");
    setChat(response.data);
  };

  const broadcast = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const response = await axios.post(api + "/send", { message }, auth);
      if (response.status === 200) {
        setMessage("");
        toast("Announcement sent to everyone online.", { tone: "success" });
      } else {
        toast(response.data.msg ?? "Something went wrong", { tone: "error" });
      }
    } catch {
      toast("Couldn't send the announcement.", { tone: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-cream-dim">Moderate players, tables and the lobby chat.</p>

      <dl className="mt-8 grid grid-cols-3 gap-4">
        {[
          { label: "Players", value: users?.length, icon: Users },
          { label: "Saved games", value: games?.length, icon: Gamepad2 },
          { label: "Chat messages", value: chat?.length, icon: MessagesSquare },
        ].map(({ label, value, icon: Icon }) => (
          <Panel key={label} className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brass/10 text-brass">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">{value ?? "–"}</dd>
            </div>
          </Panel>
        ))}
      </dl>

      <Panel className="mt-6 p-5">
        <form onSubmit={broadcast} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 font-semibold">
            <Megaphone className="h-5 w-5 text-brass" />Announcement
          </span>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell everyone online something…"
            aria-label="Announcement"
            required
          />
          <Button type="submit" loading={sending} disabled={!message.trim()}>
            Broadcast
          </Button>
        </form>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminList
          title="Players"
          items={users}
          empty="No players yet."
          render={(u) => ({ key: u._id, primary: u.username, secondary: u._id })}
          onDelete={(u) => remove("user", u._id, u.username)}
        />
        <AdminList
          title="Saved games"
          items={games}
          empty="No finished games."
          render={(g) => ({ key: g._id, primary: g._id })}
          onDelete={(g) => remove("game", g._id, `Game ${g._id}`)}
        />
        <AdminList
          title="Chat"
          items={chat}
          empty="No messages match."
          render={(m) => ({ key: m._id, primary: m.message, secondary: m.username })}
          onDelete={(m) => remove("message", m.id, "This message")}
          toolbar={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Search messages…"
                onChange={(e) => searchMessages(e.target.value)}
                className="h-9 pl-9 text-sm"
                aria-label="Search messages"
              />
            </div>
          }
        />
      </div>
    </main>
  );
};

function AdminList<T>({
  title,
  items,
  empty,
  render,
  onDelete,
  toolbar,
}: {
  title: string;
  items: T[] | null;
  empty: string;
  render: (item: T) => { key: string; primary: string; secondary?: string };
  onDelete: (item: T) => void;
  toolbar?: React.ReactNode;
}) {
  return (
    <Panel className="flex max-h-[560px] flex-col">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {toolbar}
      </div>
      {items === null ? (
        <ul className="flex-1 divide-y divide-line" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/3 rounded-md" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="p-6 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {items.map((item) => {
            const { key, primary, secondary } = render(item);
            return (
              <li key={key} className="group flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{primary}</p>
                  {secondary && <p className="truncate font-mono text-xs text-muted">{secondary}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="rounded-lg p-2 text-muted opacity-60 transition hover:bg-coral/10 hover:text-coral group-hover:opacity-100"
                  aria-label={`Delete ${primary}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default Admin;
