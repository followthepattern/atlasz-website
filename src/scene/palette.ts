import * as THREE from "three";

/* The site is dark-first but light mode is reachable via
   localStorage['atlasz-theme'] (see index.html). Glowing wireframes on white
   look broken, so the scene carries a real light palette: darker lines, no
   additive blending, denser fog. */
export type ScenePalette = {
  line: THREE.Color;
  lineDim: THREE.Color;
  accent: THREE.Color;
  fill: THREE.Color;
  grid: THREE.Color;
  particle: THREE.Color;
  fog: THREE.Color;
  /** Additive blending only survives on a dark canvas. */
  additive: boolean;
  fillOpacity: number;
  lineOpacity: number;
  fogDensity: number;
};

export const DARK_PALETTE: ScenePalette = {
  line: new THREE.Color(0xd6ebff),
  lineDim: new THREE.Color(0x5b7f9c),
  accent: new THREE.Color(0x38bdf8),
  // Slightly lighter than the page canvas (#18181b) so the body reads as a
  // solid volume and the bright edges have something to sit against.
  fill: new THREE.Color(0x121a24),
  grid: new THREE.Color(0x33506a),
  particle: new THREE.Color(0x6cc6f5),
  fog: new THREE.Color(0x18181b),
  additive: true,
  fillOpacity: 0.72,
  lineOpacity: 1,
  fogDensity: 0.016,
};

export const LIGHT_PALETTE: ScenePalette = {
  line: new THREE.Color(0x1b2c3c),
  lineDim: new THREE.Color(0x7e97ab),
  accent: new THREE.Color(0x0284c7),
  fill: new THREE.Color(0xe9eff5),
  grid: new THREE.Color(0xaebecd),
  particle: new THREE.Color(0x0284c7),
  fog: new THREE.Color(0xffffff),
  additive: false,
  // A near-opaque fill and full-strength lines: on white there is no glow to
  // carry the shape, so the drawing has to do all the work.
  fillOpacity: 0.9,
  lineOpacity: 1,
  fogDensity: 0.012,
};

export function paletteForDocument(): ScenePalette {
  return document.documentElement.classList.contains("dark")
    ? DARK_PALETTE
    : LIGHT_PALETTE;
}

/** Calls back whenever the `.dark` class on <html> is added or removed. */
export function observeTheme(onChange: (palette: ScenePalette) => void) {
  const observer = new MutationObserver(() => onChange(paletteForDocument()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}
