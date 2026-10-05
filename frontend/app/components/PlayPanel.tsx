"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Plus } from "lucide-react";
import { useUserContext } from "./UserContext";
import { Button, ButtonLink } from "./ui/Button";
import { Input } from "./ui/Input";
import { Panel } from "./ui/Panel";
import { Skeleton } from "./ui/Skeleton";
import { createGame, joinGame } from "../lib/joinGame";

export default function PlayPanel() {
  const user = useUserContext();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"create" | "private" | "join" | null>(null);

  if (!user?.ready) {
    return (
      <Panel className="p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mx-auto my-6 h-3 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-24" />
        </div>
      </Panel>
    );
  }

  if (!user.username) {
    return (
      <Panel className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <p className="flex-1 text-cream-dim">
          Sign in to deal a new table or join a friend&apos;s game.
        </p>
        <div className="flex gap-2">
          <ButtonLink href="/register">Create account</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Log in
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  const handleCreate = async (isPrivate: boolean) => {
    setBusy(isPrivate ? "private" : "create");
    setError("");
    const result = await createGame(user.username, isPrivate);
    if ("error" in result) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push("/game/" + result.id);
  };

  const handleJoin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setBusy("join");
    setError("");
    const result = await joinGame(code, user.username);
    if ("error" in result) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push("/game/" + result.id);
  };

  return (
    <Panel className="p-6" id="play">
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => handleCreate(false)}
          loading={busy === "create"}
          disabled={busy !== null}
          id="create-game"
        >
          <Plus className="h-5 w-5" />Deal a new table
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => handleCreate(true)}
          loading={busy === "private"}
          disabled={busy !== null}
          id="create-private-game"
          title="Hidden from the lobby. Only people with the code or invite link can join."
        >
          <Lock className="h-5 w-5" />Private
        </Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-line" /> or join with a code <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={handleJoin} className="flex gap-2">
        <Input
          id="table-code"
          aria-label="Table code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. X9VRZL"
          maxLength={6}
          className="font-mono tracking-[0.25em] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          aria-invalid={error ? true : undefined}
          required
        />
        <Button type="submit" variant="secondary" loading={busy === "join"} disabled={code.trim().length === 0}>
          Join<ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
    </Panel>
  );
}
