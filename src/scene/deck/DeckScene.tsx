import { Suspense, lazy } from "react";
import { useSceneGate } from "../useSceneGate";

/* Its own chunk, fetched only by the deck. Splitting the two scenes means
   neither page downloads a world it will never show. */
const DeckSceneCanvas = lazy(() => import("./DeckSceneCanvas"));

/**
 * What DeckLayout renders: the gradient base layer, and the deck's scene over
 * it when the GPU can carry one.
 */
export function DeckScene() {
  const { show, onLost } = useSceneGate();

  return (
    <>
      <div className="scene-backdrop" aria-hidden="true" />
      {show ? (
        <Suspense fallback={null}>
          <DeckSceneCanvas onLost={onLost} />
        </Suspense>
      ) : null}
    </>
  );
}
