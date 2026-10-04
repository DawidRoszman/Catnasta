"use client";
import React, { useMemo } from "react";
import * as THREE from "three";
import { drawPaw } from "@/app/lib/cards/draw";
import { DISCARD_POSITION, STOCK_POSITION, TABLE_DEPTH, TABLE_WIDTH } from "./tableLayout";

const RIM = 0.55;

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

/** Felt texture with printed zone markings, in table coordinates. */
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
  base.addColorStop(0, "#22684f");
  base.addColorStop(0.6, "#185440");
  base.addColorStop(1, "#0d3a2c");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Felt fibres
  const image = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);

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
  spot(DISCARD_POSITION.x, DISCARD_POSITION.z, "DISCARD");

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

export default function Table3D() {
  const felt = useMemo(() => createFeltTexture(), []);
  const rimGeometry = useMemo(() => {
    const outer = roundedRectShape(TABLE_WIDTH + RIM * 2, TABLE_DEPTH + RIM * 2, 0.9);
    outer.holes.push(roundedRectShape(TABLE_WIDTH, TABLE_DEPTH, 0.5));
    return new THREE.ExtrudeGeometry(outer, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 24,
    });
  }, []);
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
        <meshStandardMaterial map={felt} roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={rimGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#5a341d" roughness={0.42} metalness={0.05} />
      </mesh>
      {/* Brass inlay along the inner edge of the rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <shapeGeometry
          args={[
            (() => {
              const s = roundedRectShape(TABLE_WIDTH, TABLE_DEPTH, 0.5);
              s.holes.push(roundedRectShape(TABLE_WIDTH - 0.06, TABLE_DEPTH - 0.06, 0.47));
              return s;
            })(),
            24,
          ]}
        />
        <meshStandardMaterial color="#d4a142" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Table base fading into the room */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[TABLE_WIDTH + RIM * 2 - 0.4, 1, TABLE_DEPTH + RIM * 2 - 0.4]} />
        <meshStandardMaterial color="#1c120b" roughness={0.9} />
      </mesh>
    </group>
  );
}
