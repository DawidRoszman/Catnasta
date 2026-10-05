"use client";
import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { cn } from "../lib/cn";
import type { TableOptions } from "../lib/joinGame";

const WINNING_SCORES = [1000, 2500, 5000, 10000];
const ROUND_BREAKS = [5, 10, 20, 30];
export const DEFAULT_TABLE_OPTIONS = { private: false, winningScore: 5000, roundBreakSeconds: 10 };

function Choice<T extends number>({
  label,
  hint,
  id,
  options,
  value,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  id: string;
  options: T[];
  value: T;
  format: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-semibold text-cream-dim">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="mt-2 grid grid-cols-4 gap-2" id={id}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            onClick={() => onChange(option)}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold tabular-nums ring-1 ring-inset transition-colors",
              option === value
                ? "bg-brass text-felt-950 ring-brass"
                : "bg-felt-950/60 text-cream-dim ring-line hover:ring-line-strong",
            )}
          >
            {format(option)}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">{hint}</p>
    </div>
  );
}

/** Lets the host pick privacy, target score and round break before dealing a table. */
export function TableOptionsDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  /** Resolves with an error message to show, or nothing once the table is dealt. */
  onCreate: (options: Required<TableOptions>) => Promise<string | void>;
}) {
  const [options, setOptions] = useState(DEFAULT_TABLE_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof options>(key: K, value: (typeof options)[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError("");
    const result = await onCreate(options);
    if (result) {
      setError(result);
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Table options"
      description="Set up the table before the cards are dealt."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} id="deal-custom-table" data-autofocus>
            Deal table
          </Button>
        </>
      }
    >
      <div className="space-y-5" id="table-options">
        <Choice
          id="winning-score"
          label="Points to win"
          hint="Rounds are dealt until someone's total reaches this."
          options={WINNING_SCORES}
          value={options.winningScore}
          format={(points) => points.toLocaleString()}
          onChange={(points) => set("winningScore", points)}
        />
        <Choice
          id="round-break"
          label="Break between rounds"
          hint="How long the round summary shows before the next deal."
          options={ROUND_BREAKS}
          value={options.roundBreakSeconds}
          format={(seconds) => `${seconds}s`}
          onChange={(seconds) => set("roundBreakSeconds", seconds)}
        />
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-felt-950/60 p-3.5 ring-1 ring-inset ring-line hover:ring-line-strong">
          <input
            type="checkbox"
            id="private-table"
            checked={options.private}
            onChange={(e) => set("private", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brass"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-cream">
              <Lock className="h-3.5 w-3.5" />
              Private table
            </span>
            <span className="text-xs text-muted">
              Hidden from the lobby. Only people with the code or invite link can join.
            </span>
          </span>
        </label>
        {error && (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
