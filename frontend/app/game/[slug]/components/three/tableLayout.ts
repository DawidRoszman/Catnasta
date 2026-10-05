import * as THREE from "three";
import { catnastaTopCard, type PlayingCard } from "@/app/lib/cards/draw";

/** World size of a card (poker ratio). */
export const CARD_WIDTH = 0.7;
export const CARD_HEIGHT = 0.98;
export const CARD_GAP = 0.0035;

/** Felt surface size; the wooden rim sits around it. */
export const TABLE_WIDTH = 11.2;
export const TABLE_DEPTH = 7.4;

/** The floor the cat bed stands on, just below the play surface at y = 0. */
export const FLOOR_Y = -0.28;

export const STOCK_POSITION = new THREE.Vector3(3.15, 0, -0.15);
export const DISCARD_POSITION = new THREE.Vector3(4.35, 0, -0.15);
/** The discard pile sits in a litter box; its cards rest on the litter this high above the felt. */
export const LITTER_LEVEL = 0.045;

const MELD_AREA_LEFT = -3.9;
const MELD_AREA_RIGHT = 2.25;
const MELD_SPACING = 0.86;
const MELD_STEP = 0.16;
const MY_MELD_TOP = 0.75;
const OPPONENT_MELD_TOP = -2.05;
const RED_THREE_X = -4.85;

const HAND_ORIGIN = new THREE.Vector3(0, 1.7, 3.95);
const HAND_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.92, 0, 0));
const OPPONENT_HAND_Z = -3.0;
/** How much the fanned hand dips and tilts per unit of distance from its middle. */
const HAND_ARC = 0.027;
const HAND_ROLL = 0.056;
/** The opponent's fan bows towards the table centre and turns its ends outwards. */
const OPPONENT_ARC = 0.035;
const OPPONENT_FAN = 0.1;
const OPPONENT_CARD_GAP = 0.005;

const FLAT_FACE_UP = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const FLAT_FACE_DOWN = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

export type ClickTarget =
  | { type: "hand"; id: string }
  | { type: "meld"; index: number }
  | { type: "staged"; index: number }
  | { type: "discard" };

export type Glow = "selected" | "staged" | "catnasta" | "target";

export type CardPlacement = {
  key: string;
  /** Null renders the card back only (opponent's hidden cards). */
  card: PlayingCard | null;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  target?: ClickTarget;
  glow?: Glow;
  /** Hand cards lift towards the camera on hover. */
  hoverLift?: boolean;
};

export type LayoutInput = {
  hand: PlayingCard[];
  selected: ReadonlySet<string>;
  staged: PlayingCard[][];
  myMelds: PlayingCard[][];
  opponentMelds: PlayingCard[][];
  myRedThrees: PlayingCard[];
  opponentRedThrees: PlayingCard[];
  opponentHandCount: number;
  discardTop: PlayingCard | null;
  discardCount: number;
  /** Highlight own melds as drop targets when cards are selected. */
  meldsAreTargets: boolean;
};

/** Deterministic small jitter so piles look hand-placed but don't twitch between renders. */
function jitter(seed: string, amount: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (((hash % 1000) + 1000) % 1000 / 1000 - 0.5) * amount;
}

function flatQuaternion(faceUp: boolean, yaw = 0) {
  const base = faceUp ? FLAT_FACE_UP : FLAT_FACE_DOWN;
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(base);
}

/** A meld of this many cards is a catnasta, squared up into a sideways stack. */
const CATNASTA_SIZE = 7;
/** A sideways stack is a card's height wide, so its column needs more room. */
const CATNASTA_SPACING = CARD_HEIGHT + 0.14;
const SIDEWAYS = Math.PI / 2;

/** Centre x of each meld column, making room for catnastas and squeezing up when the row is full. */
function meldColumns(melds: PlayingCard[][]) {
  const widths = melds.map((meld) => (meld.length >= CATNASTA_SIZE ? CATNASTA_SPACING : MELD_SPACING));
  const gaps = widths.slice(1).map((width, i) => (widths[i] + width) / 2);
  const start = MELD_AREA_LEFT + ((widths[0] ?? MELD_SPACING) - MELD_SPACING) / 2;
  const span = gaps.reduce((sum, gap) => sum + gap, 0);
  const squeeze = Math.min(1, (MELD_AREA_RIGHT - start) / Math.max(span, 0.001));
  let x = start;
  return widths.map((_, i) => {
    if (i > 0) {
      x += gaps[i - 1] * squeeze;
    }
    return x;
  });
}

/** A finished catnasta: the cards squared up and turned sideways, its colour card on top. */
function layCatnasta(
  placements: CardPlacement[],
  cards: PlayingCard[],
  x: number,
  top: number,
  extra: Partial<CardPlacement>,
) {
  const shown = catnastaTopCard(cards);
  const stack = [...cards.filter((card) => card !== shown), shown];
  stack.forEach((card, k) => {
    placements.push({
      key: card.id,
      card,
      position: new THREE.Vector3(x, 0.004 + k * CARD_GAP, top + CARD_WIDTH / 2 + 0.04),
      // Cards underneath sit a touch askew, so the stack shows its edges.
      quaternion: flatQuaternion(true, SIDEWAYS + (card === shown ? 0 : jitter(card.id, 0.07))),
      glow: "catnasta",
      ...extra,
    });
  });
}

