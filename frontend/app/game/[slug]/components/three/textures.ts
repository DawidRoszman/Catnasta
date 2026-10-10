import * as THREE from "three";
import { PlayingCard, cardKey, getCardCanvas } from "@/app/lib/cards/draw";
import { CARD_HEIGHT, CARD_WIDTH } from "./tableLayout";

const textures = new Map<string, THREE.CanvasTexture>();

/** Cached texture for a card face, or the card back when card is null. */
export function getCardTexture(card: PlayingCard | null) {
  const key = cardKey(card);
  let texture = textures.get(key);
  if (texture === undefined) {
    texture = new THREE.CanvasTexture(getCardCanvas(card, 1.28));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    textures.set(key, texture);
  }
  return texture;
}

let geometry: THREE.ShapeGeometry | null = null;

/** Rounded-rectangle card geometry with UVs spanning the whole card. */
export function getCardGeometry() {
  if (geometry === null) {
    const w = CARD_WIDTH;
    const h = CARD_HEIGHT;
    const r = 0.045;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    geometry = new THREE.ShapeGeometry(shape, 6);
    const uv = geometry.attributes.uv;
    const position = geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, position.getX(i) / w + 0.5, position.getY(i) / h + 0.5);
    }
    uv.needsUpdate = true;
  }
  return geometry;
}

/** Card corner radius, shared by the card face and its outline. */
const CARD_RADIUS = 0.045;
/** How far the focus outline reaches past the card's edge. */
export const OUTLINE_WIDTH = 0.016;

function cardShape(w: number, h: number, r: number, path: THREE.Path) {
  path.moveTo(-w / 2 + r, -h / 2);
  path.lineTo(w / 2 - r, -h / 2);
  path.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  path.lineTo(w / 2, h / 2 - r);
  path.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  path.lineTo(-w / 2 + r, h / 2);
  path.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  path.lineTo(-w / 2, -h / 2 + r);
  path.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return path;
}

let outlineGeometry: THREE.ShapeGeometry | null = null;

/** A thin ring hugging the card's rounded edge, with UVs spanning its bounds. */
export function getOutlineGeometry() {
  if (outlineGeometry === null) {
    const w = CARD_WIDTH + OUTLINE_WIDTH * 2;
    const h = CARD_HEIGHT + OUTLINE_WIDTH * 2;
    const shape = cardShape(w, h, CARD_RADIUS + OUTLINE_WIDTH, new THREE.Shape()) as THREE.Shape;
    // The hole sits a hair inside the card so no gap shows at the edge.
    shape.holes.push(cardShape(CARD_WIDTH - 0.004, CARD_HEIGHT - 0.004, CARD_RADIUS, new THREE.Path()));
    outlineGeometry = new THREE.ShapeGeometry(shape, 8);
    const uv = outlineGeometry.attributes.uv;
    const position = outlineGeometry.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, position.getX(i) / w + 0.5, position.getY(i) / h + 0.5);
    }
    uv.needsUpdate = true;
  }
  return outlineGeometry;
}

let goldTexture: THREE.CanvasTexture | null = null;

/** A diagonal sweep of light and dark gold, so the outline reads as gilt rather than flat yellow. */
export function getGoldTexture() {
  if (goldTexture === null) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#f6e3a6");
    gradient.addColorStop(0.22, "#c9973a");
    gradient.addColorStop(0.45, "#f1d17c");
    gradient.addColorStop(0.62, "#a8782a");
    gradient.addColorStop(0.82, "#e2bb5e");
    gradient.addColorStop(1, "#8c6220");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    goldTexture = new THREE.CanvasTexture(canvas);
    goldTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return goldTexture;
}

const countTextures = new Map<number, THREE.CanvasTexture>();

/** A gilt disc with a number on it, for the card count badge on a catnasta. */
export function getCountTexture(count: number) {
  let texture = countTextures.get(count);
  if (texture === undefined) {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#f6e3a6");
    gradient.addColorStop(0.5, "#d9ad4c");
    gradient.addColorStop(1, "#9c6e24");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a3a12";
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - ctx.lineWidth, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#3b240a";
    ctx.font = `700 ${size * (count >= 10 ? 0.5 : 0.6)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(count), size / 2, size / 2 + size * 0.04);
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    countTextures.set(count, texture);
  }
  return texture;
}
