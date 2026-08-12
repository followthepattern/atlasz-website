/* The scroll positions the camera framings are authored at, mirrored from the
   scene's `buildFramings`. Kept here as labels so that a section of the page
   lines up with a shot, and a change can be reported as "the crossing broke"
   rather than as a scroll fraction.

   These are a readout of the scene, not an input to it — nothing here drives
   the camera. If the framings move, these numbers go stale and say so. */
const FRAMINGS = [
  { at: 0, bearing: "+87°", note: "hero — square to the flank" },
  { at: 0.24, bearing: "+30°", note: "pulled back and up" },
  { at: 0.48, bearing: "+13°", note: "swinging toward the nose" },
  { at: 0.54, bearing: "+13°", note: "held — bearing locked, closing in" },
  { at: 0.6, bearing: "+13°", note: "held — end of the pause" },
  { at: 0.7, bearing: "-11°", note: "the crossing — past the nose, far side" },
  { at: 0.88, bearing: "-33°", note: "the facility comes into frame" },
  { at: 1, bearing: "-50°", note: "arrived, opposite the yard" },
];

/**
 * The sandbox: the site's scenario with nothing on top of it.
 *
 * The page is deliberately almost empty. Its height exists to give the drive
 * room to play out, and its only content is a marker per authored framing, so
 * you can tell which shot you are looking at while you change one.
 */
export function SandboxPage() {
  return (
    <main className="relative">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          sandbox
        </span>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-fg">
          The same road, somewhere it can be broken.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
          A copy of the marketing scene, on its own canvas behind its own route.
          Nothing here is linked and nothing here ships. Change the world in{" "}
          <code className="font-mono text-[0.85em] text-fg">
            src/scene/sandbox/world.ts
          </code>{" "}
          and the landing page cannot notice.
        </p>
      </section>

      {FRAMINGS.map((shot, i) => (
        <section
          key={shot.at}
          className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6"
        >
          <div className="font-mono text-xs leading-relaxed tracking-[0.08em] text-muted/60">
            <div className="text-fg">
              {String(i + 1).padStart(2, "0")} · at {shot.at.toFixed(2)} ·{" "}
              {shot.bearing}
            </div>
            <div className="mt-1">{shot.note}</div>
          </div>
        </section>
      ))}
    </main>
  );
}
