"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { frameStep, usePulseFrames } from "./frames";
import { getCardGeometry, getCardTexture } from "./textures";
import { CARD_HEIGHT, CARD_WIDTH, DISCARD_POSITION, LITTER_LEVEL, STOCK_POSITION, pileHeight } from "./tableLayout";
import { BOX_DEPTH, BOX_WIDTH, LitterBox } from "./LitterBox";

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

function ActionRing({
  active,
  color,
  width = CARD_WIDTH + 0.22,
  depth = CARD_HEIGHT + 0.22,
}: {
  active: boolean;
  color: string;
  width?: number;
  depth?: number;
}) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const invalidate = useThree((state) => state.invalidate);
  usePulseFrames(active);
  // Fading out after the pile stops being clickable needs a few frames too.
  useEffect(() => invalidate(), [active, invalidate]);
  useFrame((state, delta) => {
    if (material.current) {
      const target = active ? 0.45 + Math.sin(state.clock.elapsedTime * 3.5) * 0.25 : 0;
      const fading = easing.damp(material.current, "opacity", target, 0.12, frameStep(delta));
      if (fading && !active) {
        state.invalidate();
      }
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[width, depth]} />
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

/**
 * The discard pile: a litter box with the cards resting on the litter. Its top
 * card is rendered as a regular Card3D. It only glows when the pile can be taken.
 */
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
      <ActionRing active={active} color="#6fd3b0" width={BOX_WIDTH + 0.2} depth={BOX_DEPTH + 0.2} />
      <LitterBox />
      <group position={[0, LITTER_LEVEL, 0]}>
        <PileBody height={pileHeight(count - 1)} />
      </group>
      {/* Invisible hit area so the whole box is easy to click */}
      <mesh position={[0, 0.1, 0]} visible={false}>
        <boxGeometry args={[BOX_WIDTH, 0.2 + pileHeight(count), BOX_DEPTH]} />
      </mesh>
    </group>
  );
}
