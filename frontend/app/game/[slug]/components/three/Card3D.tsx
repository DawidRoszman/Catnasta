"use client";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { PlayingCard } from "@/app/lib/cards/draw";
import { getCardGeometry, getCardTexture, getGoldTexture, getOutlineGeometry } from "./textures";
import { Glow } from "./tableLayout";
import { frameStep, usePulseFrames } from "./frames";

/** Outline colours; gold ones use the gilt texture instead of a flat colour. */
const GLOW_COLORS: Record<Glow, string | "gold"> = {
  selected: "gold",
  staged: "#7cc4e8",
  catnasta: "gold",
  target: "#6fd3b0",
};

type Card3DProps = {
  card: PlayingCard | null;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  /** Where a newly mounted card flies in from (e.g. the stock). */
  spawn: THREE.Vector3;
  glow?: Glow;
  hoverLift?: boolean;
  onClick?: () => void;
};

function Card3D({ card, position, quaternion, spawn, glow, hoverLift, onClick }: Card3DProps) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const glowMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const initial = useMemo(() => spawn.clone(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const front = card ? getCardTexture(card) : null;
  const back = getCardTexture(null);
  const interactive = onClick !== undefined;
  const outlineColor = GLOW_COLORS[glow ?? "selected"];

  // A new spot, glow or hover state means the card has somewhere to move.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [position, quaternion, glow, hovered, invalidate]);
  usePulseFrames(glow === "target");

  useFrame((state, rawDelta) => {
    if (!group.current || !inner.current) {
      return;
    }
    const delta = frameStep(rawDelta);
    const lifted = hovered && interactive;
    const moved = easing.damp3(group.current.position, position, 0.16, delta);
    const turned = easing.dampQ(group.current.quaternion, quaternion, 0.16, delta);
    const lifting = easing.damp3(
      inner.current.position,
      [0, lifted && hoverLift ? 0.12 : 0, lifted ? 0.05 : 0],
      0.08,
      delta,
    );
    let fading = false;
    if (glowMaterial.current) {
      const pulse = glow === "target" ? 0.55 + Math.sin(state.clock.elapsedTime * 4) * 0.3 : 1;
      fading = easing.damp(glowMaterial.current, "opacity", glow ? pulse : lifted ? 0.75 : 0, 0.1, delta);
    }
    // Keep drawing until the card settles; pulses keep their own, slower, pace.
    if ((moved || turned || lifting || fading) && glow !== "target") {
      state.invalidate();
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) {
      return;
    }
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    if (!interactive) {
      return;
    }
    setHovered(false);
    document.body.style.cursor = "";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onClick) {
      return;
    }
    e.stopPropagation();
    onClick();
  };

  return (
    <group ref={group} position={initial}>
      <group
        ref={inner}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {/* Focus outline: a thin gold rim (hover and selection) or a coloured one for other states. */}
        <mesh geometry={getOutlineGeometry()} position={[0, 0, -0.002]} renderOrder={-1}>
          <meshBasicMaterial
            // Swapping between the gold texture and a flat colour needs a fresh material.
            key={outlineColor}
            ref={glowMaterial}
            color={outlineColor === "gold" ? "#ffffff" : outlineColor}
            map={outlineColor === "gold" ? getGoldTexture() : null}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        {front && (
          <mesh geometry={getCardGeometry()} position={[0, 0, 0.0012]} castShadow>
            <meshStandardMaterial map={front} roughness={0.55} metalness={0} />
          </mesh>
        )}
        <mesh
          geometry={getCardGeometry()}
          position={[0, 0, front ? -0.0012 : 0]}
          rotation={[0, Math.PI, 0]}
          castShadow={!front}
        >
          <meshStandardMaterial map={back} roughness={0.55} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

export default memo(Card3D);
