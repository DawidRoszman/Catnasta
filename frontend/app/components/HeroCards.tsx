"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { easing } from "maath";
import { CardSkeleton } from "./ui/Skeleton";
import { PlayingCard, ensureCardFonts } from "@/app/lib/cards/draw";
import { Rank, Suit } from "@/app/game/[slug]/components/gameReducer";
import { getCardGeometry, getCardTexture } from "@/app/game/[slug]/components/three/textures";

const HERO_CARDS: PlayingCard[] = [
  { id: "h1", rank: Rank.ACE, suit: Suit.SPADE },
  { id: "h2", rank: Rank.QUEEN, suit: Suit.DIAMOND },
  { id: "h3", rank: Rank.KING, suit: Suit.HEART },
  { id: "h4", rank: "JOKER", suit: "RED" },
  { id: "h5", rank: Rank.JACK, suit: Suit.CLUB },
];

function HeroCard({ card, index }: { card: PlayingCard; index: number }) {
  const t = index - (HERO_CARDS.length - 1) / 2;
  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[-0.06, 0.06]}>
      <group position={[t * 0.62, -Math.abs(t) * 0.12, index * 0.02]} rotation={[0, 0, -t * 0.16]}>
        <mesh geometry={getCardGeometry()} position={[0, 0, 0.0012]} castShadow>
          <meshStandardMaterial map={getCardTexture(card)} roughness={0.5} />
        </mesh>
        <mesh geometry={getCardGeometry()} position={[0, 0, -0.0012]} rotation={[0, Math.PI, 0]}>
          <meshStandardMaterial map={getCardTexture(null)} roughness={0.5} />
        </mesh>
      </group>
    </Float>
  );
}

function Fan() {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (group.current) {
      easing.dampE(
        group.current.rotation,
        [-0.12 - state.pointer.y * 0.18, state.pointer.x * 0.35, 0],
        0.4,
        delta,
      );
    }
  });
  return (
    <group ref={group} scale={1.55}>
      {HERO_CARDS.map((card, i) => (
        <HeroCard key={card.id} card={card} index={i} />
      ))}
    </group>
  );
}

export default function HeroCards() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    ensureCardFonts().then(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative aspect-[5/4] w-full" aria-hidden>
      <div className="absolute inset-[12%] rounded-full bg-brass/15 blur-3xl" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center -space-x-12">
          {[-2, -1, 0, 1, 2].map((t) => (
            <CardSkeleton key={t} width={150} className="origin-bottom" />
          ))}
        </div>
      )}
      {ready && (
        <Canvas flat dpr={[1, 2]} camera={{ position: [0, 0.2, 5.8], fov: 38 }} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 4, 5]} intensity={1.6} />
          <Fan />
        </Canvas>
      )}
    </div>
  );
}
