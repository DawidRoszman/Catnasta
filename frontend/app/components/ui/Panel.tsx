import React from "react";
import { cn } from "@/app/lib/cn";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface/85 ring-1 ring-line shadow-card backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "brass" | "mint" | "coral";
}) {
  const tones = {
    neutral: "bg-white/5 text-cream-dim ring-line",
    brass: "bg-brass/12 text-brass ring-brass/35",
    mint: "bg-mint/12 text-mint ring-mint/35",
    coral: "bg-coral/12 text-coral ring-coral/35",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
