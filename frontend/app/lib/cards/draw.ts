import type { Card, Joker } from "@/app/game/[slug]/components/gameReducer";

export type PlayingCard = Card | Joker;
export type SuitName = "HEART" | "DIAMOND" | "CLUB" | "SPADE";

/** Base card size in canvas units (poker ratio 2.5 x 3.5). */
export const CARD_W = 400;
export const CARD_H = 560;

const INK_RED = "#c3352b";
const INK_BLACK = "#1b2320";
const GOLD = "#d4a142";
const GOLD_DARK = "#8d6420";
const PAPER_TOP = "#fcf8ef";
const PAPER_BOTTOM = "#f0e6d2";

const SUIT_SYMBOL: Record<SuitName, string> = {
  HEART: "♥",
  DIAMOND: "♦",
  CLUB: "♣",
  SPADE: "♠",
};

const RANK_NAME: Record<string, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
};

export function isJoker(card: PlayingCard): card is Joker {
  return card.rank === "JOKER";
}

export function isRedSuit(suit: string) {
  return suit === "HEART" || suit === "DIAMOND" || suit === "RED";
}

export function cardKey(card: PlayingCard | null) {
  if (card === null) {
    return "BACK";
  }
  return `${card.rank}-${card.suit}`;
}

export function cardLabel(card: PlayingCard) {
  if (isJoker(card)) {
    return `${card.suit === "RED" ? "Red" : "Black"} Joker`;
  }
  const suit = card.suit.charAt(0) + card.suit.slice(1).toLowerCase() + "s";
  return `${RANK_NAME[card.rank] ?? card.rank} of ${suit}`;
}

export function cardShortLabel(card: PlayingCard) {
  if (isJoker(card)) {
    return "Joker";
  }
  return `${card.rank}${SUIT_SYMBOL[card.suit as SuitName]}`;
}

// ---------------------------------------------------------------------------
// Fonts: next/font exposes generated family names through CSS variables.

let displayFamily = "Georgia, serif";

function readFontFamily() {
  if (typeof document === "undefined") {
    return;
  }
  const value = getComputedStyle(document.body).getPropertyValue("--font-fraunces").trim();
  if (value) {
    displayFamily = value;
  }
}

let fontsReady: Promise<void> | null = null;

