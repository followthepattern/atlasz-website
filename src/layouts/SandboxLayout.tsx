import { useEffect, useState } from "react";
import { JourneyNavigation } from "@/components/JourneyNavigation";
import { Outlet } from "react-router-dom";
import { SandboxScene } from "@/scene/sandbox/SandboxScene";
import { useScrollStore } from "@/motion/ScrollProvider";
import { SCENES, sceneAt, within } from "@/scene/sandbox/scenes";

import { fuelStopPose } from "@/scene/sandbox/fuelStop";
import { pageToScene, sceneToPage } from "@/scene/sandbox/pageProgress";

const TITLE = "atlasz — sandbox";

/**
 * Which scene you are in, how far through it, and the raw scroll.
 *
 * Read from the same table the world builds its framings from, rather than a
 * copy of the numbers kept in step by hand. The earlier version of this mirrored
 * the framing positions and went stale every single time the timing changed.
 *
 * A lab wants a readout: "it breaks early in the uplink" is a bug report,
 * "it breaks somewhere in the middle" is not.
 */
function Readout() {
  const store = useScrollStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => store.subscribe((next) => setProgress(pageToScene(next))), [store]);

  const scene = sceneAt(progress);
  const pad = (n: number) => String(n).padStart(2, "0");

  const seek = (at: number) => {
    store.scrollTo(sceneToPage(at) * (document.documentElement.scrollHeight - window.innerHeight), 0);
  };
  return (
    <>
    <details className="fixed bottom-4 right-4 z-20 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-fg/10 bg-canvas/95 p-4 text-fg shadow-lg">
      <summary className="cursor-pointer text-xs text-muted">Sandbox preview · Scene controls</summary>
      <p className="mt-3 text-sm">{scene.index === 5 ? fuelStopPose(scene.local).phase : scene.name}</p>
      <label className="mt-3 block text-xs text-muted" htmlFor="scene-progress">Scrub the journey</label>
      <input id="scene-progress" type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={(event) => seek(Number(event.target.value) / 1000)} className="mt-2 w-full accent-current" />
      <div className="mt-3 flex flex-wrap gap-2">
        {SCENES.map((s, i) => <button key={s.name} onClick={() => seek(within(i, i === 0 ? 0 : 0.5))} className="rounded border border-fg/15 px-2 py-1 text-xs hover:bg-fg/10">{s.name}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {([['Step out', 0.37], ['Walk out', 0.445], ['Pumps', 0.53], ['Walk back', 0.64], ['Aboard', 0.77]] as const).map(([label, at]) => <button key={label} onClick={() => seek(within(5, at))} className="rounded border border-fg/15 px-2 py-1 text-xs hover:bg-fg/10">{label}</button>)}
      </div>
      <p className="mt-3 text-xs text-muted">Arrows play to the next or previous scene at a steady pace. Scroll to take over.</p>
    </details>
    <div className="pointer-events-none fixed bottom-6 left-6 z-20 font-mono text-[0.7rem] leading-relaxed tracking-[0.08em] text-muted/70">
      <div className="text-fg">
        scene {pad(scene.number)} / {pad(scene.count)} · {scene.name}
      </div>
      <div className="mt-1">
        through <span className="text-fg">{scene.local.toFixed(2)}</span>
      </div>
      <div>
        scroll <span className="text-fg">{progress.toFixed(3)}</span>
      </div>
      {/* A tick per scene, filling as you pass through it. */}
      <div className="mt-2 flex gap-1">
        {SCENES.map((s, i) => (
          <span
            key={s.name}
            className="h-px w-8 overflow-hidden bg-fg/15"
            aria-hidden="true"
          >
            <span
              className="block h-full origin-left bg-fg/70"
              style={{
                transform: `scaleX(${i < scene.index ? 1 : i === scene.index ? scene.local : 0})`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
    </>
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
      <JourneyNavigation />
      <Readout />
    </div>
  );
}
