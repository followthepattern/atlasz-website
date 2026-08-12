import { Suspense, lazy } from "react";
import { useSceneGate } from "../useSceneGate";

/* Its own chunk, fetched only by the sandbox. The lab is where half-finished
   work lives, and none of it should reach a bundle the site downloads. */
const SandboxSceneCanvas = lazy(() => import("./SandboxSceneCanvas"));

/**
 * What SandboxLayout renders: the gradient base layer, and the turntable over
 * it when the GPU can carry one.
 */
export function SandboxScene() {
  const { show, onLost } = useSceneGate();

  return (
    <>
      <div className="scene-backdrop" aria-hidden="true" />
      {show ? (
        <Suspense fallback={null}>
          <SandboxSceneCanvas onLost={onLost} />
        </Suspense>
      ) : null}
    </>
  );
}
