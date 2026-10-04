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
