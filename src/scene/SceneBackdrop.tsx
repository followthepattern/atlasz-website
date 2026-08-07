import { Suspense, lazy, useCallback, useState } from "react";
import { isWebGLAvailable } from "./quality";

/* Three.js is ~150 KB gzip. Loading it lazily keeps it off the critical path:
   the hero copy and the CTA paint on the original bundle and the scene fades in
   behind them when it resolves. The funnel never waits on WebGL. */
const SceneCanvas = lazy(() => import("./SceneCanvas"));

/**
 * Owns the decision of whether there is a 3D scene at all.
 *
 * The gradient underneath is not a fallback that gets swapped in — it is always
 * there, as the scene's base layer. If WebGL is missing or the context is lost,
 * the page simply keeps the gradient and nothing else changes.
 */
export function SceneBackdrop({ ambient = false }: { ambient?: boolean }) {
  const [supported] = useState(isWebGLAvailable);
  const [lost, setLost] = useState(false);
  const onLost = useCallback(() => setLost(true), []);

  return (
    <>
      <div className="scene-backdrop" aria-hidden="true" />
      {supported && !lost ? (
        <Suspense fallback={null}>
          <SceneCanvas ambient={ambient} onLost={onLost} />
        </Suspense>
      ) : null}
    </>
  );
}
