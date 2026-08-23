import * as THREE from "three";
import type { ScenePalette } from "../../palette";

/* A cloud deck the camera climbs through.
 *
 * This is the one place the sandbox breaks the site's register on purpose. The
 * rest of the scene is unlit panels and crisp outlines — a technical drawing —
 * and a technical drawing has no way to say "cloud". Anything with an edge
 * reads as a slab. So these are soft: camera-facing billboards over a radial
 * gradient generated at runtime, with no outline anywhere.
 *
 * Whether that soft element belongs next to the hard-edged bodywork is exactly
 * the question the lab exists to answer. It is easy to delete if the answer is
 * no.
 *
 * Sprites rather than points: a THREE.Points cloud is one draw call for the lot,
 * but point size is clamped by the GPU and a point the camera is inside of clips
 * to a hard square. The whole ask here is to fly through the deck, so the
 * cheaper option is the one that breaks precisely when it matters.
 *
 * The cost of that choice is one draw call per puff, and there are 220 of them.
 * It is paid only while the deck is on screen — `setStrength` drops the group's
 * visibility to false everywhere else, and a hidden group is not traversed.
 */

/** Vertical extent of the deck, in metres. The camera crosses this. */
/* Above the terrain, which tops out at 155m. The deck used to span 80-130m,
   which put the hills inside it — so from the apex the clouds were between the
   camera and the ground, and the ground could not be seen at all. */
export const CLOUD_BASE = 185;
export const CLOUD_TOP = 245;

/* How far the deck spreads horizontally, and how many puffs fill it.
 *
 * Sized against what is actually in frame rather than against the world. At the
 * apex the deck sits 117m below the camera, where the visible window is only
 * ~104m by 58m — so at the old 90 puffs over +-340m, about eight were in or
 * overlapping the frame, and each was 55-185 units across. One or two of those
 * cover the whole picture, which is why the deck read as a wash rather than as
 * cloud: there was plenty of it and almost none of it legible.
 *
 * More, and smaller. Roughly eighteen now contribute to the frame at any moment
 * and each is a fraction of its width, so the layer has edges and gaps in it. */
const SPREAD = 300;

const PUFFS = 220;

/** Deterministic, so the deck is the same on every reload and every machine. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One soft disc, drawn once and shared by every puff.
 *
 * Generated rather than shipped: an image file for something this simple is a
 * network request and a build asset to keep track of, and the gradient is four
 * lines. Alpha falls to zero at the rim so the billboards have no visible
 * square, which is the only thing that would give them away.
 */
function puffTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255,255,255,0.85)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.45)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type Clouds = {
  object3D: THREE.Object3D;
  /** 0 hides the deck entirely, 1 is full strength. Driven by the climb. */
  setStrength(value: number): void;
  update(elapsed: number): void;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

export function proceduralClouds(palette: ScenePalette): Clouds {
  const group = new THREE.Group();
  const random = mulberry32(0xc10d);

  const texture = puffTexture();
  /* One material for every puff, so the fade is a single property write rather
     than ninety. depthWrite off because the puffs overlap constantly and each
     one writing depth would punch holes in the ones behind it. */
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: palette.glass,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });

  const drift: { sprite: THREE.Sprite; phase: number; rate: number }[] = [];

  for (let i = 0; i < PUFFS; i += 1) {
    const sprite = new THREE.Sprite(material);
    const size = 42 + random() * 98;
    sprite.scale.set(size, size * (0.5 + random() * 0.3), 1);
    sprite.position.set(
      (random() - 0.5) * SPREAD * 2,
      CLOUD_BASE + random() * (CLOUD_TOP - CLOUD_BASE),
      (random() - 0.5) * SPREAD * 2,
    );
    group.add(sprite);
    drift.push({ sprite, phase: random() * Math.PI * 2, rate: 0.4 + random() * 0.5 });
  }

  let strength = 0;

  return {
    object3D: group,

    setStrength(value) {
      strength = Math.min(1, Math.max(0, value));
      /* Lower per puff than before, because there are two and a half times as
         many and they overlap far more. What has to stay constant is how much
         of the truck survives the deck — that is the whole point of flying
         through it rather than over — and that is a function of the stack, not
         of any one billboard. */
      material.opacity = strength * 0.22;
      group.visible = strength > 0.001;
    },

    update(elapsed) {
      if (!group.visible) return;
      // A slow sideways crawl, so the deck is not a frozen photograph while the
      // camera moves through it. Per-puff rates keep it from reading as one
      // sheet sliding.
      for (const { sprite, phase, rate } of drift) {
        sprite.position.x += Math.sin(elapsed * 0.05 * rate + phase) * 0.012;
      }
    },

    setPalette(next) {
      material.color.copy(next.glass);
    },

    dispose() {
      material.dispose();
      texture.dispose();
      group.clear();
    },
  };
}
