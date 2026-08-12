import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SandboxScene } from "@/scene/sandbox/SandboxScene";
import { useScrollStore } from "@/motion/ScrollProvider";

const TITLE = "atlasz — sandbox";

/* Where the scene's camera framings are authored, mirrored from the world's
   `buildFramings` so the readout can name the shot you are looking at. */
const FRAMING_AT = [0, 0.24, 0.48, 0.54, 0.6, 0.7, 0.88, 1];

/**
 * Scroll position and the nearest authored framing. A lab wants a readout —
 * "it breaks around 0.7" is a bug report; "it breaks somewhere in the middle"
 * is not.
 */
function Readout() {
  const store = useScrollStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => store.subscribe(setProgress), [store]);

  const nearest = FRAMING_AT.reduce((best, at) =>
    Math.abs(at - progress) < Math.abs(best - progress) ? at : best,
  );

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-20 font-mono text-[0.7rem] leading-relaxed tracking-[0.08em] text-muted/70">
      <div>
        scroll <span className="text-fg">{progress.toFixed(3)}</span>
      </div>
      <div>
        nearest framing <span className="text-fg">{nearest.toFixed(2)}</span>
      </div>
    </div>
  );
}

/**
 * The sandbox: a lab for trying scene ideas away from anything that ships.
 *
 * Its own layout and its own scene, a sibling of SiteLayout and DeckLayout
 * rather than a page inside either. That is what guarantees the site cannot be
 * broken from in here — no shared canvas, no shared world, no shared chrome —
 * and it is why the route is registered as a sibling too.
 *
 * Unlinked and marked noindex. Nothing navigates here; you arrive by typing
 * the URL, which is the correct amount of discoverability for a room full of
 * half-finished experiments.
 */
export function SandboxLayout() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = TITLE;

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);

    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <SandboxScene />
      <Outlet />
      <Readout />
    </div>
  );
}
