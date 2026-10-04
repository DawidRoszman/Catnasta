"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { PlayingCard, ensureCardFonts } from "@/app/lib/cards/draw";
import { Rank, Suit } from "@/app/game/[slug]/components/gameReducer";
import { getCardGeometry, getCardTexture } from "@/app/game/[slug]/components/three/textures";
import { CardSkeleton } from "./ui/Skeleton";

const HERO_CARDS: PlayingCard[] = [
  { id: "h1", rank: Rank.ACE, suit: Suit.SPADE },
  { id: "h2", rank: Rank.QUEEN, suit: Suit.DIAMOND },
  { id: "h3", rank: Rank.KING, suit: Suit.HEART },
  { id: "h4", rank: "JOKER", suit: "RED" },
  { id: "h5", rank: Rank.JACK, suit: Suit.CLUB },
];

const SPACING = 0.62;
const FAN_SCALE = 1.3;
/** Half-width of the fan in world units, including room for sway, hover and flips. */
const FAN_HALF_WIDTH = (2 * SPACING + 0.62) * FAN_SCALE;
const FAN_HALF_HEIGHT = 0.95 * FAN_SCALE;
const FLIP_EVERY = 2.8;
const FLIP_DURATION = 1.1;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Moves the camera back far enough that the fan always fits the canvas. */
function FitCamera() {
  const size = useThree((state) => state.size);
  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = Math.max(
      FAN_HALF_WIDTH / (Math.tan(halfFov) * aspect),
      FAN_HALF_HEIGHT / Math.tan(halfFov),
    );
    easing.damp3(camera.position, [0, 0.1, distance], 0.25, delta);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function HeroCard({
  card,
  index,
  flipStart,
  onFlip,
}: {
  card: PlayingCard;
  index: number;
  /** Clock time when this card's current flip started, or -Infinity. */
  flipStart: React.RefObject<number[]>;
  onFlip: (index: number) => void;
}) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const t = index - (HERO_CARDS.length - 1) / 2;

  useFrame((state, delta) => {
    if (!outer.current || !inner.current) {
      return;
    }
    const time = state.clock.elapsedTime;
    // The fan breathes: cards spread out and gather back together.
    const spread = 1 + Math.sin(time * 0.9) * 0.07;
    const bob = Math.sin(time * 1.6 + index * 1.3) * 0.05;
    const lift = hovered ? 1 : 0;
    easing.damp3(
      outer.current.position,
      [t * SPACING * spread, -Math.abs(t) * 0.12 + bob + lift * 0.18, index * 0.02 + lift * 0.45],
      0.18,
      delta,
    );
    easing.dampE(
      outer.current.rotation,
      [
        Math.sin(time * 1.1 + index) * 0.05,
        Math.sin(time * 0.8 + index * 0.7) * 0.08,
        hovered ? 0 : -t * 0.16 * spread,
      ],
      0.2,
      delta,
    );

    // Flip with a little hop.
    const progress = (time - flipStart.current![index]) / FLIP_DURATION;
    if (progress >= 0 && progress <= 1) {
      inner.current.rotation.y = easeInOut(progress) * Math.PI * 2;
      inner.current.position.y = Math.sin(progress * Math.PI) * 0.35;
    } else {
      inner.current.rotation.y = 0;
      inner.current.position.y = 0;
    }
  });

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const onPointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group ref={outer} position={[t * SPACING, 0, index * 0.02]}>
      <group
        ref={inner}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={(e) => {
          e.stopPropagation();
          onFlip(index);
        }}
      >
        <mesh geometry={getCardGeometry()} position={[0, 0, 0.0012]}>
          <meshStandardMaterial map={getCardTexture(card)} roughness={0.5} />
        </mesh>
        <mesh geometry={getCardGeometry()} position={[0, 0, -0.0012]} rotation={[0, Math.PI, 0]}>
          <meshStandardMaterial map={getCardTexture(null)} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function Fan() {
  const group = useRef<THREE.Group>(null);
  const flipStart = useRef<number[]>(HERO_CARDS.map(() => -Infinity));
  const nextAutoFlip = useRef({ at: 1.5, index: 0 });
  const clock = useThree((state) => state.clock);

  const flip = (index: number) => {
    const now = clock.elapsedTime;
    // Ignore clicks while the card is mid-flip.
    if (now - flipStart.current[index] > FLIP_DURATION) {
      flipStart.current[index] = now;
    }
  };

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    // Cards take turns flipping over, left to right.
    if (time >= nextAutoFlip.current.at) {
      flip(nextAutoFlip.current.index);
      nextAutoFlip.current = {
        at: time + FLIP_EVERY,
        index: (nextAutoFlip.current.index + 1) % HERO_CARDS.length,
      };
    }
    if (group.current) {
      easing.dampE(
        group.current.rotation,
        [
          -0.1 + Math.sin(time * 0.4) * 0.05 - state.pointer.y * 0.12,
          Math.sin(time * 0.5) * 0.16 + state.pointer.x * 0.22,
          Math.sin(time * 0.3) * 0.035,
        ],
        0.35,
        delta,
      );
    }
  });

  return (
    <group ref={group} scale={FAN_SCALE}>
      {HERO_CARDS.map((card, i) => (
        <HeroCard key={card.id} card={card} index={i} flipStart={flipStart} onFlip={flip} />
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
    <div className="relative aspect-[5/4] w-full min-w-0" aria-hidden>
      <div className="absolute inset-[12%] rounded-full bg-brass/15 blur-3xl" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center -space-x-12">
          {[-2, -1, 0, 1, 2].map((t) => (
            <CardSkeleton key={t} width={110} />
          ))}
        </div>
      )}
      {ready && (
        <Canvas
          flat
          dpr={[1, 2]}
          camera={{ position: [0, 0.1, 7], fov: 36 }}
          gl={{ alpha: true, antialias: true }}
          onPointerMissed={() => (document.body.style.cursor = "")}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 4, 5]} intensity={1.6} />
          <FitCamera />
          <Fan />
        </Canvas>
      )}
    </div>
  );
}
