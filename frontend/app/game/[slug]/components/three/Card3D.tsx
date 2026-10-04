"use client";
import React, { memo, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { PlayingCard } from "@/app/lib/cards/draw";
import { getCardGeometry, getCardTexture } from "./textures";
import { CARD_HEIGHT, CARD_WIDTH, Glow } from "./tableLayout";

const GLOW_COLORS: Record<Glow, string> = {
  selected: "#f0bd62",
  staged: "#7cc4e8",
  catnasta: "#ffd36b",
  target: "#6fd3b0",
};

const glowGeometry = new THREE.PlaneGeometry(CARD_WIDTH + 0.09, CARD_HEIGHT + 0.09);

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

  useFrame((state, delta) => {
    if (!group.current || !inner.current) {
      return;
    }
    easing.damp3(group.current.position, position, 0.16, delta);
    easing.dampQ(group.current.quaternion, quaternion, 0.16, delta);
    const lifted = hovered && interactive;
    easing.damp3(
      inner.current.position,
      [0, lifted && hoverLift ? 0.12 : 0, lifted ? 0.05 : 0],
      0.08,
      delta,
    );
    if (glowMaterial.current) {
      const pulse = glow === "target" ? 0.35 + Math.sin(state.clock.elapsedTime * 4) * 0.2 : 0.85;
      easing.damp(glowMaterial.current, "opacity", glow ? pulse : lifted ? 0.35 : 0, 0.1, delta);
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
        <mesh geometry={glowGeometry} position={[0, 0, -0.002]} renderOrder={-1}>
          <meshBasicMaterial
            ref={glowMaterial}
            color={GLOW_COLORS[glow ?? "selected"]}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
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
