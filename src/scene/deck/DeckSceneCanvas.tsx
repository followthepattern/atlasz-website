import { useSceneHost } from "../useSceneHost";
import { createDeckScene } from "./world";

/**
 * The Early Partner deck's canvas: the last leg of a trip into a depot.
 *
 * Its own component, not the site's canvas re-aimed. Two canvases is what keeps
 * a second renderer from ever being built over a live WebGL context — which
 * raises INVALID_OPERATION on every frame after, silently — and it means this
 * chunk carries only the deck's world, so the marketing site never fetches it.
 */
export default function DeckSceneCanvas({ onLost }: { onLost?: () => void }) {
  // No `ambient`: every page under DeckLayout is a scroll, so there is no
  // parked framing for the camera to fall back to.
  const canvasRef = useSceneHost(createDeckScene, { onLost });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
