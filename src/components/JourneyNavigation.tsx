import { useCallback, useEffect, useState } from "react";
import { useScrollStore } from "@/motion/ScrollProvider";
import { SCENES, sceneAt, within } from "@/scene/sandbox/scenes";
import { pageToScene, sceneToPage } from "@/scene/sandbox/pageProgress";

/** Shared playback controls for the sandbox journey and partner presentation. */
export function JourneyNavigation() {
  const store = useScrollStore();
  const [progress, setProgress] = useState(0);
  useEffect(() => store.subscribe(next => setProgress(pageToScene(next))), [store]);
  const scene = sceneAt(progress);
  const navigate = useCallback((direction: number) => {
    const index = Math.max(0, Math.min(SCENES.length - 1, scene.index + direction));
    const at = within(index, index === 0 ? 0 : index === SCENES.length - 1 ? 1 : .5);
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const top = sceneToPage(at) * maximum;
    // Play through the intervening animation at a steady manual-scroll pace.
    const seconds = Math.abs(top - window.scrollY) / (window.innerHeight * 1.32);
    store.scrollTo(top, Math.max(.1, seconds), true);
  }, [scene.index, store]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const direction = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
      if (direction === undefined) return;
      event.preventDefault();
      navigate(direction);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <nav aria-label="Animation navigation" className="fixed top-4 right-4 z-30 flex items-center gap-3 rounded-full border border-fg/15 bg-canvas/90 px-2 py-2 text-fg">
      <button aria-label="Move backward" title="Play toward previous scene (← or ↑)" disabled={progress <= 0} onClick={() => navigate(-1)} className="h-10 w-10 rounded-full text-xl hover:bg-fg/10 disabled:opacity-25">←</button>
      <span className="min-w-12 text-center font-mono text-xs" aria-live="polite">{scene.number} / {scene.count}</span>
      <button aria-label="Move forward" title="Play toward next scene (→ or ↓)" disabled={progress >= 1} onClick={() => navigate(1)} className="h-10 w-10 rounded-full text-xl hover:bg-fg/10 disabled:opacity-25">→</button>
    </nav>
  );
}
