import type { SceneFactory, SceneName } from "../types";
import { createLandingScene } from "./landing";
import { createDeckScene } from "./deck";

/**
 * Every scene the site can show.
 *
 * Imported only from inside the lazily-loaded SceneCanvas chunk. Pulling this
 * into a layout would drag Three.js and every procedural asset onto the
 * critical path, which is exactly what the lazy boundary exists to prevent.
 */
export const SCENES: Record<SceneName, SceneFactory> = {
  landing: createLandingScene,
  deck: createDeckScene,
};