/** Resolves once the display font is loaded so canvas text renders with it. */
export function ensureCardFonts() {
  if (fontsReady === null) {
    readFontFamily();
    fontsReady = Promise.all([
      document.fonts.load(`700 64px ${displayFamily}`, "AKQJ1234567890"),
      document.fonts.load(`600 30px ${displayFamily}`, "CATNASTA JOKER"),
    ])
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

// ---------------------------------------------------------------------------
// Primitive shapes

type Ctx = CanvasRenderingContext2D;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws a suit symbol centred on (cx, cy) with the given height. */
export function drawSuit(ctx: Ctx, suit: SuitName, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (suit) {
    case "HEART":
      ctx.moveTo(0, 0.45);
      ctx.bezierCurveTo(-0.15, 0.3, -0.5, 0.1, -0.5, -0.15);
      ctx.bezierCurveTo(-0.5, -0.42, -0.18, -0.52, 0, -0.27);
      ctx.bezierCurveTo(0.18, -0.52, 0.5, -0.42, 0.5, -0.15);
      ctx.bezierCurveTo(0.5, 0.1, 0.15, 0.3, 0, 0.45);
      break;
    case "DIAMOND":
      ctx.moveTo(0, -0.5);
      ctx.quadraticCurveTo(0.12, -0.14, 0.38, 0);
      ctx.quadraticCurveTo(0.12, 0.14, 0, 0.5);
      ctx.quadraticCurveTo(-0.12, 0.14, -0.38, 0);
      ctx.quadraticCurveTo(-0.12, -0.14, 0, -0.5);
      break;
    case "SPADE":
      ctx.moveTo(0, -0.5);
      ctx.bezierCurveTo(0.16, -0.3, 0.5, -0.14, 0.5, 0.1);
      ctx.bezierCurveTo(0.5, 0.33, 0.22, 0.4, 0.05, 0.24);
      ctx.quadraticCurveTo(0.08, 0.42, 0.2, 0.5);
      ctx.lineTo(-0.2, 0.5);
      ctx.quadraticCurveTo(-0.08, 0.42, -0.05, 0.24);
      ctx.bezierCurveTo(-0.22, 0.4, -0.5, 0.33, -0.5, 0.1);
      ctx.bezierCurveTo(-0.5, -0.14, -0.16, -0.3, 0, -0.5);
      break;
    case "CLUB":
      ctx.arc(0, -0.24, 0.21, 0, Math.PI * 2);
      ctx.moveTo(-0.03, 0.06);
      ctx.arc(-0.24, 0.06, 0.21, 0, Math.PI * 2);
      ctx.moveTo(0.45, 0.06);
      ctx.arc(0.24, 0.06, 0.21, 0, Math.PI * 2);
      ctx.moveTo(0.12, 0);
      ctx.arc(0, 0, 0.12, 0, Math.PI * 2);
      ctx.moveTo(0.05, 0.1);
      ctx.quadraticCurveTo(0.08, 0.42, 0.2, 0.5);
      ctx.lineTo(-0.2, 0.5);
      ctx.quadraticCurveTo(-0.08, 0.42, -0.05, 0.1);
      break;
  }
  ctx.closePath();
  ctx.fill("nonzero");
  ctx.restore();
}

export function drawPaw(ctx: Ctx, cx: number, cy: number, size: number, color: string, angle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0.12, 0.3, 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y, r] of [
    [-0.34, -0.14, 0.12],
    [-0.13, -0.33, 0.13],
    [0.13, -0.33, 0.13],
    [0.34, -0.14, 0.12],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.2, x * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cat portraits for court cards and jokers

type CatPalette = {
  fur: string;
  furShade: string;
  innerEar: string;
  eye: string;
  whisker: string;
  markings?: "tabby" | "points" | "patch";
  markingColor?: string;
};

const CAT_BY_SUIT: Record<SuitName | "RED" | "BLACK", CatPalette> = {
  HEART: {
    fur: "#e58f4f",
    furShade: "#c86f34",
    innerEar: "#f4b7a5",
    eye: "#6fae5a",
    whisker: "#fff4e6",
    markings: "tabby",
    markingColor: "#b85f28",
  },
  DIAMOND: {
    fur: "#f1e2c6",
    furShade: "#d9c29a",
    innerEar: "#f3c1b4",
    eye: "#4f9fd8",
    whisker: "#5b4636",
    markings: "points",
    markingColor: "#5b4636",
  },
  CLUB: {
    fur: "#9aa3a8",
    furShade: "#7a8388",
    innerEar: "#e9b3ad",
    eye: "#d9a33a",
    whisker: "#f4f4f4",
    markings: "tabby",
    markingColor: "#596166",
  },
  SPADE: {
    fur: "#2d3236",
    furShade: "#1d2124",
    innerEar: "#7a5a5f",
    eye: "#e4c23c",
    whisker: "#d8d8d8",
  },
  RED: {
    fur: "#f7f3ea",
    furShade: "#ddd3c2",
    innerEar: "#f3b5aa",
    eye: "#4caf87",
    whisker: "#6b5a4a",
    markings: "patch",
    markingColor: "#e0874a",
  },
  BLACK: {
    fur: "#f7f3ea",
    furShade: "#ddd3c2",
    innerEar: "#f3b5aa",
    eye: "#c9a13a",
    whisker: "#6b5a4a",
    markings: "patch",
    markingColor: "#2d3236",
  },
};

type Headwear = "crown" | "tiara" | "beret" | "jester";

function drawCat(ctx: Ctx, cx: number, cy: number, s: number, palette: CatPalette, hat: Headwear, accent: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Ears
  for (const side of [-1, 1]) {
    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.moveTo(side * 0.44 * s, -0.12 * s);
    ctx.quadraticCurveTo(side * 0.44 * s, -0.5 * s, side * 0.36 * s, -0.64 * s);
    ctx.quadraticCurveTo(side * 0.2 * s, -0.5 * s, side * 0.08 * s, -0.37 * s);
    ctx.closePath();
    ctx.fill();
    if (palette.markings === "points") {
      ctx.fillStyle = palette.markingColor!;
      ctx.beginPath();
      ctx.moveTo(side * 0.42 * s, -0.42 * s);
      ctx.quadraticCurveTo(side * 0.42 * s, -0.52 * s, side * 0.36 * s, -0.64 * s);
      ctx.quadraticCurveTo(side * 0.28 * s, -0.56 * s, side * 0.22 * s, -0.5 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = palette.innerEar;
    ctx.beginPath();
    ctx.moveTo(side * 0.37 * s, -0.2 * s);
    ctx.quadraticCurveTo(side * 0.38 * s, -0.44 * s, side * 0.34 * s, -0.53 * s);
    ctx.quadraticCurveTo(side * 0.24 * s, -0.44 * s, side * 0.15 * s, -0.35 * s);
    ctx.closePath();
    ctx.fill();
  }

  // Head with soft cheek fluff
  const headGradient = ctx.createRadialGradient(0, -0.1 * s, 0.05 * s, 0, 0, 0.55 * s);
  headGradient.addColorStop(0, palette.fur);
  headGradient.addColorStop(1, palette.furShade);
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.moveTo(0, -0.42 * s);
  ctx.bezierCurveTo(0.34 * s, -0.42 * s, 0.5 * s, -0.24 * s, 0.5 * s, 0.02 * s);
  ctx.lineTo(0.58 * s, 0.1 * s);
  ctx.lineTo(0.48 * s, 0.14 * s);
  ctx.lineTo(0.54 * s, 0.22 * s);
  ctx.lineTo(0.42 * s, 0.24 * s);
  ctx.bezierCurveTo(0.32 * s, 0.38 * s, 0.16 * s, 0.42 * s, 0, 0.42 * s);
  ctx.bezierCurveTo(-0.16 * s, 0.42 * s, -0.32 * s, 0.38 * s, -0.42 * s, 0.24 * s);
  ctx.lineTo(-0.54 * s, 0.22 * s);
  ctx.lineTo(-0.48 * s, 0.14 * s);
  ctx.lineTo(-0.58 * s, 0.1 * s);
  ctx.lineTo(-0.5 * s, 0.02 * s);
  ctx.bezierCurveTo(-0.5 * s, -0.24 * s, -0.34 * s, -0.42 * s, 0, -0.42 * s);
  ctx.fill();

  // Markings
  if (palette.markings === "tabby") {
    ctx.strokeStyle = palette.markingColor!;
    ctx.lineWidth = 0.035 * s;
    for (const x of [-0.1, 0, 0.1]) {
      ctx.beginPath();
      ctx.moveTo(x * s, -0.4 * s);
      ctx.lineTo(x * 0.7 * s, -0.24 * s);
      ctx.stroke();
    }
    for (const side of [-1, 1]) {
      for (const y of [0.0, 0.1]) {
        ctx.beginPath();
        ctx.moveTo(side * 0.5 * s, y * s);
        ctx.lineTo(side * 0.36 * s, (y + 0.03) * s);
        ctx.stroke();
      }
    }
  } else if (palette.markings === "points") {
    ctx.fillStyle = palette.markingColor! + "cc";
    ctx.beginPath();
    ctx.ellipse(0, 0.16 * s, 0.24 * s, 0.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (palette.markings === "patch") {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = palette.markingColor!;
    ctx.beginPath();
    ctx.ellipse(-0.3 * s, -0.22 * s, 0.26 * s, 0.22 * s, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Muzzle
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-0.09 * s, 0.17 * s, 0.11 * s, 0.085 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(0.09 * s, 0.17 * s, 0.11 * s, 0.085 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks
  ctx.fillStyle = "rgba(240,120,110,0.28)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 0.3 * s, 0.13 * s, 0.07 * s, 0.045 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes
  for (const side of [-1, 1]) {
    const ex = side * 0.19 * s;
    const ey = -0.04 * s;
    ctx.fillStyle = palette.eye;
    ctx.beginPath();
    ctx.moveTo(ex - 0.1 * s, ey);
    ctx.quadraticCurveTo(ex, ey - 0.11 * s, ex + 0.1 * s, ey);
    ctx.quadraticCurveTo(ex, ey + 0.11 * s, ex - 0.1 * s, ey);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,20,20,0.75)";
    ctx.lineWidth = 0.014 * s;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.022 * s, 0.065 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex + 0.025 * s, ey - 0.03 * s, 0.016 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose and mouth
  ctx.fillStyle = "#e98a8f";
  ctx.beginPath();
  ctx.moveTo(-0.045 * s, 0.09 * s);
  ctx.lineTo(0.045 * s, 0.09 * s);
  ctx.lineTo(0, 0.135 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(40,30,30,0.8)";
  ctx.lineWidth = 0.016 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0.135 * s);
  ctx.lineTo(0, 0.17 * s);
  ctx.quadraticCurveTo(-0.05 * s, 0.22 * s, -0.09 * s, 0.18 * s);
  ctx.moveTo(0, 0.17 * s);
  ctx.quadraticCurveTo(0.05 * s, 0.22 * s, 0.09 * s, 0.18 * s);
  ctx.stroke();

  // Whiskers
  ctx.strokeStyle = palette.whisker;
  ctx.lineWidth = 0.009 * s;
  for (const side of [-1, 1]) {
    for (const [y, dy] of [
      [0.14, -0.05],
      [0.18, 0],
      [0.22, 0.05],
    ]) {
      ctx.beginPath();
      ctx.moveTo(side * 0.18 * s, y * s);
      ctx.quadraticCurveTo(side * 0.4 * s, (y + dy * 0.4) * s, side * 0.62 * s, (y + dy) * s);
      ctx.stroke();
    }
  }

  // Headwear
  ctx.lineWidth = 0.016 * s;
  ctx.strokeStyle = GOLD_DARK;
  if (hat === "crown") {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(-0.27 * s, -0.36 * s);
    ctx.lineTo(-0.3 * s, -0.66 * s);
    ctx.lineTo(-0.15 * s, -0.5 * s);
    ctx.lineTo(0, -0.74 * s);
    ctx.lineTo(0.15 * s, -0.5 * s);
    ctx.lineTo(0.3 * s, -0.66 * s);
    ctx.lineTo(0.27 * s, -0.36 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const [x, y] of [
      [-0.3, -0.66],
      [0, -0.74],
      [0.3, -0.66],
    ]) {
      ctx.fillStyle = "#fbe7a8";
      ctx.beginPath();
      ctx.arc(x * s, y * s, 0.035 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(0, -0.43 * s, 0.05 * s, 0.04 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === "tiara") {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(-0.24 * s, -0.36 * s);
    ctx.quadraticCurveTo(-0.12 * s, -0.5 * s, 0, -0.62 * s);
    ctx.quadraticCurveTo(0.12 * s, -0.5 * s, 0.24 * s, -0.36 * s);
    ctx.quadraticCurveTo(0, -0.44 * s, -0.24 * s, -0.36 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fffaf0";
    for (const [x, y] of [
      [-0.16, -0.43],
      [-0.08, -0.5],
      [0.08, -0.5],
      [0.16, -0.43],
    ]) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, 0.022 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(0, -0.53 * s, 0.035 * s, 0.05 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === "beret") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(-0.06 * s, -0.42 * s, 0.34 * s, 0.13 * s, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.022 * s;
    ctx.beginPath();
    ctx.moveTo(0.16 * s, -0.46 * s);
    ctx.bezierCurveTo(0.3 * s, -0.62 * s, 0.42 * s, -0.66 * s, 0.5 * s, -0.78 * s);
    ctx.stroke();
    ctx.lineWidth = 0.01 * s;
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const x = (0.2 + t * 0.28) * s;
      const y = (-0.5 - t * 0.27) * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 0.06 * s, y - 0.02 * s);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.03 * s, y + 0.05 * s);
      ctx.stroke();
    }
  } else if (hat === "jester") {
    const colors = [accent, "#2e6b5a", accent];
    const tips: [number, number][] = [
      [-0.58, -0.5],
      [0, -0.86],
      [0.58, -0.5],
    ];
    tips.forEach(([tx, ty], i) => {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo((-0.3 + i * 0.2) * s, -0.36 * s);
      ctx.quadraticCurveTo((tx * 0.6) * s, (ty * 0.4 - 0.3) * s, tx * s, ty * s);
      ctx.quadraticCurveTo((tx * 0.3) * s, (ty * 0.5) * s, (-0.1 + i * 0.2) * s, -0.4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(tx * s, ty * s, 0.05 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = GOLD_DARK;
      ctx.stroke();
    });
    ctx.fillStyle = GOLD;
    roundRect(ctx, -0.32 * s, -0.42 * s, 0.64 * s, 0.08 * s, 0.04 * s);
    ctx.fill();
  }

  // Collar with a pendant
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-0.34 * s, 0.34 * s);
  ctx.quadraticCurveTo(0, 0.5 * s, 0.34 * s, 0.34 * s);
  ctx.lineTo(0.32 * s, 0.42 * s);
  ctx.quadraticCurveTo(0, 0.58 * s, -0.32 * s, 0.42 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(0, 0.55 * s, 0.07 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 0.012 * s;
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Card faces

const COL = { L: 128, M: 200, R: 272 };

const PIP_LAYOUT: Record<string, [number, number][]> = {
  "2": [[COL.M, 0], [COL.M, 1]],
  "3": [[COL.M, 0], [COL.M, 0.5], [COL.M, 1]],
  "4": [[COL.L, 0], [COL.R, 0], [COL.L, 1], [COL.R, 1]],
  "5": [[COL.L, 0], [COL.R, 0], [COL.M, 0.5], [COL.L, 1], [COL.R, 1]],
  "6": [[COL.L, 0], [COL.R, 0], [COL.L, 0.5], [COL.R, 0.5], [COL.L, 1], [COL.R, 1]],
  "7": [[COL.L, 0], [COL.R, 0], [COL.M, 0.25], [COL.L, 0.5], [COL.R, 0.5], [COL.L, 1], [COL.R, 1]],
  "8": [
    [COL.L, 0], [COL.R, 0], [COL.M, 0.25], [COL.L, 0.5],
    [COL.R, 0.5], [COL.M, 0.75], [COL.L, 1], [COL.R, 1],
  ],
  "9": [
    [COL.L, 0], [COL.R, 0], [COL.L, 1 / 3], [COL.R, 1 / 3], [COL.M, 0.5],
    [COL.L, 2 / 3], [COL.R, 2 / 3], [COL.L, 1], [COL.R, 1],
  ],
  "10": [
    [COL.L, 0], [COL.R, 0], [COL.M, 1 / 6], [COL.L, 1 / 3], [COL.R, 1 / 3],
    [COL.L, 2 / 3], [COL.R, 2 / 3], [COL.M, 5 / 6], [COL.L, 1], [COL.R, 1],
  ],
};

function paper(ctx: Ctx) {
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 26);
  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_H);
  gradient.addColorStop(0, PAPER_TOP);
  gradient.addColorStop(1, PAPER_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Subtle linen texture
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#8a7a5a";
  ctx.lineWidth = 1;
  for (let i = -CARD_H; i < CARD_W; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + CARD_H, CARD_H);
    ctx.stroke();
  }
  ctx.restore();
  roundRect(ctx, 1.5, 1.5, CARD_W - 3, CARD_H - 3, 25);
  ctx.strokeStyle = "#cdbf9f";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function cornerIndex(ctx: Ctx, rank: string, suit: SuitName, color: string) {
  for (const flip of [false, true]) {
    ctx.save();
    if (flip) {
      ctx.translate(CARD_W, CARD_H);
      ctx.rotate(Math.PI);
    }
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `700 ${rank === "10" ? 50 : 60}px ${displayFamily}`;
    if (rank === "10") {
      ctx.letterSpacing = "-4px";
    }
    ctx.fillText(rank, 46, 76);
    ctx.letterSpacing = "0px";
    drawSuit(ctx, suit, 46, 108, 40, color);
    ctx.restore();
  }
}

function jokerIndex(ctx: Ctx, color: string) {
  for (const flip of [false, true]) {
    ctx.save();
    if (flip) {
      ctx.translate(CARD_W, CARD_H);
      ctx.rotate(Math.PI);
    }
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.font = `700 34px ${displayFamily}`;
    "JOKER".split("").forEach((letter, i) => ctx.fillText(letter, 40, 58 + i * 34));
    ctx.restore();
  }
}

function courtFrame(ctx: Ctx, color: string, tint: string) {
  const x = 86;
  const y = 64;
  const w = CARD_W - 2 * x;
  const h = CARD_H - 2 * y;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Fine diagonal hatch, like engraved court cards
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 12) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i - h, y + h);
    ctx.stroke();
  }
  ctx.restore();
  roundRect(ctx, x, y, w, h, 16);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 10);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawFace(ctx: Ctx, card: PlayingCard) {
  paper(ctx);

  if (isJoker(card)) {
    const color = card.suit === "RED" ? INK_RED : INK_BLACK;
    jokerIndex(ctx, color);
    courtFrame(ctx, color, card.suit === "RED" ? "#f8e1d9" : "#e2e6e3");
    drawCat(ctx, 200, 296, 190, CAT_BY_SUIT[card.suit], "jester", color);
    for (const [x, y, a] of [
      [128, 132, -0.4],
      [272, 460, 0.4],
    ]) {
      drawPaw(ctx, x, y, 34, color + "55", a);
    }
    return;
  }

  const suit = card.suit as SuitName;
  const color = isRedSuit(suit) ? INK_RED : INK_BLACK;
  cornerIndex(ctx, card.rank, suit, color);

  if (card.rank === "A") {
    drawSuit(ctx, suit, 200, 292, 190, color);
    // Little cat ears perched on the ace
    for (const side of [-1, 1]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(200 + side * 34, 214);
      ctx.lineTo(200 + side * 66, 168);
      ctx.lineTo(200 + side * 76, 226);
      ctx.closePath();
      ctx.fill();
    }
    drawPaw(ctx, 200, 470, 30, color + "66");
    return;
  }

  if (card.rank === "K" || card.rank === "Q" || card.rank === "J") {
    const hat: Headwear = card.rank === "K" ? "crown" : card.rank === "Q" ? "tiara" : "beret";
    courtFrame(ctx, color, isRedSuit(suit) ? "#f8e1d9" : "#e2e6e3");
    drawCat(ctx, 200, 300, 200, CAT_BY_SUIT[suit], hat, color);
    drawSuit(ctx, suit, 122, 104, 30, color);
    drawSuit(ctx, suit, 278, 456, 30, color);
    return;
  }

  const layout = PIP_LAYOUT[card.rank] ?? [];
  for (const [x, f] of layout) {
    const y = 112 + f * 336;
    ctx.save();
    ctx.translate(x, y);
    if (f > 0.5) {
      ctx.rotate(Math.PI);
    }
    drawSuit(ctx, suit, 0, 0, 72, color);
    ctx.restore();
  }
}

function drawBack(ctx: Ctx) {
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 26);
  const gradient = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  gradient.addColorStop(0, "#17503f");
  gradient.addColorStop(1, "#0b2c24");
  ctx.fillStyle = gradient;
  ctx.fill();

  roundRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 16);
  ctx.save();
  ctx.clip();
  let row = 0;
  for (let y = 40; y < CARD_H; y += 56, row++) {
    for (let x = row % 2 ? 30 : 58; x < CARD_W; x += 56) {
      drawPaw(ctx, x, y, 22, "rgba(227,169,75,0.16)", (x + y) % 3 === 0 ? -0.3 : 0.3);
    }
  }
  ctx.restore();

  roundRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 16);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRect(ctx, 32, 32, CARD_W - 64, CARD_H - 64, 10);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Medallion with a sitting cat silhouette
  ctx.beginPath();
  ctx.arc(200, 262, 92, 0, Math.PI * 2);
  ctx.fillStyle = "#0c3128";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(200, 262, 80, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.ellipse(200, 300, 42, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(200, 238, 28, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(200 + side * 26, 230);
    ctx.lineTo(200 + side * 24, 196);
    ctx.lineTo(200 + side * 6, 214);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.strokeStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(236, 326);
  ctx.bezierCurveTo(290, 330, 286, 270, 262, 262);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.textAlign = "center";
  ctx.font = `600 30px ${displayFamily}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("CATNASTA", 204, 424);
  ctx.letterSpacing = "0px";
}

// ---------------------------------------------------------------------------
// Cached canvases

const cache = new Map<string, HTMLCanvasElement>();

/** Returns a cached canvas with the card face (or the back when card is null). */
export function getCardCanvas(card: PlayingCard | null, scale = 1) {
  const key = `${cardKey(card)}@${scale}`;
  let canvas = cache.get(key);
  if (canvas === undefined) {
    canvas = document.createElement("canvas");
    canvas.width = Math.round(CARD_W * scale);
    canvas.height = Math.round(CARD_H * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    if (card === null) {
      drawBack(ctx);
    } else {
      drawFace(ctx, card);
    }
    cache.set(key, canvas);
  }
  return canvas;
}

const urlCache = new Map<string, string>();

export function getCardDataUrl(card: PlayingCard | null, scale = 0.75) {
  const key = `${cardKey(card)}@${scale}`;
  let url = urlCache.get(key);
  if (url === undefined) {
    url = getCardCanvas(card, scale).toDataURL("image/png");
    urlCache.set(key, url);
  }
  return url;
}

// ---------------------------------------------------------------------------
// Rules helpers

const RANK_ORDER = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2", "JOKER"];
const SUIT_ORDER = ["SPADE", "HEART", "CLUB", "DIAMOND", "BLACK", "RED"];

export function isWild(card: PlayingCard) {
  return card.rank === "2" || isJoker(card);
}

export function isBlackThree(card: PlayingCard) {
  return card.rank === "3" && (card.suit === "CLUB" || card.suit === "SPADE");
}

/** First-meld thresholds by banked total, mirroring the server. */
export const FIRST_MELD_MINIMUMS: { label: string; points: number }[] = [
  { label: "Below 1,500", points: 30 },
  { label: "1,500 – 2,995", points: 90 },
  { label: "3,000 or more", points: 120 },
];

/** Points your first melds of a round must reach, given your banked total. */
export function minimumFirstMeld(total: number) {
  if (total < 1500) return 30;
  if (total < 3000) return 90;
  return 120;
}

/**
 * Why the discard pile can't be taken right now, or null when it can,
 * mirroring the server: the top card is melded at once with two naturals
 * from the hand, so the pile needs those naturals and a card left to discard.
 */
export function pileBlocker(
  top: PlayingCard | null,
  pileCount: number,
  hand: PlayingCard[],
  hasMelded: boolean,
): string | null {
  if (top === null) {
    return "The discard pile is empty.";
  }
  if (isBlackThree(top) || isWild(top)) {
    return "A black three or wild card on top blocks the discard pile.";
  }
  if (!hasMelded) {
    return "Meld needed to take litterbox pile.";
  }
  const pairs = hand.filter((card) => card.rank === top.rank).length;
  if (pairs < 2) {
    return `You need two natural ${top.rank === "A" ? "aces" : `${top.rank}s`} in hand to take the pile.`;
  }
  if (hand.length - 2 + pileCount - 1 === 0) {
    return "You'd have no card left to discard after melding the top card.";
  }
  return null;
}

/** Sorts a hand by rank (aces high) then suit, with wild cards at the end. */
export function sortHand(cards: PlayingCard[]) {
  return [...cards].sort(
    (a, b) =>
      RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank) ||
      SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit),
  );
}
