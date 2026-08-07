/* Single source of motion timing. Retuning the whole site's feel happens here
   and nowhere else. Durations are seconds, in the cinematic 0.6–1.2s band. */

export const DURATION = {
  short: 0.6,
  base: 0.8,
  long: 1.2,
} as const;

/* GSAP's built-in eases, chosen to match the CSS curves below closely enough
   that DOM transitions and GSAP tweens read as one system. Using named eases
   rather than cubic-bezier strings keeps us off the CustomEase plugin. */
export const EASE = {
  out: "power4.out",
  inOut: "power2.inOut",
} as const;

/* For CSS transitions and keyframes, where GSAP isn't involved. */
export const CSS_EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

export const STAGGER = {
  tight: 0.04,
  base: 0.07,
  loose: 0.12,
} as const;

/* Per-frame lerp factor for the camera chasing its scroll target. Lower is
   heavier. This inertia is what separates cinematic movement from scrubbing. */
export const CAMERA_DAMPING = 0.075;

/* Distance travelled before a reveal fires, as a fraction of the viewport. */
export const REVEAL_START = "top 80%";
