import * as THREE from "three";
import type { PlayingCard } from "@/app/lib/cards/draw";

/** World size of a card (poker ratio). */
export const CARD_WIDTH = 0.7;
export const CARD_HEIGHT = 0.98;
export const CARD_GAP = 0.0035;

/** Felt surface size; the wooden rim sits around it. */
export const TABLE_WIDTH = 11.2;
export const TABLE_DEPTH = 7.4;

export const STOCK_POSITION = new THREE.Vector3(3.15, 0, -0.15);
export const DISCARD_POSITION = new THREE.Vector3(4.35, 0, -0.15);

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

function meldColumnX(index: number, count: number) {
  const spacing = Math.min(MELD_SPACING, (MELD_AREA_RIGHT - MELD_AREA_LEFT) / Math.max(count - 1, 1));
  return MELD_AREA_LEFT + index * spacing;
}

function layMeld(
  placements: CardPlacement[],
  cards: PlayingCard[],
  x: number,
  top: number,
  extra: Partial<CardPlacement>,
  lift = 0,
) {
  const isCatnasta = cards.length >= 7;
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
  const n = input.hand.length;
  const spacing = Math.min(0.44, 7 / Math.max(n, 1));
  input.hand.forEach((card, i) => {
    const t = i - (n - 1) / 2;
    const selected = input.selected.has(card.id);
    const local = new THREE.Vector3(
      t * spacing,
      -t * t * 0.006 * (spacing / 0.5) + (selected ? 0.3 : 0),
      i * 0.006,
    );
    const roll = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -t * 0.028 * (spacing / 0.5),
    );
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
    const t = i - (m - 1) / 2;
    placements.push({
      key: `opponent-${i}`,
      card: null,
      position: new THREE.Vector3(
        t * opponentSpacing,
        0.004 + i * CARD_GAP,
        OPPONENT_HAND_Z + t * t * 0.006,
      ),
      quaternion: flatQuaternion(false, t * 0.035),
    });
  }

  // Melds, with staged (not yet sent) melds continuing the player's row.
  const myColumns = input.myMelds.length + input.staged.length;
  input.myMelds.forEach((meld, index) => {
    layMeld(placements, meld, meldColumnX(index, myColumns), MY_MELD_TOP, {
      target: { type: "meld", index },
      glow: meld.length >= 7 ? "catnasta" : input.meldsAreTargets ? "target" : undefined,
    });
  });
  input.staged.forEach((meld, index) => {
    layMeld(
      placements,
      meld,
      meldColumnX(input.myMelds.length + index, myColumns),
      MY_MELD_TOP,
      { target: { type: "staged", index }, glow: "staged" },
      0.06,
    );
  });
  input.opponentMelds.forEach((meld, index) => {
    layMeld(
      placements,
      meld,
      meldColumnX(index, input.opponentMelds.length),
      OPPONENT_MELD_TOP,
      {},
    );
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

  // Top of the discard pile.
  if (input.discardTop) {
    placements.push({
      key: input.discardTop.id,
      card: input.discardTop,
      position: new THREE.Vector3(
        DISCARD_POSITION.x,
        pileHeight(input.discardCount - 1) + 0.004,
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
