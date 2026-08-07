import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/* The single source of the reduced-motion signal. Hoisted out of
   RouteEconomics so the existing showcase and all new motion agree. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

/* Non-reactive read, for imperative code that runs outside React's lifecycle
   (the render loop, one-shot GSAP setup). */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
