import { Fragment, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./usePrefersReducedMotion";
import { DURATION, EASE, REVEAL_START, STAGGER } from "./tokens";

gsap.registerPlugin(ScrollTrigger);

type SplitTextProps = {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
  /** Reveal on mount instead of waiting for the element to scroll into view. */
  immediate?: boolean;
};

/**
 * Oversized staggered typography: each word rises out of its own clipping mask.
 *
 * Splitting is by **word**, never by character. Character splitting breaks
 * Hungarian digraphs and diacritics, and turns a heading into gibberish for
 * anyone using a screen reader.
 *
 * Accessibility: the animated markup is `aria-hidden` and an intact
 * screen-reader copy of the string sits alongside it. Assistive tech reads one
 * clean sentence; the decoration is invisible to it.
 */
export function SplitText({
  text,
  className = "",
  stagger = STAGGER.base,
  delay = 0,
  immediate = false,
}: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const targets = root.querySelectorAll("[data-split-word]");
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        yPercent: 115,
        opacity: 0,
        duration: DURATION.long,
        ease: EASE.out,
        stagger,
        delay,
        scrollTrigger: immediate
          ? undefined
          : { trigger: root, start: REVEAL_START, once: true },
      });
    }, root);

    return () => ctx.revert();
    // `text` is the dependency that matters: switching language replaces every
    // word node, and a tween bound to the old nodes would leave the new ones
    // stuck at their pre-animation transform.
  }, [text, stagger, delay, immediate]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">
        {words.map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            <span className="inline-block overflow-hidden align-bottom pb-[0.12em]">
              <span data-split-word className="inline-block will-change-transform">
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
