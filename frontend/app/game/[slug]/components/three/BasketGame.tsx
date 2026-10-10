"use client";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { RotateCcw } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { plushTexture, sisalTexture, wickerTexture } from "./fabric";
import { FLOOR_Y } from "./tableLayout";
import { frameStep } from "./frames";
import { playSound } from "../sounds";
import {
  BASKET,
  PEG_OFFSET,
  POM_RADIUS,
  POST,
  SLING_CENTER,
  aimAt,
  createBall,
  grab,
  isMoving,
  release,
  resetBall,
  stepBall,
} from "./basketPhysics";

/** On the floor by the right side of the bed, where the HUD never covers it. */
const POSITION = new THREE.Vector3(7.05, FLOOR_Y, -2.8);
/**
 * The pointer travels twice as far as the pom-pom is pulled, so a small toy at
 * the edge of the screen can still be aimed with some care.
 */
const PULL_PER_POINTER = 0.5;
const PEG_HEIGHT = SLING_CENTER.y + 0.01;
const PEG_TOPS = [-1, 1].map((side) => new THREE.Vector3(SLING_CENTER.x, PEG_HEIGHT, side * PEG_OFFSET));
/** Knocks quieter than this make no sound. */
const QUIETEST_KNOCK = 1;
/** How long a pom-pom takes to pop back into the slingshot. */
const POP_IN = 0.25;

const UP = new THREE.Vector3(0, 1, 0);
const scratch = new THREE.Vector3();

/** Stretches a unit-tall cylinder from `from` to `to`. */
function spanBetween(object: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  scratch.subVectors(to, from);
  const length = scratch.length();
  object.position.copy(from).addScaledVector(scratch, 0.5);
  object.scale.set(1, Math.max(length, 1e-3), 1);
  object.quaternion.setFromUnitVectors(UP, length > 1e-6 ? scratch.normalize() : UP);
}

const CONFETTI_COUNT = 90;
const CONFETTI_COLORS = ["#e3a94b", "#e5624f", "#6fd3b0", "#7cc4e8", "#f6efe2", "#ff9ad5"];
const CONFETTI_GRAVITY = 6;
/** Paper flutters, so it slows down quickly. */
const CONFETTI_DRAG = 1.8;

type Flake = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Quaternion;
  spinAxis: THREE.Vector3;
  spinRate: number;
  age: number;
  life: number;
};

/** One flake of a burst, thrown up and out from `origin`. */
function throwFlake(origin: THREE.Vector3): Flake {
  const angle = Math.random() * Math.PI * 2;
  const outwards = 0.4 + Math.random() * 1.6;
  return {
    position: origin.clone(),
    velocity: new THREE.Vector3(Math.cos(angle) * outwards, 3 + Math.random() * 2.5, Math.sin(angle) * outwards),
    rotation: new THREE.Quaternion().random(),
    spinAxis: new THREE.Vector3().randomDirection(),
    spinRate: 6 + Math.random() * 10,
    age: 0,
    life: 1.8 + Math.random() * 0.9,
  };
}

