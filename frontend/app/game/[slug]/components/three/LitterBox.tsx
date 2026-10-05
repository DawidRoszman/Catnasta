"use client";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARD_HEIGHT, CARD_WIDTH, LITTER_LEVEL } from "./tableLayout";

/** Inside of the tray: room for a card turned a little either way. */
export const BOX_INNER_WIDTH = CARD_WIDTH + 0.2;
export const BOX_INNER_DEPTH = CARD_HEIGHT + 0.2;
const WALL = 0.05;
export const BOX_WIDTH = BOX_INNER_WIDTH + WALL * 2;
export const BOX_DEPTH = BOX_INNER_DEPTH + WALL * 2;
const WALL_HEIGHT = 0.15;
/** The front wall dips to an entry, like a real litter box, so the top card stays in view. */
const ENTRY_DEPTH = 0.075;
const ENTRY_WIDTH = BOX_INNER_WIDTH * 0.62;

const PLASTIC = "#5d87a6";
const PLASTIC_RIM = "#7aa3c0";
const LITTER = "#d8cbb0";
const GRANULES = ["#cbbd9f", "#e4d8bf", "#bfae8c", "#efe6d2"];

/**
 * A rounded rectangle centred on the origin, in the XY plane. The -Y edge
 * becomes the front of the box and is split into many points so it can bend.
 */
function roundedRect(width: number, depth: number, radius: number, path: THREE.Path = new THREE.Shape()) {
  const w = width / 2;
  const d = depth / 2;
  const steps = 32;
  path.moveTo(-w + radius, -d);
  for (let i = 1; i <= steps; i++) {
    path.lineTo(-w + radius + ((2 * (w - radius)) * i) / steps, -d);
  }
  path.quadraticCurveTo(w, -d, w, -d + radius);
  path.lineTo(w, d - radius);
  path.quadraticCurveTo(w, d, w - radius, d);
  path.lineTo(-w + radius, d);
  path.quadraticCurveTo(-w, d, -w, d - radius);
  path.lineTo(-w, -d + radius);
  path.quadraticCurveTo(-w, -d, -w + radius, -d);
  return path;
}

/** A flat ring between two rounded rectangles, extruded upwards. */
function ringGeometry(outerW: number, outerD: number, innerW: number, innerD: number, height: number, radius: number) {
  const shape = roundedRect(outerW, outerD, radius) as THREE.Shape;
  shape.holes.push(roundedRect(innerW, innerD, Math.max(radius - WALL, 0.01), new THREE.Path()));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 8,
  });
  // Extruded along +Z; stand it up so the height runs along +Y.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Pushes the top of the front wall down into a smooth entry dip. */
function carveEntry(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position;
  const front = BOX_DEPTH / 2 - WALL * 1.5;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (z < front || y < WALL_HEIGHT * 0.5) {
      continue;
    }
    const along = Math.abs(x) / (ENTRY_WIDTH / 2);
    if (along < 1.4) {
      // Full depth across the opening, easing back up at its ends.
      const dip = along <= 1 ? 1 : 1 - (along - 1) / 0.4;
      const ease = dip * dip * (3 - 2 * dip);
      position.setY(i, y - ENTRY_DEPTH * ease);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Small pseudo-random generator, so the litter looks the same on every render. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function Granules() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 220;
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.014, 0), []);
  useLayoutEffect(() => {
    if (!mesh.current) {
      return;
    }
    const next = random(7);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = (next() - 0.5) * (BOX_INNER_WIDTH - 0.04);
      const z = (next() - 0.5) * (BOX_INNER_DEPTH - 0.04);
      const size = 0.6 + next() * 0.9;
      rotation.setFromEuler(new THREE.Euler(next() * 3, next() * 3, next() * 3));
      matrix.compose(
        // Kept just below the cards, which rest on top of the litter.
        new THREE.Vector3(x, LITTER_LEVEL - 0.017 + next() * 0.003, z),
        rotation,
        new THREE.Vector3(size, size * 0.7, size),
      );
      mesh.current.setMatrixAt(i, matrix);
      mesh.current.setColorAt(i, color.set(GRANULES[Math.floor(next() * GRANULES.length)]));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) {
      mesh.current.instanceColor.needsUpdate = true;
    }
  }, [geometry]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} receiveShadow>
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

/** The plastic tray, its rim and the litter the discard pile rests on. */
export function LitterBox() {
  const walls = useMemo(() => {
    const geometry = ringGeometry(BOX_WIDTH, BOX_DEPTH, BOX_INNER_WIDTH, BOX_INNER_DEPTH, WALL_HEIGHT, 0.12);
    carveEntry(geometry);
    return geometry;
  }, []);
  const lip = useMemo(() => {
    // A thin, slightly wider band along the top edge, dipping at the entry like the walls.
    const geometry = ringGeometry(
      BOX_WIDTH + 0.016,
      BOX_DEPTH + 0.016,
      BOX_INNER_WIDTH - 0.004,
      BOX_INNER_DEPTH - 0.004,
      0.014,
      0.125,
    );
    geometry.translate(0, WALL_HEIGHT - 0.01, 0);
    carveEntry(geometry);
    return geometry;
  }, []);
  const floor = useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(roundedRect(BOX_WIDTH, BOX_DEPTH, 0.12) as THREE.Shape, {
      depth: 0.02,
      bevelEnabled: false,
      curveSegments: 8,
    });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  const litter = useMemo(() => {
    const geometry = new THREE.ShapeGeometry(roundedRect(BOX_INNER_WIDTH, BOX_INNER_DEPTH, 0.07) as THREE.Shape, 8);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  useLayoutEffect(
    () => () => {
      walls.dispose();
      lip.dispose();
      floor.dispose();
      litter.dispose();
    },
    [walls, lip, floor, litter],
  );

  return (
    <group>
      <mesh geometry={floor} castShadow receiveShadow>
        <meshStandardMaterial color={PLASTIC} roughness={0.45} />
      </mesh>
      <mesh geometry={walls} castShadow receiveShadow>
        <meshStandardMaterial color={PLASTIC} roughness={0.42} metalness={0.02} />
      </mesh>
      {/* A lighter lip around the top edge catches the light like moulded plastic. */}
      <mesh geometry={lip} castShadow>
        <meshStandardMaterial color={PLASTIC_RIM} roughness={0.35} />
      </mesh>
      <mesh geometry={litter} position={[0, LITTER_LEVEL - 0.016, 0]} receiveShadow>
        <meshStandardMaterial color={LITTER} roughness={1} />
      </mesh>
      <Granules />
    </group>
  );
}
