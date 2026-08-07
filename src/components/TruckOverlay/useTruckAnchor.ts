import { useEffect, useRef } from "react";
import { truckScreen } from "@/scene/truckScreen";

/**
 * Peak opacity for the floating readouts. Stacking order alone is not enough to
 * keep them subordinate — behind the copy but at full strength, they still pull
 * the eye and cost muted headings their contrast.
 */
const AMBIENT_OPACITY = 0.8;

/**
 * Pins an element to the truck's projected screen position.
 *
 * Writes transform and opacity straight to the node rather than going through
 * React state: this updates every frame, and a re-render per frame would put
 * the whole page's reconciliation inside the animation loop.
 */
export function useTruckAnchor<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    return truckScreen.subscribe(({ x, y, visible }) => {
      const element = ref.current;
      if (!element) return;
      element.style.opacity = visible ? String(AMBIENT_OPACITY) : "0";
      // translate3d keeps this on the compositor — repositioned every frame, it
      // must never trigger layout.
      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
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
