"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { api } from "../lib/api";
import { useUserDispatch } from "./UserContext";
import { UserActionType } from "./userReduces";
import { Button } from "./ui/Button";
import { Field, Input } from "./ui/Input";
import { Panel } from "./ui/Panel";
import { useToast } from "./ui/Feedback";
import PlayingCard from "./PlayingCard";
import { Rank, Suit } from "../game/[slug]/components/gameReducer";

type Mode = "login" | "register";

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; endpoint: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Pull up a chair, the cards are shuffled.",
    submit: "Log in",
    endpoint: "/login",
  },
  register: {
    title: "Join the table",
    subtitle: "Create an account to start playing Catnasta.",
    submit: "Create account",
    endpoint: "/register",
  },
};

const FAN = [
  { id: "fan-q", rank: Rank.QUEEN, suit: Suit.HEART },
  { id: "fan-k", rank: Rank.KING, suit: Suit.SPADE },
  { id: "fan-j", rank: "JOKER" as const, suit: "RED" as const },
];

export default function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const cookies = useCookies();
  const dispatch = useUserDispatch();
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setError("");
    setSubmitting(true);
    try {
      const response = await axios.post(api + copy.endpoint, { username, password });
      const data = response.data;
      if (data.msg !== undefined) {
        setError(data.msg);
        return;
      }
      cookies.set("token", data.token);
      dispatch?.({ type: UserActionType.SET_USERNAME, payload: username });
      toast(mode === "login" ? `Welcome back, ${username}!` : `Welcome to Catnasta, ${username}!`, {
        tone: "success",
      });
      router.push("/");
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px]">
      <div className="hidden lg:block" aria-hidden>
        <div className="relative mx-auto h-80 w-80">
          {FAN.map((card, i) => (
            <div
              key={card.id}
              className="absolute left-1/2 top-1/2 origin-bottom transition-transform"
              style={{
                transform: `translate(-50%, -50%) rotate(${(i - 1) * 14}deg) translateY(${Math.abs(i - 1) * 14}px)`,
              }}
            >
              <PlayingCard card={card} width={170} />
            </div>
          ))}
        </div>
      </div>
      <Panel className="p-8 animate-slide-up">
        <h1 className="font-display text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-1.5 text-muted">{copy.subtitle}</p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate={false}>
          <Field label="Username" htmlFor="username">
            <Input id="username" name="username" autoComplete="username" required autoFocus />
          </Field>
          <Field label="Password" htmlFor="password" error={error || undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="mt-2">
            {copy.submit}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? "New to Catnasta? " : "Already have an account? "}
          <Link
            href={mode === "login" ? "/register" : "/login"}
            className="font-semibold text-brass hover:text-brass-strong"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </Link>
        </p>
      </Panel>
    </main>
  );
}
