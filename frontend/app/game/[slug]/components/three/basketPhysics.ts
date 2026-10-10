import * as THREE from "three";

/*
 * The scratching post's basket game: the pom-pom sits in a slingshot beside the
 * post, is pulled back and let go, and has to land in the basket on the post's
 * top. Everything here is in the post's own frame: the post stands on the floor
 * at the origin, x runs across the screen and y is up. Shots stay in the z = 0
 * plane unless something knocks them out of it.
 */

export const POM_RADIUS = 0.1;
/** In table units per second squared; a little floaty, so a shot is easy to follow. */
const GRAVITY = 12;
const AIR_DRAG = 0.15;

/** Where the pom-pom sits in the slingshot, between the tops of its two pegs. */
export const SLING_CENTER = new THREE.Vector3(0.8, 0.55, 0);
/** The pegs stand this far either side of the shot's plane. */
export const PEG_OFFSET = 0.17;
/** How far the pom-pom can be pulled back; it can never be carried towards the basket. */
export const MAX_PULL = 0.45;
/** A shorter pull than this is taken as a fumble, and the pom-pom just drops back. */
const MIN_PULL = 0.08;
/** The elastic's pull per unit of stretch; a full pull lets go at MAX_PULL * sqrt of this. */
const SLING_STIFFNESS = 480;

/** A solid of revolution round the post's axis: a disc, a column, or a ring when `inner` > 0. */
type Cylinder = { inner: number; outer: number; bottom: number; top: number; bounce: number };

export const POST = {
  base: { inner: 0, outer: 0.42, bottom: 0, top: 0.14, bounce: 0.3 },
  column: { inner: 0, outer: 0.2, bottom: 0.14, top: 1.29, bounce: 0.35 },
  top: { inner: 0, outer: 0.36, bottom: 1.29, top: 1.41, bounce: 0.3 },
} satisfies Record<string, Cylinder>;

/** A wicker basket standing on the post's top; its floor is the top itself. */
export const BASKET: Cylinder = { inner: 0.22, outer: 0.25, bottom: POST.top.top, top: POST.top.top + 0.16, bounce: 0.45 };

/** The cat bed's bolster, as seen from the post: a plush ridge running along z. */
const BOLSTER = { x: -1.03, y: 0.48, halfWidth: 0.6, halfHeight: 0.48 };
/** Past the bolster lies the bed's cushion. */
const CUSHION = { x: -1.45, y: 0.28 };
const GROUND_BOUNCE = 0.35;
/** Slows the pom-pom while it rolls along the ground, so a miss soon comes to rest. */
const ROLLING_DRAG = 2.5;

/** Settled in the basket this long, it counts. */
const SCORE_AFTER = 0.25;
/** Lying still this long after a miss, it hops back into the slingshot. */
const RETURN_AFTER = 0.8;
/** However a miss plays out, the pom-pom comes back after this long. */
const LONGEST_FLIGHT = 6;

export type BasketPhase =
  /** Sitting in the slingshot, waiting to be pulled. */
  | "ready"
  | "aiming"
  /** Let go, and still being pushed along by the elastic. */
  | "launching"
  /** Free of the slingshot, flying, bouncing or rolling. */
  | "flying"
  /** In the basket: it stays there until the game is reset. */
  | "scored";

export type BasketBall = {
  phase: BasketPhase;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** How the pom-pom has turned, so it visibly rolls. */
  rotation: THREE.Quaternion;
  spin: THREE.Vector3;
  /** While aiming, where the pointer is pulling it to. */
  target: THREE.Vector3;
  /** The way it was pulled, so the elastic lets go of it once it passes the pegs. */
  pull: THREE.Vector3;
  inBasketFor: number;
  stillFor: number;
  flightTime: number;
};

/** What happened during a step, for sounds and effects. */
export type StepEvents = {
  /** Fastest speed it hit something at, or 0. */
  impact: number;
  scored: boolean;
  /** Came back to the slingshot after a miss. */
  returned: boolean;
};

export function createBall(): BasketBall {
  return {
    phase: "ready",
    position: SLING_CENTER.clone(),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    spin: new THREE.Vector3(),
    target: SLING_CENTER.clone(),
    pull: new THREE.Vector3(),
    inBasketFor: 0,
    stillFor: 0,
    flightTime: 0,
  };
}

