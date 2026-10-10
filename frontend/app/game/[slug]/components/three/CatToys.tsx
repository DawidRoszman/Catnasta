"use client";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { cardboardTexture, plushTexture, seeded, sisalTexture, yarnTexture } from "./fabric";
import { FLOOR_Y } from "./tableLayout";
import { frameStep } from "./frames";
import { playSound, type SoundName } from "../sounds";

/*
 * Decorations only: every toy sits where no card is ever laid out, in the back
 * corners of the cushion or on the floor behind the bed. None of them move on
 * their own (the ball and the mouse play a short animation when clicked, and the
 * pom-pom swings only after it is pushed or dragged), so they cost nothing between frames.
 */

/**
 * A short animation that plays each time `start` is called. `pose` sets the object
 * up for `t` seconds in, and must leave it at rest when `t` reaches `duration`.
 */
function useClickAnimation<T extends THREE.Object3D>(duration: number, pose: (object: T, t: number) => void) {
  const ref = useRef<T>(null);
  const elapsed = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useFrame((state, delta) => {
    if (elapsed.current === null || !ref.current) {
      return;
    }
    elapsed.current = Math.min(elapsed.current + frameStep(delta), duration);
    pose(ref.current, elapsed.current);
    if (elapsed.current < duration) {
      state.invalidate();
    } else {
      elapsed.current = null;
    }
  });
  const start = useCallback(() => {
    elapsed.current = 0;
    invalidate();
  }, [invalidate]);
  return [ref, start] as const;
}

/** Rises from 0 to 1 and back over `width` seconds either side of `at`. */
const bump = (t: number, at: number, width: number) => Math.max(0, 1 - Math.abs(t - at) / width);

/** Pointer handlers for a toy that plays a sound and an animation when clicked. */
function soundOnClick(sound: SoundName, animate: () => void) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      playSound(sound);
      animate();
    },
  };
}

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

