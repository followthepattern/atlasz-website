import * as THREE from "three";

/* The scene takes its colours from the site's own theme tokens — --canvas,
   --fg and --muted, read off the document at runtime. Nothing here invents a
   palette.

   Reading the live custom properties rather than copying their hex values means
   the scene cannot drift from the design system: restyle the site in
   globals.css and the 3D scene follows on the next theme read, including the
   light/dark swap.

   No additive blending and no emissive accents — solid panels and crisp
   outlines in the site's own neutral greys. */
export type ScenePalette = {
  line: THREE.Color;
  lineDim: THREE.Color;
  /** Lamps and trim. A material colour, not a light source. */
  accent: THREE.Color;
  fill: THREE.Color;
  /** Windscreen and side windows — a touch lighter than the body panels. */
  glass: THREE.Color;
  grid: THREE.Color;
  particle: THREE.Color;
  fog: THREE.Color;
  fillOpacity: number;
  lineOpacity: number;
  glassOpacity: number;
  particleOpacity: number;
  gridOpacity: number;
  fogDensity: number;
};

const VALID = /^(#|rgb)/;

function cssColor(name: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(VALID.test(raw) ? raw : fallback);
}

export function paletteForDocument(): ScenePalette {
  const dark = document.documentElement.classList.contains("dark");

  const canvas = cssColor("--canvas", dark ? "#18181b" : "#ffffff");
  const fg = cssColor("--fg", dark ? "#ffffff" : "#09090b");
  const muted = cssColor("--muted", dark ? "#a1a1aa" : "#71717a");

  // Panels are the page canvas lifted a little toward the foreground colour, so
  // the bodywork reads as a solid volume instead of a hole in the page.
  const fill = canvas.clone().lerp(fg, dark ? 0.07 : 0.05);
  const glass = canvas.clone().lerp(fg, dark ? 0.15 : 0.11);

  return {
    line: fg.clone(),
    lineDim: muted.clone(),
    accent: fg.clone(),
    fill,
    glass,
    grid: muted.clone(),
    particle: muted.clone(),
    fog: canvas.clone(),
    fillOpacity: dark ? 0.92 : 0.95,
    lineOpacity: dark ? 0.72 : 0.9,
    glassOpacity: dark ? 0.8 : 0.9,
    particleOpacity: 0.35,
    gridOpacity: dark ? 0.16 : 0.28,
    fogDensity: dark ? 0.015 : 0.011,
  };
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
