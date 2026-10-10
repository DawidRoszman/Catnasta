import * as THREE from "three";

/** Small seeded random generator, so textures and props look the same every load. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return { element, ctx: element.getContext("2d")! };
}

function toTexture(element: HTMLCanvasElement, repeat?: [number, number], color = true) {
  const texture = new THREE.CanvasTexture(element);
  if (color) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  texture.anisotropy = 4;
  return texture;
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, make: () => THREE.Texture) {
  let texture = cache.get(key);
  if (!texture) {
    texture = make();
    cache.set(key, texture);
  }
  return texture;
}

/** Soft plush pile: short fibres in light and shade, tiled. Used as a greyscale map and bump. */
export function plushTexture() {
  return cached("plush", () => {
    const size = 256;
    const { element, ctx } = canvas(size, size);
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, size, size);
    const random = seeded(11);
    for (let i = 0; i < 5200; i++) {
      const x = random() * size;
      const y = random() * size;
      const angle = random() * Math.PI * 2;
      const length = 2 + random() * 4;
      const shade = 170 + Math.floor(random() * 85);
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.55)`;
      ctx.lineWidth = 1;
      // Draw wrapped copies so the tile has no seams.
      for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + dx + Math.cos(angle) * length, y + dy + Math.sin(angle) * length);
        ctx.stroke();
      }
    }
    return toTexture(element, [1, 1], false);
  });
}

/** Sisal rope wound round a post: bands of twisted fibre. */
export function sisalTexture() {
  return cached("sisal", () => {
    const { element, ctx } = canvas(128, 256);
    const random = seeded(5);
    const bands = 16;
    const band = 256 / bands;
    for (let b = 0; b < bands; b++) {
      const y = b * band;
      const gradient = ctx.createLinearGradient(0, y, 0, y + band);
      gradient.addColorStop(0, "#7d6342");
      gradient.addColorStop(0.5, "#c9aa78");
      gradient.addColorStop(1, "#6e5639");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, 128, band);
      // The twist of the rope.
      ctx.strokeStyle = "rgba(90,66,40,0.55)";
      ctx.lineWidth = 1.5;
      for (let x = -band; x < 128; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, y + band);
        ctx.lineTo(x + band * 0.8, y);
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(240,220,180,${0.15 + random() * 0.2})`;
        ctx.fillRect(random() * 128, y + random() * band, 3, 1);
      }
    }
    return toTexture(element, [3, 6]);
  });
}

/** Corrugated cardboard seen from the top: tightly packed kraft ridges. */
export function cardboardTexture() {
  return cached("cardboard", () => {
    const { element, ctx } = canvas(256, 64);
    for (let x = 0; x < 256; x += 4) {
      ctx.fillStyle = (x / 4) % 2 === 0 ? "#b98d58" : "#8e6638";
      ctx.fillRect(x, 0, 4, 64);
    }
    const random = seeded(3);
    for (let i = 0; i < 60; i++) {
      // A few claw marks.
      ctx.strokeStyle = "rgba(70,45,20,0.35)";
      ctx.lineWidth = 1;
      const x = random() * 256;
      const y = random() * 64;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10 + random() * 14, y + (random() - 0.5) * 4);
      ctx.stroke();
    }
    return toTexture(element, [3, 1]);
  });
}

/** Woven wicker: rows of strands passing over and under upright stakes, tiled round a basket. */
export function wickerTexture() {
  return cached("wicker", () => {
    const { element, ctx } = canvas(128, 64);
    ctx.fillStyle = "#5e3a1c";
    ctx.fillRect(0, 0, 128, 64);
    const random = seeded(29);
    const rows = 8;
    const stakes = 8;
    const rowHeight = 64 / rows;
    const stakeWidth = 128 / stakes;
    for (let row = 0; row < rows; row++) {
      for (let stake = 0; stake < stakes; stake++) {
        // Each strand shows where it passes over a stake, alternating row by row.
        if ((row + stake) % 2 === 1) {
          continue;
        }
        const x = stake * stakeWidth;
        const y = row * rowHeight;
        const shade = 150 + Math.floor(random() * 40);
        const gradient = ctx.createLinearGradient(0, y, 0, y + rowHeight);
        gradient.addColorStop(0, `rgb(${shade + 40},${shade}, ${shade - 70})`);
        gradient.addColorStop(1, `rgb(${shade - 30},${shade - 70},${shade - 120})`);
        ctx.fillStyle = gradient;
        // Drawn again a tile over, so strands crossing the edge wrap round without a seam.
        for (const dx of [-128, 0, 128]) {
          ctx.beginPath();
          ctx.roundRect(x - stakeWidth * 0.55 + dx, y + 1, stakeWidth * 2.1, rowHeight - 2, rowHeight / 2);
          ctx.fill();
        }
      }
    }
    return toTexture(element, [5, 1]);
  });
}