/** Puts the pom-pom back in the slingshot. */
export function resetBall(ball: BasketBall) {
  Object.assign(ball, createBall(), { rotation: ball.rotation });
}

/** Starts a pull, from wherever the pom-pom sits in the slingshot. */
export function grab(ball: BasketBall) {
  ball.phase = "aiming";
  ball.velocity.set(0, 0, 0);
  ball.target.copy(ball.position);
}

/** Pulls towards `point`, held within the slingshot's reach and clear of everything solid. */
export function aimAt(ball: BasketBall, point: THREE.Vector3) {
  const target = ball.target;
  target.subVectors(point, SLING_CENTER).setZ(0).clampLength(0, MAX_PULL).add(SLING_CENTER);
  for (const solid of [POST.base, POST.column, POST.top, BASKET]) {
    pushOut(target, null, solid);
  }
  target.y = Math.max(target.y, groundHeight(target.x) + POM_RADIUS);
}

/** Lets go: a proper pull launches the pom-pom, a short one drops it back into place. */
export function release(ball: BasketBall): boolean {
  ball.pull.subVectors(ball.position, SLING_CENTER);
  if (ball.pull.length() < MIN_PULL) {
    ball.phase = "ready";
    return false;
  }
  ball.pull.normalize();
  ball.phase = "launching";
  ball.velocity.set(0, 0, 0);
  return true;
}

/** Whether the pom-pom's centre is inside the basket, below its rim. */
export function inBasket(position: THREE.Vector3) {
  return (
    Math.hypot(position.x, position.z) < BASKET.inner && position.y > BASKET.bottom && position.y < BASKET.top
  );
}

/** Whether the pom-pom has anything left to do; the scene stops drawing when it hasn't. */
export function isMoving(ball: BasketBall) {
  switch (ball.phase) {
    case "ready":
      return ball.position.distanceToSquared(SLING_CENTER) > 1e-8;
    case "scored":
      return ball.velocity.lengthSq() > 1e-4;
    default:
      return true;
  }
}

/** Height of the ground under `x`: the floor, rising over the bolster to the cushion. */
function groundHeight(x: number) {
  let height = 0;
  const across = (x - BOLSTER.x) / BOLSTER.halfWidth;
  if (Math.abs(across) < 1) {
    height = BOLSTER.y + BOLSTER.halfHeight * Math.sqrt(1 - across * across);
  }
  if (x < CUSHION.x) {
    height = Math.max(height, CUSHION.y);
  }
  return height;
}

const normal = new THREE.Vector3();

/** Bounces `velocity` off a surface with the given outward `normal`; returns the speed it hit at. */
function bounceOff(velocity: THREE.Vector3, surface: THREE.Vector3, bounce: number) {
  const into = velocity.dot(surface);
  if (into >= 0) {
    return 0;
  }
  // Scuffs a little speed off along the surface too.
  velocity.addScaledVector(surface, -into).multiplyScalar(0.92).addScaledVector(surface, -into * bounce);
  return -into;
}

/**
 * Moves a pom-pom at `position` out of a solid round the post's axis, bouncing
 * `velocity` (when given) off it. Returns the speed it hit at, or 0.
 */
function pushOut(position: THREE.Vector3, velocity: THREE.Vector3 | null, solid: Cylinder) {
  const across = Math.hypot(position.x, position.z);
  // The nearest point of the solid, in its cross-section of (distance from axis, height).
  const nearestAcross = THREE.MathUtils.clamp(across, solid.inner, solid.outer);
  const nearestY = THREE.MathUtils.clamp(position.y, solid.bottom, solid.top);
  let outAcross = across - nearestAcross;
  let outY = position.y - nearestY;
  let gap = Math.hypot(outAcross, outY);
  if (gap >= POM_RADIUS) {
    return 0;
  }
  if (gap < 1e-6) {
    // The centre is inside the solid: leave by the nearest face.
    const faces: [number, number, number][] = [
      [solid.outer - across, 1, 0],
      [solid.top - position.y, 0, 1],
      [position.y - solid.bottom, 0, -1],
    ];
    if (solid.inner > 0) {
      faces.push([across - solid.inner, -1, 0]);
    }
    const [depth, a, y] = faces.reduce((best, face) => (face[0] < best[0] ? face : best));
    outAcross = a;
    outY = y;
    gap = -depth;
  } else {
    outAcross /= gap;
    outY /= gap;
  }
  const radial = across > 1e-6 ? [position.x / across, position.z / across] : [1, 0];
  normal.set(outAcross * radial[0], outY, outAcross * radial[1]);
  position.addScaledVector(normal, POM_RADIUS - gap);
  return velocity ? bounceOff(velocity, normal, solid.bounce) : 0;
}

