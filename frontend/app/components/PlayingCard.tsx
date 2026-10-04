"use client";
import React, { useEffect, useState } from "react";
import { cn } from "@/app/lib/cn";
import { CardSkeleton } from "./ui/Skeleton";
import {
  CARD_H,
  CARD_W,
  PlayingCard as Card,
  cardLabel,
  ensureCardFonts,
  getCardDataUrl,
} from "@/app/lib/cards/draw";

type PlayingCardProps = {
  /** The card to show, or null for the card back. */
  card: Card | null;
  className?: string;
  /** Width in pixels; height follows the poker card ratio. */
  width?: number;
};

/** A 2D playing card image rendered from the same art as the 3D table. */
export default function PlayingCard({ card, className, width = 96 }: PlayingCardProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ensureCardFonts().then(() => {
      if (active) {
        setSrc(getCardDataUrl(card, width > 140 ? 1 : 0.6));
      }
    });
    return () => {
      active = false;
    };
  }, [card, width]);

  const height = Math.round((width * CARD_H) / CARD_W);
  if (src === null) {
    return <CardSkeleton width={width} className={className} />;
  }
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 rounded-[7%/5%] shadow-[0_10px_24px_-12px_rgb(0_0_0/0.8)]",
        className,
      )}
      style={{ width, height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
          src={src}
          alt={card ? cardLabel(card) : "Card back"}
          width={width}
          height={height}
          className="h-full w-full rounded-[7%/5%]"
        draggable={false}
      />
    </span>
  );
}
