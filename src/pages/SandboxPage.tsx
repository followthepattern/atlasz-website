import { SandboxHero } from "@/components/sandbox/SandboxHero";

/* The page is the hero, and after that scroll length and nothing else.
 *
 * An earlier version labelled every camera framing down the page. That was a
 * second copy of numbers the scene already owns, and it went stale the first
 * time the framings changed — which is the argument against keeping it. Where
 * the camera is now comes from the live readout in the layout, which reads the
 * scroll rather than restating it. */
/* Longer than the arc strictly needs. Scroll progress is normalised against
   document height, so adding sections does not move a single framing — every
   beat simply gets more physical scrolling to happen over.
 *
 * At 22 sections the open stretch after the satellites is ~3 screens and the
 * satellite hold is ~4, which is what makes the scene feel like a journey
 * rather than a sequence of positions.
 *
 * This number is paired with TRUCK_FROM in the world: stretching the page
 * without also stretching the drive would leave the vehicle covering the same
 * road more slowly, which reads as a crawl rather than as a longer road. */
const BEATS = 58;

export function SandboxPage() {
  return (
    <main className="relative">
      {/* The site's own opening frame, over the sandbox scene rather than the
          site's. Real markup rather than anything drawn into the canvas, so the
          first screen still says what this is on a machine with no WebGL. The
          placeholder heading that used to stand here listed the seven scenes;
          the Readout in the layout already reports which one you are in, from
          the same table the world builds its framings from. */}
      <SandboxHero />

      {Array.from({ length: BEATS }, (_, i) => (
        <section key={i} aria-hidden="true" className="min-h-screen" />
      ))}
    </main>
  );
}
