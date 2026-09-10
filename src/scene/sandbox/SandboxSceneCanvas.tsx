import { useSceneHost } from "../useSceneHost";
import { createSandboxScene } from "./world";
import { pageToScene } from "./pageProgress";
import type { SceneFactory } from "../types";

const createPageScene: SceneFactory = (context) => {
  const instance = createSandboxScene(context);
  let pageProgress = 0;
  const setProgress = (next: number) => {
    pageProgress = next;
    instance.setProgress(pageToScene(next));
  };
  return {
    ...instance, setProgress,
    resize(width, height) {
      instance.resize(width, height);
      setProgress(pageProgress);
    },
  };
};

/**
 * The sandbox's canvas: the marketing scroll's scenario, to experiment on.
 *
 * A third canvas rather than either of the other two re-aimed, for the same
 * reason those two are separate — a second renderer built over a live WebGL
 * context raises INVALID_OPERATION on every frame after, silently — and so
 * that this chunk, which is the one that will churn, is fetched by nobody
 * except whoever opens the lab.
 */
export default function SandboxSceneCanvas({ onLost }: { onLost?: () => void }) {
  // No `ambient`: the sandbox is a scroll, and its camera has no parked
  // framing to fall back to.
  const canvasRef = useSceneHost(createPageScene, { onLost });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
