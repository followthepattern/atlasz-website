import { useCallback, useState } from "react";
import { isWebGLAvailable } from "./quality";

/**
 * Whether there should be a 3D canvas at all.
 *
 * The gradient a layout paints underneath is not a fallback that gets swapped
 * in — it is always there, as the scene's base layer. If WebGL is missing or
 * the context is lost, the page simply keeps the gradient and nothing else
 * changes, so this only ever decides whether to mount the canvas on top.
 */
export function useSceneGate() {
  const [supported] = useState(isWebGLAvailable);
  const [lost, setLost] = useState(false);
  const onLost = useCallback(() => setLost(true), []);

  return { show: supported && !lost, onLost };
}
