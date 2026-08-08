/**
 * Viewport size buckets for code that has to branch on screen size.
 *
 * The thresholds are Tailwind's own, so a check here and a `md:` / `lg:` /
 * `xl:` class in the markup always agree about which bucket the window is in.
 * Anything that disagrees with the CSS is worse than no helper at all.
 */
export type ScreenSize = "xs" | "md" | "lg" | "xl";

/** Lower bound of each bucket, in CSS pixels. Tailwind's md / lg / xl. */
export const SCREEN_MIN_WIDTH = {
  xs: 0,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const satisfies Record<ScreenSize, number>;

const ORDER: readonly ScreenSize[] = ["xs", "md", "lg", "xl"];

/** Which bucket a given width falls in. Pure, so it can be reasoned about. */
export function screenSizeFor(width: number): ScreenSize {
  if (width >= SCREEN_MIN_WIDTH.xl) return "xl";
  if (width >= SCREEN_MIN_WIDTH.lg) return "lg";
  if (width >= SCREEN_MIN_WIDTH.md) return "md";
  return "xs";
}

/**
 * The width CSS media queries are resolving against.
 *
 * `clientWidth`, not `window.innerWidth`: innerWidth counts the scrollbar and
 * media queries do not, so on a desktop with a classic scrollbar the two
 * disagree by ~15px. Near a breakpoint that is enough for this helper to say
 * one thing while a `lg:` class does the other.
 */
function cssViewportWidth() {
  return document.documentElement?.clientWidth || window.innerWidth;
}

/** The current viewport's bucket. */
export function screenSize(): ScreenSize {
  return screenSizeFor(cssViewportWidth());
}

/** True when the viewport is at `size` or wider — the `lg:` reading. */
export function screenAtLeast(size: ScreenSize): boolean {
  return ORDER.indexOf(screenSize()) >= ORDER.indexOf(size);
}
