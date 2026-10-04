"use client";
import React, { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { getCardGeometry, getCardTexture } from "./textures";
import { CARD_HEIGHT, CARD_WIDTH, DISCARD_POSITION, STOCK_POSITION, pileHeight } from "./tableLayout";

const EDGE_COLOR = "#e9dfc9";

function PileBody({ height, color = EDGE_COLOR }: { height: number; color?: string }) {
  if (height <= 0) {
    return null;
  }
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[CARD_WIDTH - 0.01, height, CARD_HEIGHT - 0.01]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

function ActionRing({ active, color }: { active: boolean; color: string }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state, delta) => {
    if (material.current) {
      const target = active ? 0.45 + Math.sin(state.clock.elapsedTime * 3.5) * 0.25 : 0;
      easing.damp(material.current, "opacity", target, 0.12, delta);
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[CARD_WIDTH + 0.22, CARD_HEIGHT + 0.22]} />
      <meshBasicMaterial ref={material} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

type PileProps = {
  count: number;
  active: boolean;
  onClick: () => void;
};

export function StockPile({ count, active, onClick }: PileProps) {
  const [hovered, setHovered] = useState(false);
  const height = pileHeight(count);
  return (
    <group
      position={STOCK_POSITION}
      rotation={[0, 0.04, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (active) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <ActionRing active={active} color={hovered ? "#f0bd62" : "#6fd3b0"} />
      <PileBody height={height} />
      {count > 0 && (
        <mesh
          geometry={getCardGeometry()}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, height + 0.001 + (hovered && active ? 0.04 : 0), 0]}
        >
          <meshStandardMaterial map={getCardTexture(null)} roughness={0.55} />
        </mesh>
      )}
    </group>
  );
}

/** The discard pile's body; its top card is rendered as a regular Card3D. */
export function DiscardPile({ count, active, onClick }: PileProps) {
  return (
    <group
      position={DISCARD_POSITION}
      rotation={[0, -0.05, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (active) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <ActionRing active={active} color="#6fd3b0" />
      <PileBody height={pileHeight(count - 1)} />
      {/* Invisible hit area so the pile is easy to click */}
      <mesh position={[0, 0.05, 0]} visible={false}>
        <boxGeometry args={[CARD_WIDTH + 0.1, 0.1 + pileHeight(count), CARD_HEIGHT + 0.1]} />
      </mesh>
    </group>
  );
}