/** A burst of paper confetti from `origin`, fired each time `bursts` goes up. */
function Confetti({ bursts, origin }: { bursts: number; origin: THREE.Vector3 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const flakes = useRef<Flake[]>([]);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) {
      return;
    }
    const color = new THREE.Color();
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      instances.setColorAt(i, color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
    }
    instances.instanceColor!.needsUpdate = true;
    instances.count = 0;
  }, []);

  // Bursts are fired from the frame loop, which owns the flakes; this only wakes it up.
  const fired = useRef(0);
  useEffect(() => {
    if (bursts > 0) {
      invalidate();
    }
  }, [bursts, invalidate]);

  const matrix = useRef(new THREE.Matrix4());
  const spin = useRef(new THREE.Quaternion());
  const size = useRef(new THREE.Vector3());
  useFrame((state, delta) => {
    const instances = mesh.current;
    if (!instances) {
      return;
    }
    if (fired.current < bursts) {
      fired.current = bursts;
      flakes.current = Array.from({ length: CONFETTI_COUNT }, () => throwFlake(origin));
    }
    if (flakes.current.length === 0) {
      return;
    }
    const step = frameStep(delta);
    let shown = 0;
    for (const flake of flakes.current) {
      flake.age += step;
      if (flake.age >= flake.life) {
        continue;
      }
      flake.velocity.y -= CONFETTI_GRAVITY * step;
      flake.velocity.multiplyScalar(Math.exp(-CONFETTI_DRAG * step));
      flake.position.addScaledVector(flake.velocity, step);
      if (flake.position.y < 0.01) {
        // Settled on the floor.
        flake.position.y = 0.01;
        flake.velocity.set(0, 0, 0);
      } else {
        flake.rotation.multiply(spin.current.setFromAxisAngle(flake.spinAxis, flake.spinRate * step));
      }
      // Shrinks away over its last half second.
      const scale = Math.min(1, (flake.life - flake.age) / 0.5);
      matrix.current.compose(flake.position, flake.rotation, size.current.setScalar(scale));
      instances.setMatrixAt(shown++, matrix.current);
    }
    instances.count = shown;
    instances.instanceMatrix.needsUpdate = true;
    if (shown > 0) {
      state.invalidate();
    } else {
      flakes.current = [];
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CONFETTI_COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.05, 0.03]} />
      <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

const CONFETTI_ORIGIN = new THREE.Vector3(0, BASKET.top, 0);

/**
 * A scratching post with a basket on top, and a slingshot beside it holding a
 * pom-pom. Pull the pom-pom back and let go to lob it at the basket; a basket
 * sets off confetti, and a miss rolls back to the slingshot by itself.
 */
export default function BasketGame() {
  const frame = useRef<THREE.Group>(null);
  const pom = useRef<THREE.Group>(null);
  const cords = useRef<(THREE.Mesh | null)[]>([]);
  const ball = useRef(createBall());
  /** Where on the shot's plane the pointer grabbed the pom-pom. */
  const grabbedAt = useRef<THREE.Vector3 | null>(null);
  const plane = useRef(new THREE.Plane());
  const popIn = useRef(POP_IN);
  const lastKnock = useRef(0);
  const [scored, setScored] = useState(false);
  const [bursts, setBursts] = useState(0);
  const invalidate = useThree((state) => state.invalidate);
  const plush = plushTexture();

  const place = useCallback(() => {
    const { phase, position, rotation } = ball.current;
    if (pom.current) {
      pom.current.position.copy(position);
      pom.current.quaternion.copy(rotation);
      // Eases out with a little overshoot as it pops back into the slingshot.
      const t = Math.min(popIn.current / POP_IN, 1);
      const back = 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
      pom.current.scale.setScalar(Math.max(back, 0.001));
    }
    // The elastic holds the pom-pom until it flies; then it snaps back straight between the pegs.
    const held = phase === "ready" || phase === "aiming" || phase === "launching";
    cords.current.forEach((cord, i) => cord && spanBetween(cord, PEG_TOPS[i], held ? position : SLING_CENTER));
  }, []);

  // Placed here rather than through props, so a re-render never yanks it back mid-flight.
  useLayoutEffect(place, [place]);

  const putBack = useCallback(() => {
    resetBall(ball.current);
    popIn.current = 0;
    setScored(false);
    invalidate();
  }, [invalidate]);

  useFrame((state, delta) => {
    const step = frameStep(delta);
    const popping = popIn.current < POP_IN;
    if (!isMoving(ball.current) && !popping) {
      return;
    }
    popIn.current = Math.min(popIn.current + step, POP_IN);
    const events = stepBall(ball.current, step);
    if (events.impact > QUIETEST_KNOCK && state.clock.elapsedTime - lastKnock.current > 0.1) {
      lastKnock.current = state.clock.elapsedTime;
      playSound("ball", events.impact / 6);
    }
    if (events.scored) {
      playSound("confetti");
      setBursts((count) => count + 1);
      setScored(true);
    }
    if (events.returned) {
      popIn.current = 0;
    }
    place();
    state.invalidate();
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (ball.current.phase !== "ready") {
      // Fetches a pom-pom that's on its way, or already in the basket.
      if (ball.current.phase !== "aiming") {
        putBack();
      }
      return;
    }
    if (!frame.current) {
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    // Pulled across the shot's own plane, which faces the camera well enough to aim on.
    plane.current.set(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(frame.current.matrixWorld);
    const hit = e.ray.intersectPlane(plane.current, new THREE.Vector3());
    grabbedAt.current = hit ? frame.current.worldToLocal(hit) : SLING_CENTER.clone();
    grab(ball.current);
    document.body.style.cursor = "grabbing";
    invalidate();
  };
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (ball.current.phase !== "aiming" || !grabbedAt.current || !frame.current) {
      return;
    }
    e.stopPropagation();
    const hit = e.ray.intersectPlane(plane.current, new THREE.Vector3());
    if (hit) {
      const pull = frame.current.worldToLocal(hit).sub(grabbedAt.current).multiplyScalar(PULL_PER_POINTER);
      aimAt(ball.current, pull.add(SLING_CENTER));
      invalidate();
    }
  };
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (ball.current.phase !== "aiming") {
      return;
    }
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    grabbedAt.current = null;
    if (release(ball.current)) {
      playSound("thud");
    }
    document.body.style.cursor = "grab";
    invalidate();
  };

  return (
    <group ref={frame} position={POSITION}>
      <mesh position={[0, POST.base.top / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[POST.base.outer, POST.base.outer, POST.base.top, 40]} />
        <meshPhysicalMaterial color="#c79d74" map={plush} roughness={0.95} sheen={1} sheenColor="#fff0d8" />
      </mesh>
      <mesh position={[0, (POST.column.bottom + POST.column.top) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[POST.column.outer, POST.column.outer, POST.column.top - POST.column.bottom, 28, 1, true]}
        />
        <meshStandardMaterial map={sisalTexture()} roughness={1} />
      </mesh>
      <mesh position={[0, (POST.top.bottom + POST.top.top) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[POST.top.outer, POST.top.outer, POST.top.top - POST.top.bottom, 40]} />
        <meshPhysicalMaterial color="#c79d74" map={plush} roughness={0.95} sheen={1} sheenColor="#fff0d8" />
      </mesh>

      {/* The basket: a woven wall with a rolled rim, standing on the post's top. */}
      <mesh position={[0, (BASKET.bottom + BASKET.top) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[
            (BASKET.inner + BASKET.outer) / 2,
            (BASKET.inner + BASKET.outer) / 2 - 0.01,
            BASKET.top - BASKET.bottom,
            32,
            1,
            true,
          ]}
        />
        <meshStandardMaterial map={wickerTexture()} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, BASKET.top, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[(BASKET.inner + BASKET.outer) / 2, (BASKET.outer - BASKET.inner) / 2 + 0.004, 8, 40]} />
        <meshStandardMaterial color="#8a5a2e" roughness={0.85} />
      </mesh>

      {/* The slingshot: two wooden pegs with an elastic cord from each to the pom-pom. */}
      {PEG_TOPS.map((top, i) => (
        <group key={i}>
          <mesh position={[top.x, PEG_HEIGHT / 2, top.z]} castShadow>
            <cylinderGeometry args={[0.022, 0.026, PEG_HEIGHT, 10]} />
            <meshStandardMaterial color="#9a6a3c" roughness={0.7} />
          </mesh>
          <mesh position={top} castShadow>
            <sphereGeometry args={[0.032, 12, 8]} />
            <meshStandardMaterial color="#7a4f2a" roughness={0.6} />
          </mesh>
          <mesh ref={(mesh) => void (cords.current[i] = mesh)}>
            <cylinderGeometry args={[0.009, 0.009, 1, 6]} />
            <meshStandardMaterial color="#d8574a" roughness={0.6} />
          </mesh>
        </group>
      ))}

      <group ref={pom}>
        <mesh castShadow>
          <icosahedronGeometry args={[POM_RADIUS, 2]} />
          <meshPhysicalMaterial color="#e2685a" map={plush} roughness={1} sheen={1} sheenColor="#ffc6b8" />
        </mesh>
        {/* A bigger, invisible target, since the pom-pom is only a few pixels across. */}
        <mesh
          visible={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (ball.current.phase !== "aiming") {
              document.body.style.cursor = ball.current.phase === "ready" ? "grab" : "pointer";
            }
          }}
          onPointerOut={() => {
            if (ball.current.phase !== "aiming") {
              document.body.style.cursor = "";
            }
          }}
        >
          <sphereGeometry args={[POM_RADIUS * 2.4, 12, 8]} />
        </mesh>
      </group>

      <Confetti bursts={bursts} origin={CONFETTI_ORIGIN} />
      {scored && (
        // Kept below the game's dialogs, which sit higher up the page.
        <Html position={[0, BASKET.top + 0.45, 0]} center zIndexRange={[5, 0]}>
          <div className="flex flex-col items-center gap-1.5 animate-fade-in">
            <span className="rounded-full bg-felt-950/80 px-2.5 py-0.5 font-display text-sm font-semibold whitespace-nowrap text-brass">
              Nice shot!
            </span>
            <Button variant="secondary" size="sm" onClick={putBack}>
              <RotateCcw className="h-3.5 w-3.5" />
              Play again
            </Button>
          </div>
        </Html>
      )}
    </group>
  );
}
