import * as THREE from "three";

/* The site is dark-first but light mode is reachable via
   localStorage['atlasz-theme'] (see index.html), so the scene carries a real
   palette for each.

   No additive blending and no emissive accents: the scene reads as a precise
   technical drawing in both themes, not a hologram. */
export type ScenePalette = {
  line: THREE.Color;
  lineDim: THREE.Color;
  /** Lamps and trim. A material colour, not a light source. */
  accent: THREE.Color;
  fill: THREE.Color;
  /** Windscreen and side windows — darker than the body in both themes. */
  glass: THREE.Color;
  grid: THREE.Color;
  particle: THREE.Color;
  fog: THREE.Color;
  fillOpacity: number;
  lineOpacity: number;
  glassOpacity: number;
  particleOpacity: number;
  fogDensity: number;
};

export const DARK_PALETTE: ScenePalette = {
  line: new THREE.Color(0x9fb3c4),
  lineDim: new THREE.Color(0x4a5d6e),
  accent: new THREE.Color(0xc4d2dd),
  // Slightly lighter than the page canvas (#18181b) so the body reads as a
  // solid volume rather than a hole in the page.
  fill: new THREE.Color(0x1c2530),
  glass: new THREE.Color(0x2b3947),
  grid: new THREE.Color(0x2b3644),
  particle: new THREE.Color(0x62778a),
  fog: new THREE.Color(0x18181b),
  fillOpacity: 0.92,
  lineOpacity: 0.85,
  glassOpacity: 0.75,
  particleOpacity: 0.4,
  fogDensity: 0.015,
};

export const LIGHT_PALETTE: ScenePalette = {
  line: new THREE.Color(0x2c3e4f),
  lineDim: new THREE.Color(0x8ea2b2),
  accent: new THREE.Color(0x5c6f7e),
  fill: new THREE.Color(0xeef3f7),
  glass: new THREE.Color(0xd2dee7),
  grid: new THREE.Color(0xc2cfda),
  particle: new THREE.Color(0x8698a7),
  fog: new THREE.Color(0xffffff),
  // On white there is no glow to carry the shape, so the drawing does the work.
  fillOpacity: 0.95,
  lineOpacity: 1,
  glassOpacity: 0.85,
  particleOpacity: 0.45,
  fogDensity: 0.011,
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
