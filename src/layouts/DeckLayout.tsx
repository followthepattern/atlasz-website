import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SceneBackdrop } from "@/scene/SceneBackdrop";
import { deckJourney } from "@/scene/journeys";
import { useScrollStore } from "@/motion/ScrollProvider";

/* How many frames the rail counts. The deck's own, not the router's — the rail
   measures scroll position, and the sections it counts all live on one page. */
const SECTIONS = 5;

const TITLE = "atlasz — Early Partner Program";

/** Scroll position as `01 / 05`, with a hairline fill. A presenter's aid. */
function ProgressRail() {
  const store = useScrollStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => store.subscribe(setProgress), [store]);

  const index = Math.min(SECTIONS - 1, Math.round(progress * (SECTIONS - 1)));
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex items-center justify-center gap-4">
      <div className="h-px w-40 overflow-hidden bg-fg/15">
        <div
          className="h-full origin-left bg-fg/60 transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <span className="font-mono text-[0.7rem] tracking-[0.12em] text-muted/70">
        <span className="text-fg">{pad(index + 1)}</span> / {pad(SECTIONS)}
      </span>
    </div>
  );
}

/**
 * The Early Partner deck, presented live during a demo.
 *
 * It sits outside the marketing site's layout and owns its own scene: a
 * shorter run down the same road, with its own camera. Two separate canvases
 * rather than one re-aimed — building a second renderer over a live WebGL
 * context raises INVALID_OPERATION, and the two pages have no reason to share
 * a scene in the first place.
 *
 * No site nav and no footer. There is nowhere to go from here; the room is
 * looking at a screen, and the next thing that happens is the live demo.
 */
export function DeckLayout() {
  useEffect(() => {
    const previous = document.title;
    const previousLang = document.documentElement.lang;
    document.title = TITLE;
    // The deck is Hungarian regardless of the language the visitor picked
    // elsewhere on the site, so the document has to say so.
    document.documentElement.lang = "hu";
    return () => {
      document.title = previous;
      document.documentElement.lang = previousLang;
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <SceneBackdrop journey={deckJourney} />
      <Outlet />
      <ProgressRail />
    </div>
  );
}
