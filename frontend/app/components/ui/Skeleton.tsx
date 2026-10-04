import React from "react";
import { cn } from "@/app/lib/cn";

/** Shimmering placeholder block used while content loads. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.06]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/[0.07] after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** Card-shaped skeleton matching the poker card ratio. */
export function CardSkeleton({ width = 96, className }: { width?: number; className?: string }) {
  return (
    <Skeleton
      className={cn("shrink-0 rounded-[7%/5%]", className)}
      style={{ width, height: Math.round((width * 560) / 400) }}
    />
  );
}
