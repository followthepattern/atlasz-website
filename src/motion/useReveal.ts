import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./usePrefersReducedMotion";
import { DURATION, EASE, REVEAL_START, STAGGER } from "./tokens";

gsap.registerPlugin(ScrollTrigger);

type RevealOptions = {
  /** Descendants to stagger in. Defaults to anything marked [data-reveal]. */
  selector?: string;
  stagger?: number;
  duration?: number;
  /** Travel distance in px. */
  y?: number;
};

/**
 * Staggers a section's marked children into view as it enters the viewport.
 * Returns a ref to attach to the section.
 *
 * Under reduced motion this is a no-op and the content simply renders in
 * place — never hidden, never waiting on a trigger that will not fire.
 */
export function useReveal<T extends HTMLElement>(options: RevealOptions = {}) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const targets = root.querySelectorAll(options.selector ?? "[data-reveal]");
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: options.y ?? 28,
        duration: options.duration ?? DURATION.base,
        ease: EASE.out,
        stagger: options.stagger ?? STAGGER.base,
        scrollTrigger: {
          trigger: root,
          start: REVEAL_START,
          once: true,
        },
      });
    }, root);

    return () => ctx.revert();
    // Options are read once at mount by design; changing them mid-life would
    // mean tearing down and replaying a reveal the visitor has already seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
