"use client";
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cardboardTexture, plushTexture, seeded, sisalTexture, yarnTexture } from "./fabric";
import { FLOOR_Y } from "./tableLayout";
import { playSound } from "../sounds";

/*
 * Decorations only: every toy sits where no card is ever laid out, in the back
 * corners of the cushion or on the floor behind the bed. None of them move
 * (the mouse only squeaks when clicked),
 * so they cost nothing between frames.
 */

/** A tube along a smooth curve through the given points, e.g. a strand of yarn or a tail. */
function useTube(points: [number, number, number][], radius: number, segments = 48) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        segments,
        radius,
        6,
        false,
      ),
    // The points are fixed for each toy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** A ball of yarn with a loose strand wandering off along the cushion. */
function YarnBall() {
  const radius = 0.32;
  const strand = useTube(
    // Off towards the bolster, clear of the opponent's red threes.
    [
      [-0.2, -radius + 0.03, 0.18],
      [-0.36, -radius + 0.025, 0.42],
      [-0.58, -radius + 0.025, 0.36],
      [-0.8, -radius + 0.06, 0.5],
    ],
    0.022,
  );
  return (
    <group position={[-4.95, radius, -3.0]}>
      <mesh castShadow receiveShadow rotation={[0.4, 0.3, 0.2]}>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshStandardMaterial map={yarnTexture()} roughness={0.9} />
      </mesh>
      <mesh geometry={strand} castShadow>
        <meshStandardMaterial color="#b8473f" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A grey felt toy mouse with pink ears and a curly tail, eyeing the litter box. It squeaks when clicked. */
function ToyMouse() {
  const tail = useTube(
    [
      [-0.26, 0.05, 0],
      [-0.42, 0.03, 0.08],
      [-0.55, 0.02, -0.06],
      [-0.7, 0.02, 0.02],
    ],
    0.014,
    24,
  );
  const plush = plushTexture();
  return (
    <group
      position={[5.05, 0, -3.1]}
      rotation={[0, -2.3, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        playSound("squeak");
      }}
    >
      <mesh position={[0, 0.12, 0]} scale={[0.3, 0.15, 0.17]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshPhysicalMaterial color="#9a9aa4" map={plush} roughness={0.95} sheen={1} sheenColor="#e6e6f0" sheenRoughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.16, 0.24, side * 0.09]} rotation={[0, 0, 0.3]} scale={[0.02, 0.075, 0.07]} castShadow>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#e8a3ac" roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.25, 0.15, side * 0.055]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#141414" roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0.3, 0.11, 0]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#e27d8c" roughness={0.6} />
      </mesh>
      <mesh geometry={tail} castShadow>
        <meshStandardMaterial color="#e8a3ac" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** A sisal scratching post on a plush base, with a pom-pom dangling from its top. */
function ScratchingPost() {
  const height = 1.4;
  const plush = plushTexture();
  const string = useTube(
    [
      [0.38, height + 0.02, 0],
      [0.42, height - 0.25, 0.02],
      [0.43, height - 0.55, 0],
    ],
    0.008,
    12,
  );
  return (
    <group position={[7.3, FLOOR_Y, -4.3]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.14, 1.25]} />
        <meshPhysicalMaterial color="#c79d74" map={plush} roughness={0.95} sheen={1} sheenColor="#fff0d8" />
      </mesh>
      <mesh position={[0, 0.14 + height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, height, 28, 1, true]} />
        <meshStandardMaterial map={sisalTexture()} roughness={1} />
      </mesh>
      <mesh position={[0, 0.14 + height + 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.12, 0.95]} />
        <meshPhysicalMaterial color="#c79d74" map={plush} roughness={0.95} sheen={1} sheenColor="#fff0d8" />
      </mesh>
      <mesh geometry={string}>
        <meshStandardMaterial color="#e9dcc3" roughness={0.9} />
      </mesh>
      <mesh position={[0.43, height - 0.6, 0]} castShadow>
        <icosahedronGeometry args={[0.1, 2]} />
        <meshPhysicalMaterial color="#e2685a" map={plush} roughness={1} sheen={1} sheenColor="#ffc6b8" />
      </mesh>
    </group>
  );
}

/** A low corrugated-cardboard scratcher on the floor, worn by claws. */
function CardboardScratcher() {
  const top = cardboardTexture();
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a47a48", roughness: 1 }), []);
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: top, roughness: 1 }), [top]);
  useEffect(
    () => () => {
      side.dispose();
      face.dispose();
    },
    [side, face],
  );
  const scraps = useMemo(() => {
    const random = seeded(23);
    return Array.from({ length: 7 }, () => ({
      position: [(random() - 0.5) * 2.4, 0.01, 0.55 + random() * 0.4] as [number, number, number],
      angle: random() * Math.PI,
      width: 0.06 + random() * 0.06,
    }));
  }, []);
  // Box faces: +x, -x, +y (top), -y, +z, -z.
  const materials = useMemo(() => [side, side, face, side, side, side], [side, face]);
  return (
    <group position={[-7.3, FLOOR_Y, -3.7]} rotation={[0, 0.45, 0]}>
      <mesh position={[0, 0.16, 0]} material={materials} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.32, 0.75]} />
      </mesh>
      {/* A few stray bits of cardboard nearby. */}
      {scraps.map(({ position, angle, width }, i) => (
        <mesh key={i} position={position} rotation={[-Math.PI / 2, 0, angle]}>
          <planeGeometry args={[width, 0.03]} />
          <meshStandardMaterial color="#b98d58" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function CatToys() {
  return (
    <group>
      <YarnBall />
      <ToyMouse />
      <ScratchingPost />
      <CardboardScratcher />
    </group>
  );
}