/** Keeps the pom-pom on the ground; returns the speed it hit at, or -1 when it isn't touching. */
function landOnGround(position: THREE.Vector3, velocity: THREE.Vector3) {
  const height = groundHeight(position.x);
  if (position.y - POM_RADIUS > height + 1e-4) {
    return -1;
  }
  position.y = height + POM_RADIUS;
  const e = 0.01;
  const slope = (groundHeight(position.x + e) - groundHeight(position.x - e)) / (2 * e);
  normal.set(-slope, 1, 0).normalize();
  return bounceOff(velocity, normal, GROUND_BOUNCE);
}

const pullBack = new THREE.Vector3();
const axis = new THREE.Vector3();
const turn = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** Advances the game by `dt` seconds, in small steps so fast shots can't pass through the rim. */
export function stepBall(ball: BasketBall, dt: number): StepEvents {
  const events: StepEvents = { impact: 0, scored: false, returned: false };
  const steps = Math.max(1, Math.ceil(dt / (1 / 480)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    step(ball, h, events);
  }
  return events;
}

function step(ball: BasketBall, h: number, events: StepEvents) {
  const { position, velocity } = ball;
  switch (ball.phase) {
    case "ready":
      // Settles back between the pegs after a fumbled pull or a reset.
      position.lerp(SLING_CENTER, 1 - Math.exp(-18 * h));
      if (position.distanceToSquared(SLING_CENTER) < 1e-8) {
        position.copy(SLING_CENTER);
      }
      return;
    case "aiming":
      // Follows the pointer closely, but not rigidly, so the elastic visibly stretches.
      position.lerp(ball.target, 1 - Math.exp(-30 * h));
      return;
    case "launching":
      pullBack.subVectors(position, SLING_CENTER).multiplyScalar(-SLING_STIFFNESS);
      velocity.addScaledVector(pullBack, h);
      velocity.y -= GRAVITY * h;
      position.addScaledVector(velocity, h);
      // The elastic goes slack as the pom-pom passes the pegs, and it flies free.
      if (pullBack.subVectors(position, SLING_CENTER).dot(ball.pull) <= 0) {
        ball.phase = "flying";
        ball.flightTime = 0;
        // A little backspin off the elastic.
        ball.spin.crossVectors(velocity, UP).multiplyScalar(-1.5);
      }
      return;
  }

  velocity.y -= GRAVITY * h;
  velocity.multiplyScalar(Math.exp(-AIR_DRAG * h));
  position.addScaledVector(velocity, h);
  for (const solid of [POST.base, POST.column, POST.top, BASKET]) {
    events.impact = Math.max(events.impact, pushOut(position, velocity, solid));
  }
  const landed = landOnGround(position, velocity);
  const touching = landed >= 0 || (inBasket(position) && position.y <= BASKET.bottom + POM_RADIUS + 1e-3);
  events.impact = Math.max(events.impact, landed);
  if (touching) {
    // Rolls rather than slides.
    const drag = Math.exp(-ROLLING_DRAG * h);
    velocity.x *= drag;
    velocity.z *= drag;
    ball.spin.set(velocity.z, 0, -velocity.x).divideScalar(POM_RADIUS);
  }
  const angle = ball.spin.length() * h;
  if (angle > 1e-6) {
    ball.rotation.premultiply(turn.setFromAxisAngle(axis.copy(ball.spin).normalize(), angle));
  }

  if (ball.phase === "scored") {
    if (velocity.lengthSq() < 1e-4) {
      velocity.set(0, 0, 0);
    }
    return;
  }

  ball.flightTime += h;
  ball.inBasketFor = inBasket(position) ? ball.inBasketFor + h : 0;
  if (ball.inBasketFor >= SCORE_AFTER) {
    ball.phase = "scored";
    events.scored = true;
    return;
  }
  // Wherever it ends up, on the floor or perched on the rim, it comes back once it stops.
  ball.stillFor = velocity.length() < 0.08 ? ball.stillFor + h : 0;
  if (ball.stillFor >= RETURN_AFTER || ball.flightTime >= LONGEST_FLIGHT) {
    resetBall(ball);
    events.returned = true;
  }
}