function layMeld(
  placements: CardPlacement[],
  cards: PlayingCard[],
  x: number,
  top: number,
  extra: Partial<CardPlacement>,
  lift = 0,
) {
  const isCatnasta = cards.length >= CATNASTA_SIZE;
  if (isCatnasta && lift === 0) {
    layCatnasta(placements, cards, x, top, extra);
    return;
  }
  cards.forEach((card, k) => {
    placements.push({
      key: card.id,
      card,
      position: new THREE.Vector3(
        x,
        0.004 + lift + k * CARD_GAP,
        top + CARD_HEIGHT / 2 + k * MELD_STEP,
      ),
      quaternion: flatQuaternion(true, jitter(card.id, 0.03)),
      glow: isCatnasta ? "catnasta" : undefined,
      ...extra,
    });
  });
}

export function computeLayout(input: LayoutInput): CardPlacement[] {
  const placements: CardPlacement[] = [];

  // Player's hand: a fan held towards the camera.
  // The curve and tilt depend on how far a card sits from the middle, not on
  // its index, so a big hand keeps the same shape instead of bending further.
  const n = input.hand.length;
  const spacing = Math.min(0.44, 7 / Math.max(n, 1));
  input.hand.forEach((card, i) => {
    const t = i - (n - 1) / 2;
    const x = t * spacing;
    const selected = input.selected.has(card.id);
    const local = new THREE.Vector3(x, -x * x * HAND_ARC + (selected ? 0.3 : 0), i * 0.006);
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -x * HAND_ROLL);
    placements.push({
      key: card.id,
      card,
      position: local.applyQuaternion(HAND_TILT).add(HAND_ORIGIN),
      quaternion: HAND_TILT.clone().multiply(roll),
      target: { type: "hand", id: card.id },
      glow: selected ? "selected" : undefined,
      hoverLift: true,
    });
  });

  // Opponent's hand: face down on their edge of the table.
  const m = input.opponentHandCount;
  const opponentSpacing = Math.min(0.34, 6 / Math.max(m, 1));
  for (let i = 0; i < m; i++) {
    const x = (i - (m - 1) / 2) * opponentSpacing;
    placements.push({
      key: `opponent-${i}`,
      card: null,
      position: new THREE.Vector3(
        x,
        // A little more than a card's thickness apart, so overlapping cards never flicker.
        0.004 + i * OPPONENT_CARD_GAP,
        OPPONENT_HAND_Z + x * x * OPPONENT_ARC,
      ),
      quaternion: flatQuaternion(false, x * OPPONENT_FAN),
    });
  }

  // Melds, with staged (not yet sent) melds continuing the player's row.
  const myColumns = meldColumns([...input.myMelds, ...input.staged]);
  input.myMelds.forEach((meld, index) => {
    layMeld(placements, meld, myColumns[index], MY_MELD_TOP, {
      target: { type: "meld", index },
      glow: meld.length >= CATNASTA_SIZE ? "catnasta" : input.meldsAreTargets ? "target" : undefined,
    });
  });
  input.staged.forEach((meld, index) => {
    layMeld(
      placements,
      meld,
      myColumns[input.myMelds.length + index],
      MY_MELD_TOP,
      { target: { type: "staged", index }, glow: "staged" },
      0.06,
    );
  });
  const opponentColumns = meldColumns(input.opponentMelds);
  input.opponentMelds.forEach((meld, index) => {
    layMeld(placements, meld, opponentColumns[index], OPPONENT_MELD_TOP, {});
  });

  // Red threes sit in their own column at the left of each meld row.
  input.myRedThrees.forEach((card, k) => {
    placements.push({
      key: card.id,
      card,
      position: new THREE.Vector3(RED_THREE_X, 0.004 + k * CARD_GAP, MY_MELD_TOP + CARD_HEIGHT / 2 + k * MELD_STEP),
      quaternion: flatQuaternion(true, jitter(card.id, 0.06)),
    });
  });
  input.opponentRedThrees.forEach((card, k) => {
    placements.push({
      key: card.id,
      card,
      position: new THREE.Vector3(
        RED_THREE_X,
        0.004 + k * CARD_GAP,
        OPPONENT_MELD_TOP + CARD_HEIGHT / 2 + k * MELD_STEP,
      ),
      quaternion: flatQuaternion(true, jitter(card.id, 0.06)),
    });
  });

  // Top of the discard pile, resting on the litter.
  if (input.discardTop) {
    placements.push({
      key: input.discardTop.id,
      card: input.discardTop,
      position: new THREE.Vector3(
        DISCARD_POSITION.x,
        LITTER_LEVEL + pileHeight(input.discardCount - 1) + 0.004,
        DISCARD_POSITION.z,
      ),
      quaternion: flatQuaternion(true, jitter(input.discardTop.id, 0.25)),
      target: { type: "discard" },
    });
  }

  return placements;
}

/** Height of a pile with the given number of cards. */
export function pileHeight(count: number) {
  return Math.max(count, 0) * CARD_GAP;
}
