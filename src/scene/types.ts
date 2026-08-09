import type * as THREE from "three";
import type { ScenePalette } from "./palette";
import type { QualitySettings } from "./quality";
import type { ScreenSize } from "./viewport";

/* The contract between a scene and the canvas that hosts it.
 *
 * `useSceneHost` owns the renderer, the frame loop, the visibility pause and
 * the fade-in — everything true of any scene. It knows nothing about roads,
 * vehicles or facilities. A scene owns all of that, including its own camera,
 * so each layout's canvas holds an entirely different world rather than one
 * world looked at from two angles. */

export type SceneContext = {
  palette: ScenePalette;
  quality: QualitySettings;
  /** Viewport aspect at construction. `resize` reports every change after. */
  aspect: number;
  /** Which viewport bucket the window is in, on Tailwind's breakpoints. */
  screen: ScreenSize;
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
