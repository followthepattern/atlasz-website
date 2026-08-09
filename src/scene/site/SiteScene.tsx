import { Suspense, lazy } from "react";
import { useSceneGate } from "../useSceneGate";

/* Three.js plus this world's assets are ~150 KB gzip. Loading them lazily keeps
   them off the critical path: the hero copy and the CTA paint on the entry
   bundle and the scene fades in behind them when it resolves. The funnel never
   waits on WebGL. */
const SiteSceneCanvas = lazy(() => import("./SiteSceneCanvas"));

/**
 * What SiteLayout renders: the gradient base layer, and the marketing scene
 * over it when the GPU can carry one.
 */
export function SiteScene({ ambient = false }: { ambient?: boolean }) {
  const { show, onLost } = useSceneGate();

  return (
    <>
      <div className="scene-backdrop" aria-hidden="true" />
      {show ? (
        <Suspense fallback={null}>
          <SiteSceneCanvas ambient={ambient} onLost={onLost} />
        </Suspense>
      ) : null}
    </>
  );
}