/** A ball of yarn with a loose strand wandering off along the cushion. It bounces when clicked. */
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
  // A high hop and a small one, squashing a little each time it lands.
  const [ball, bounce] = useClickAnimation<THREE.Group>(0.72, (object, t) => {
    const hop = (from: number, to: number, height: number) => {
      const u = (t - from) / (to - from);
      return u > 0 && u < 1 ? 4 * height * u * (1 - u) : 0;
    };
    const squash = 0.1 * bump(t, 0, 0.05) + 0.22 * bump(t, 0.42, 0.07) + 0.1 * bump(t, 0.62, 0.06);
    object.scale.set(1 + squash / 2, 1 - squash, 1 + squash / 2);
    // Squashing about its centre would lift the ball off the cushion, so it sinks to match.
    object.position.y = hop(0, 0.42, 0.45) + hop(0.42, 0.62, 0.1) - radius * squash;
  });
  return (
    <group position={[-4.95, radius, -3.0]} {...soundOnClick("ball", bounce)}>
      {/* The squash runs along this group's upright axis, not the ball's tilted one. */}
      <group ref={ball}>
        <mesh castShadow receiveShadow rotation={[0.4, 0.3, 0.2]}>
          <sphereGeometry args={[radius, 32, 24]} />
          <meshStandardMaterial map={yarnTexture()} roughness={0.9} />
        </mesh>
      </group>
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
  // Squeezed flat, then springing back with a wobble that dies away. It stands on
  // the cushion at y = 0, so scaling the whole mouse keeps its feet in place.
  const [mouse, squeeze] = useClickAnimation<THREE.Group>(0.6, (object, t) => {
    const press = 0.08;
    const squash =
      t < press ? 0.35 * (t / press) : t < 0.6 ? 0.35 * Math.exp(-(t - press) * 9) * Math.cos((t - press) * 28) : 0;
    object.scale.set(1 + squash / 2, 1 - squash, 1 + squash / 2);
  });
  return (
    <group ref={mouse} position={[5.05, 0, -3.1]} rotation={[0, -2.3, 0]} {...soundOnClick("squeak", squeeze)}>
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

const POST_HEIGHT = 1.4;
/** The plush base the post stands on is this thick. */
const POST_BASE = 0.14;
const POST_RADIUS = 0.24;
/** Half the width of the square plush top, and the height of its underside. */
const POST_TOP_HALF = 0.475;
const POST_TOP_UNDERSIDE = POST_BASE + POST_HEIGHT;

const POM_RADIUS = 0.1;
const STRING_LENGTH = 0.6;
/** Where the string is tied, under the post's top. */
const POM_ANCHOR = new THREE.Vector3(0.4, POST_HEIGHT + 0.02, 0);
const POM_REST = POM_ANCHOR.clone().setY(POM_ANCHOR.y - STRING_LENGTH);
/** In table units per second squared; a little floaty, so a swing is easy to follow. */
const GRAVITY = 20;
const AIR_DRAG = 1.4;
/** Fastest the pom-pom can be thrown, so a quick flick doesn't send it spinning over the top. */
const MAX_THROW = 8;
/** A click without a drag gives it this push. */
const NUDGE = new THREE.Vector3(0, 0, 2.5);
const UP = new THREE.Vector3(0, 1, 0);

const scratch = new THREE.Vector3();

/** Keeps the pom-pom on its string and out of the post and its top. */
function keepClear(position: THREE.Vector3) {
  for (let pass = 0; pass < 2; pass++) {
    scratch.subVectors(position, POM_ANCHOR);
    if (scratch.length() > STRING_LENGTH) {
      position.copy(POM_ANCHOR).addScaledVector(scratch.normalize(), STRING_LENGTH);
    }
    const fromPost = Math.hypot(position.x, position.z);
    const clear = POST_RADIUS + POM_RADIUS;
    if (fromPost < clear) {
      if (fromPost < 1e-6) {
        position.x = clear;
      } else {
        position.x *= clear / fromPost;
        position.z *= clear / fromPost;
      }
    }
    const reach = POST_TOP_HALF + POM_RADIUS;
    if (Math.abs(position.x) < reach && Math.abs(position.z) < reach) {
      position.y = Math.min(position.y, POST_TOP_UNDERSIDE - POM_RADIUS);
    }
  }
}

/** Puts the pom-pom at `position`, with its string running straight up to the anchor. */
function placePomPom(pom: THREE.Object3D, string: THREE.Object3D, position: THREE.Vector3) {
  pom.position.copy(position);
  scratch.subVectors(position, POM_ANCHOR);
  const length = scratch.length();
  string.position.copy(POM_ANCHOR).addScaledVector(scratch, 0.5);
  string.scale.set(1, Math.max(length, 1e-3), 1);
  string.quaternion.setFromUnitVectors(UP, length > 1e-6 ? scratch.normalize() : UP);
}

type PomPomState = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Simulating; it falls asleep again once it hangs still. */
  awake: boolean;
  drag: { plane: THREE.Plane; target: THREE.Vector3; moved: boolean } | null;
};

/**
 * A pom-pom on a string under the post's top. Drag it about and let go, or click it
 * for a push: it swings on its string, knocking against the post, until it hangs still.
 * Positions are in the post's own frame.
 */
function PomPom() {
  const frame = useRef<THREE.Group>(null);
  const pom = useRef<THREE.Mesh>(null);
  const string = useRef<THREE.Mesh>(null);
  const state = useRef<PomPomState>({
    position: POM_REST.clone(),
    velocity: new THREE.Vector3(),
    awake: false,
    drag: null,
  });
  const invalidate = useThree((three) => three.invalidate);
  const plush = plushTexture();

  // Placed here rather than through props, so a re-render never yanks it back mid-swing.
  useLayoutEffect(() => {
    if (pom.current && string.current) {
      placePomPom(pom.current, string.current, state.current.position);
    }
  }, []);

  useFrame((three, delta) => {
    const sim = state.current;
    if (!sim.awake || !pom.current || !string.current) {
      return;
    }
    const steps = 4;
    const step = frameStep(delta) / steps;
    if (step <= 0) {
      three.invalidate();
      return;
    }
    const { position, velocity } = sim;
    const previous = new THREE.Vector3();
    for (let i = 0; i < steps; i++) {
      previous.copy(position);
      if (sim.drag) {
        // Follows the pointer closely but not rigidly, so a throw keeps its speed.
        position.lerp(sim.drag.target, 1 - Math.exp(-40 * step));
      } else {
        velocity.y -= GRAVITY * step;
        velocity.multiplyScalar(Math.exp(-AIR_DRAG * step));
        position.addScaledVector(velocity, step);
      }
      keepClear(position);
      // The velocity is whatever the constraints let it move, so bumps take speed off it.
      velocity.subVectors(position, previous).divideScalar(step);
    }
    velocity.clampLength(0, MAX_THROW);
    if (!sim.drag && velocity.length() < 0.03 && position.distanceTo(POM_REST) < 0.004) {
      position.copy(POM_REST);
      velocity.set(0, 0, 0);
      sim.awake = false;
    } else {
      three.invalidate();
    }
    placePomPom(pom.current, string.current, position);
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!frame.current) {
      return;
    }
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const sim = state.current;
    // Dragged across a plane facing the camera, through where the pom-pom is now.
    const normal = e.camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, frame.current.localToWorld(sim.position.clone()));
    sim.drag = { plane, target: sim.position.clone(), moved: false };
    sim.awake = true;
    document.body.style.cursor = "grabbing";
    invalidate();
  };
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const drag = state.current.drag;
    if (!drag || !frame.current) {
      return;
    }
    e.stopPropagation();
    const hit = new THREE.Vector3();
    if (e.ray.intersectPlane(drag.plane, hit)) {
      drag.target.copy(frame.current.worldToLocal(hit));
      keepClear(drag.target);
      drag.moved = true;
      invalidate();
    }
  };
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const sim = state.current;
    if (!sim.drag) {
      return;
    }
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    if (!sim.drag.moved) {
      sim.velocity.add(NUDGE);
    }
    sim.drag = null;
    document.body.style.cursor = "grab";
    invalidate();
  };

  return (
    <group ref={frame}>
      <mesh ref={string}>
        <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
        <meshStandardMaterial color="#e9dcc3" roughness={0.9} />
      </mesh>
      <mesh
        ref={pom}
        castShadow
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!state.current.drag) {
            document.body.style.cursor = "grab";
          }
        }}
        onPointerOut={() => {
          if (!state.current.drag) {
            document.body.style.cursor = "";
          }
        }}
      >
        <icosahedronGeometry args={[POM_RADIUS, 2]} />
        <meshPhysicalMaterial color="#e2685a" map={plush} roughness={1} sheen={1} sheenColor="#ffc6b8" />
      </mesh>
    </group>
  );
}

/** A sisal scratching post on a plush base, with a pom-pom dangling from its top. */
function ScratchingPost() {
  const plush = plushTexture();
  return (
    <group position={[7.3, FLOOR_Y, -4.3]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, POST_BASE / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, POST_BASE, 1.25]} />
        <meshPhysicalMaterial color="#c79d74" map={plush} roughness={0.95} sheen={1} sheenColor="#fff0d8" />
      </mesh>
      <mesh position={[0, POST_BASE + POST_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, POST_HEIGHT, 28, 1, true]} />
        <meshStandardMaterial map={sisalTexture()} roughness={1} />
      </mesh>
      <mesh position={[0, POST_TOP_UNDERSIDE + 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[POST_TOP_HALF * 2, 0.12, POST_TOP_HALF * 2]} />
        <meshPhysicalMaterial color="#c79d74" map={plush} roughness={0.95} sheen={1} sheenColor="#fff0d8" />
      </mesh>
      <PomPom />
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
