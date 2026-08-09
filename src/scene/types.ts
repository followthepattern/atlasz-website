import type * as THREE from "three";
import type { ScenePalette } from "./palette";
import type { QualitySettings } from "./quality";

/* The contract between a scene and the canvas that hosts it.
 *
 * SceneCanvas owns the renderer, the frame loop, the visibility pause and the
 * fade-in — everything true of any scene. It knows nothing about roads,
 * vehicles or facilities. A scene owns all of that, including its own camera,
 * so two scenes can hold entirely different worlds rather than one world
 * looked at from two angles. */

export type SceneContext = {
  palette: ScenePalette;
  quality: QualitySettings;
  /** Viewport aspect at construction. Scenes that frame differently on a
      narrow window read it here; `resize` reports every change after. */
  aspect: number;
  /** The visitor asked for reduced motion: no easing, no idle drift. */
  reduced: boolean;
};

export type SceneInstance = {
  scene: THREE.Scene;
  /** The scene's own camera — its framing is its business, not the host's. */
  camera: THREE.PerspectiveCamera;
  /** Normalised scroll progress in [0, 1]. */
  setProgress(progress: number): void;
  update(elapsed: number, delta: number): void;
  resize(width: number, height: number): void;
  setPalette(palette: ScenePalette): void;
  dispose(): void;
};

/** Builds a scene. Every scene module exports one. */
export type SceneFactory = (context: SceneContext) => SceneInstance;

/**
 * Which scene a layout wants, named rather than imported.
 *
 * A layout that reached for the factory itself would pull Three.js in with it
 * and put ~150 KB gzip of renderer on the critical path — the whole reason
 * SceneCanvas is lazy. A layout names its scene; the lazy chunk resolves it.
 */
export type SceneName = "landing" | "deck";
