import { useEffect, useRef } from "react";
import { truckScreen } from "@/scene/truckScreen";

/**
 * Peak opacity for the floating readouts. Stacking order alone is not enough to
 * keep them subordinate — behind the copy but at full strength, they still pull
 * the eye and cost muted headings their contrast.
 */
const AMBIENT_OPACITY = 0.92;

/** Gap from the truck to the readout cluster, in px — enough to clear the cab. */
const OFFSET_X = 250;
/** Never let the cluster run off the right edge. */
const EDGE_MARGIN = 24;

/**
 * Pins an element to the truck's projected screen position.
 *
 * Applied once, to the group that holds every readout, so they travel as a
 * single cluster. Anchoring each one separately lets them drift apart — pin one
 * to the viewport edge and it stops moving with the vehicle the others follow.
 *
 * Writes transform and opacity straight to the node rather than going through
 * React state: this updates every frame, and a re-render per frame would put
 * the whole page's reconciliation inside the animation loop.
 */
export function useTruckAnchor<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    // Measured once. Reading layout inside the subscriber would force a reflow
    // on every frame, which is the one thing this whole approach avoids.
    let width = 0;

    return truckScreen.subscribe(({ x, y, visible }) => {
      const element = ref.current;
      if (!element) return;
      if (!width) width = element.offsetWidth;

      element.style.opacity = visible ? String(AMBIENT_OPACITY) : "0";

      // Offset clear of the cab, then clamped so the cluster cannot slide off
      // the right edge when the camera carries the truck across the frame.
      const limit = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
      const tx = Math.min(Math.max(x + OFFSET_X, EDGE_MARGIN), limit);

      // translate3d keeps this on the compositor — repositioned every frame, it
      // must never trigger layout.
      element.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(y)}px, 0)`;
    });
  }, []);

  return ref;
}

/**
 * Shared shell for the floating readouts.
 *
 * `z-[-5]` is the important part: it puts these behind everything in the normal
 * document flow while still sitting above the WebGL canvas at -10. They are
 * ambient instrumentation, not content, and must never compete with the copy
 * they pass over — where a section uses .glass, they end up blurred behind it,
 * which is exactly right.
 */
export const FLOATING_SHELL =
  "pointer-events-none fixed left-0 top-0 z-[-5] hidden opacity-0 transition-opacity duration-500 lg:block";

/**
 * The cluster sits to the right of the truck. The page's copy is left-aligned
 * inside a centred container, so keeping the readouts on the far side of the
 * vehicle is what stops them competing with it.
 */
export const FLOATING_GROUP = "flex w-[300px] -translate-y-1/2 flex-col gap-5";