/** A ball of yarn: many wraps crossing each other. */
export function yarnTexture() {
  return cached("yarn", () => {
    const { element, ctx } = canvas(256, 256);
    ctx.fillStyle = "#b8473f";
    ctx.fillRect(0, 0, 256, 256);
    const random = seeded(17);
    for (let i = 0; i < 90; i++) {
      const y = random() * 256;
      const amplitude = 10 + random() * 30;
      const phase = random() * Math.PI * 2;
      const tilt = (random() - 0.5) * 1.2;
      ctx.strokeStyle = random() > 0.5 ? "rgba(255,170,150,0.55)" : "rgba(110,25,25,0.5)";
      ctx.lineWidth = 2 + random() * 2;
      ctx.beginPath();
      for (let x = -10; x <= 266; x += 6) {
        const yy = y + Math.sin(x / 40 + phase) * amplitude + (x - 128) * tilt;
        if (x === -10) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    return toTexture(element);
  });
}

/** A round braided rug: concentric plaits in muted, warm colours. */
export function rugTexture() {
  return cached("rug", () => {
    const size = 1024;
    const { element, ctx } = canvas(size, size);
    const colors = ["#4a2f26", "#6b4535", "#5a3b30", "#7d5a42", "#3e2a24", "#665041"];
    const centre = size / 2;
    const ring = 14;
    for (let r = centre, k = 0; r > 0; r -= ring, k++) {
      ctx.fillStyle = colors[k % colors.length];
      ctx.beginPath();
      ctx.arc(centre, centre, r, 0, Math.PI * 2);
      ctx.fill();
      // Plait marks along the ring.
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 2;
      const steps = Math.max(8, Math.floor((2 * Math.PI * r) / 10));
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const inner = r - ring + 2;
        ctx.beginPath();
        ctx.moveTo(centre + Math.cos(a) * inner, centre + Math.sin(a) * inner);
        ctx.lineTo(centre + Math.cos(a + 0.03) * (r - 2), centre + Math.sin(a + 0.03) * (r - 2));
        ctx.stroke();
      }
    }
    // Darken towards the edge so the rug fades into the room.
    const fade = ctx.createRadialGradient(centre, centre, size * 0.2, centre, centre, size * 0.5);
    fade.addColorStop(0, "rgba(6,21,15,0)");
    fade.addColorStop(1, "rgba(6,21,15,0.85)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, size);
    return toTexture(element);
  });
}

type Section = {
  /** Sideways offset of the section's centre from the path, outwards. */
  out: number;
  /** Height of the section's centre. */
  y: number;
  /** Half-width and half-height of the elliptical section. */
  rw: number;
  rh: number;
};

/**
 * Sweeps an elliptical section along a closed path in the XZ plane, e.g. a
 * bolster round a bed. `section` can vary along the path (0..1).
 */
export function sweepGeometry(
  path: THREE.Vector2[],
  section: (point: THREE.Vector2, t: number) => Section,
  sides = 20,
  uRepeat = 1,
) {
  const n = path.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = path[i % n];
    const prev = path[(i - 1 + n) % n];
    const next = path[(i + 1) % n];
    const tangent = new THREE.Vector2().subVectors(next, prev).normalize();
    const normal = new THREE.Vector2(tangent.y, -tangent.x);
    if (normal.dot(p) < 0) {
      normal.negate();
    }
    const s = section(p, (i % n) / n);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const out = s.out + Math.cos(angle) * s.rw;
      positions.push(p.x + normal.x * out, s.y + Math.sin(angle) * s.rh, p.y + normal.y * out);
      uvs.push((i / n) * uRepeat, j / sides);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = (i + 1) * (sides + 1) + j;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Evenly spaced points round a rounded rectangle centred on the origin (x, z). */
export function roundedRectPath(halfW: number, halfD: number, radius: number, count: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfW + radius, -halfD);
  shape.lineTo(halfW - radius, -halfD);
  shape.absarc(halfW - radius, -halfD + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(halfW, halfD - radius);
  shape.absarc(halfW - radius, halfD - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(-halfW + radius, halfD);
  shape.absarc(-halfW + radius, halfD - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-halfW, -halfD + radius);
  shape.absarc(-halfW + radius, -halfD + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape.getSpacedPoints(count).slice(0, count);
}
