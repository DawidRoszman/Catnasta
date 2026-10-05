"use client";
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { drawPaw } from "@/app/lib/cards/draw";
import { DISCARD_POSITION, FLOOR_Y, STOCK_POSITION, TABLE_DEPTH, TABLE_WIDTH } from "./tableLayout";
import { plushTexture, roundedRectPath, rugTexture, sweepGeometry } from "./fabric";
import CatToys from "./CatToys";

/** The bolster's centre line runs this far outside the cushion's edge. */
const BOLSTER_OUT = 0.42;
const BOLSTER_WIDTH = 0.6;
const BOLSTER_Y = 0.2;
/** Half-height of the bolster: it rests on the floor. */
const BOLSTER_HEIGHT = BOLSTER_Y - FLOOR_Y;
/** Lower at the middle of the front, like the entry of a cat bed, so it never hides the hand. */
const ENTRY_HEIGHT = 0.26;
const ENTRY_HALF_WIDTH = 2.8;

function roundedRectShape(w: number, h: number, r: number) {
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
  return shape;
}

/** Plush cushion with quilting and embroidered zone markings, in table coordinates. */
function createFeltTexture() {
  const W = 2240;
  const H = Math.round((W * TABLE_DEPTH) / TABLE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const toX = (x: number) => ((x + TABLE_WIDTH / 2) / TABLE_WIDTH) * W;
  const toY = (z: number) => ((z + TABLE_DEPTH / 2) / TABLE_DEPTH) * H;
  const unit = W / TABLE_WIDTH;

  const base = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, W * 0.62);
  base.addColorStop(0, "#21645c");
  base.addColorStop(0.6, "#19524c");
  base.addColorStop(1, "#103a36");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Plush pile
  const image = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);

  // Quilting: soft diamond seams with a tuft where they cross, kept faint so cards stay easy to read.
  const step = unit * 1.4;
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.13)";
  ctx.lineWidth = unit * 0.035;
  for (let k = -H; k < W + H; k += step) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + H, H);
    ctx.moveTo(k, H);
    ctx.lineTo(k + H, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = unit * 0.012;
  for (let k = -H; k < W + H; k += step) {
    ctx.beginPath();
    ctx.moveTo(k + unit * 0.03, 0);
    ctx.lineTo(k + H + unit * 0.03, H);
    ctx.moveTo(k + unit * 0.03, H);
    ctx.lineTo(k + H + unit * 0.03, 0);
    ctx.stroke();
  }
  for (let row = 0; row * (step / 2) < H + step; row++) {
    for (let k = (row % 2) * (step / 2); k < W + step; k += step) {
      const tuft = ctx.createRadialGradient(k, row * (step / 2), 0, k, row * (step / 2), unit * 0.09);
      tuft.addColorStop(0, "rgba(0,0,0,0.28)");
      tuft.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = tuft;
      ctx.fillRect(k - unit * 0.1, row * (step / 2) - unit * 0.1, unit * 0.2, unit * 0.2);
    }
  }
  ctx.restore();

  // Stitched seam just inside the edge.
  ctx.save();
  ctx.setLineDash([unit * 0.07, unit * 0.05]);
  ctx.strokeStyle = "rgba(240, 220, 170, 0.22)";
  ctx.lineWidth = unit * 0.018;
  ctx.beginPath();
  ctx.roundRect(unit * 0.32, unit * 0.32, W - unit * 0.64, H - unit * 0.64, unit * 0.35);
  ctx.stroke();
  ctx.restore();

  const ink = "rgba(240, 220, 170, 0.16)";
  const inkStrong = "rgba(240, 220, 170, 0.32)";

  // Centre emblem
  ctx.save();
  ctx.translate(toX(-0.8), toY(-0.15));
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, unit * 1.5, unit * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, unit * 1.38, unit * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `600 ${unit * 0.34}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${unit * 0.08}px`;
  ctx.fillText("CATNASTA", unit * 0.04, 0);
  ctx.restore();

  // Pile spots
  const spot = (x: number, z: number, label: string) => {
    const w = unit * 0.86;
    const h = unit * 1.14;
    ctx.save();
    ctx.translate(toX(x), toY(z));
    ctx.setLineDash([unit * 0.06, unit * 0.05]);
    ctx.strokeStyle = inkStrong;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, unit * 0.07);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = inkStrong;
    ctx.font = `700 ${unit * 0.11}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.letterSpacing = `${unit * 0.03}px`;
    ctx.fillText(label, 0, h / 2 + unit * 0.2);
    ctx.restore();
  };
  spot(STOCK_POSITION.x, STOCK_POSITION.z, "STOCK");
  spot(DISCARD_POSITION.x, DISCARD_POSITION.z, "LITTERBOX");

  // Meld rows
  const row = (z: number, label: string) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(-5.2), toY(z));
    ctx.lineTo(toX(2.75), toY(z));
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = `700 ${unit * 0.1}px Georgia, serif`;
    ctx.textAlign = "left";
    ctx.letterSpacing = `${unit * 0.03}px`;
    ctx.fillText(label, toX(-5.2), toY(z) - unit * 0.08);
  };
  row(0.62, "YOUR MELDS");
  row(-2.18, "OPPONENT MELDS");

  // A few paw prints wandering across the cloth
  [
    [-4.6, 3.0, 0.4],
    [-4.2, 2.7, 0.2],
    [4.9, -3.0, -2.6],
    [4.5, -2.75, -2.8],
  ].forEach(([x, z, a]) => drawPaw(ctx, toX(x), toY(z), unit * 0.22, "rgba(240,220,170,0.08)", a));

  // Vignette
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.66);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The bed's plush bolster: a rounded tube round the cushion with piping along its top. */
function Bolster() {
  const { body, piping } = useMemo(() => {
    const path = roundedRectPath(TABLE_WIDTH / 2 + BOLSTER_OUT, TABLE_DEPTH / 2 + BOLSTER_OUT, 1.1, 260);
    const height = (point: THREE.Vector2) => {
      if (point.y < TABLE_DEPTH / 2) {
        return BOLSTER_HEIGHT;
      }
      const s = THREE.MathUtils.clamp(1 - Math.abs(point.x) / ENTRY_HALF_WIDTH, 0, 1);
      return BOLSTER_HEIGHT - (BOLSTER_HEIGHT - ENTRY_HEIGHT) * s * s * (3 - 2 * s);
    };
    const perimeter = 2 * (TABLE_WIDTH + TABLE_DEPTH);
    return {
      body: sweepGeometry(
        path,
        (point) => ({ out: 0, y: BOLSTER_Y, rw: BOLSTER_WIDTH, rh: height(point) }),
        22,
        perimeter / 1.5,
      ),
      piping: sweepGeometry(
        path,
        (point) => ({ out: -0.04, y: BOLSTER_Y + height(point) - 0.015, rw: 0.035, rh: 0.035 }),
        8,
      ),
    };
  }, []);
  const plush = plushTexture();
  useEffect(
    () => () => {
      body.dispose();
      piping.dispose();
    },
    [body, piping],
  );
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#c79d74"
          map={plush}
          bumpMap={plush}
          bumpScale={1.2}
          roughness={0.95}
          sheen={1}
          sheenRoughness={0.5}
          sheenColor="#fff0d8"
        />
      </mesh>
      <mesh geometry={piping} castShadow>
        <meshStandardMaterial color="#7d5236" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** The bed sits on a round braided rug that fades into the dark room. */
function Rug() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.005, 0.4]} receiveShadow>
      <circleGeometry args={[11, 72]} />
      <meshStandardMaterial map={rugTexture()} roughness={1} />
    </mesh>
  );
}

/** The play surface: a plush cat bed with its bolster, on a rug, with a few toys about. */
export default function Table3D() {
  const felt = useMemo(() => createFeltTexture(), []);
  const feltGeometry = useMemo(
    () => {
      const geometry = new THREE.ShapeGeometry(roundedRectShape(TABLE_WIDTH, TABLE_DEPTH, 0.5), 24);
      const uv = geometry.attributes.uv;
      const position = geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, position.getX(i) / TABLE_WIDTH + 0.5, position.getY(i) / TABLE_DEPTH + 0.5);
      }
      return geometry;
    },
    [],
  );

  return (
    <group>
      <mesh geometry={feltGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial map={felt} roughness={0.97} metalness={0} />
      </mesh>
      {/* The cushion's padded body, hidden under the bolster at the edges. */}
      <mesh position={[0, (FLOOR_Y - 0.01) / 2, 0]}>
        <boxGeometry args={[TABLE_WIDTH + 0.2, -FLOOR_Y - 0.01, TABLE_DEPTH + 0.2]} />
        <meshStandardMaterial color="#123f3a" roughness={1} />
      </mesh>
      <Bolster />
      <Rug />
      <CatToys />
    </group>
  );
}
