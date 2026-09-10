import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

type Subscriber = (progress: number) => void;

/* The entire interface between src/motion/ and src/scene/: one normalised
   scroll progress in [0, 1]. Deliberately not React state — this updates every
   frame and must never trigger a render. */
export type ScrollStore = {
  get(): number;
  subscribe(fn: Subscriber): () => void;
  refresh(): void;
  scrollTo(top: number, duration?: number, constantSpeed?: boolean): void;
};

const ScrollContext = createContext<ScrollStore | null>(null);

function createStore(): ScrollStore & { publish(p: number): void; setScrollDriver(driver: ((top: number, duration: number, constantSpeed: boolean) => void) | null): void } {
  let scrollDriver: ((top: number, duration: number, constantSpeed: boolean) => void) | null = null;
  let progress = 0;
  const subscribers = new Set<Subscriber>();

  return {
    get: () => progress,
    setScrollDriver(driver) { scrollDriver = driver; },
    scrollTo(top, duration = .65, constantSpeed = false) {
      if (scrollDriver) scrollDriver(top, duration, constantSpeed);
      else window.scrollTo({ top, behavior: 'instant' });
    },
    subscribe(fn) {
      subscribers.add(fn);
      fn(progress);
      return () => {
        subscribers.delete(fn);
      };
    },
    refresh() {
      ScrollTrigger.refresh();
    },
    publish(next) {
      progress = next;
      for (const fn of subscribers) fn(next);
    },
  };
}

function currentProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}

export function ScrollProvider({ children }: { children: ReactNode }) {
  const store = useMemo(createStore, []);

  useEffect(() => {
    const reduced = prefersReducedMotion();

    // Reduced motion: no smooth-scroll hijack at all. Progress still flows so
    // the scene keeps its section framings — it just stops gliding between them.
    if (reduced) {
      const onScroll = () => store.publish(currentProgress());
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    const lenis = new Lenis({
      duration: 1.1,
      // Exponential settle — the long tail is what reads as "premium".
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let playing = false;
    store.setScrollDriver((top, duration, constantSpeed) => {
      playing = constantSpeed && duration > 0;
      lenis.scrollTo(top, {
        duration, immediate: duration === 0,
        easing: (t) => constantSpeed ? t : t * t * (3 - 2 * t),
        onComplete: () => { playing = false; },
      });
    });
    const takeOver = () => {
      if (!playing) return;
      playing = false;
      lenis.scrollTo(window.scrollY, { immediate: true });
    };
    window.addEventListener('wheel', takeOver, { capture: true, passive: true });
    window.addEventListener('touchstart', takeOver, { capture: true, passive: true });
    document.documentElement.classList.add("lenis");

    const onLenisScroll = () => {
      ScrollTrigger.update();
      store.publish(currentProgress());
    };
    lenis.on("scroll", onLenisScroll);

    // Drive Lenis from GSAP's ticker so both share one clock; two independent
    // rAF loops drift apart and make ScrollTrigger fire a frame late.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    store.publish(currentProgress());

    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      window.removeEventListener('wheel', takeOver, true);
      window.removeEventListener('touchstart', takeOver, true);
      store.setScrollDriver(null);
      lenis.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, [store]);

  return <ScrollContext.Provider value={store}>{children}</ScrollContext.Provider>;
}

export function useScrollStore() {
  const store = useContext(ScrollContext);
  if (!store) throw new Error("useScrollStore must be used inside <ScrollProvider>");
  return store;
}

/* Anything that changes document height invalidates every ScrollTrigger's
   start/end position: funnel stage changes, the #privacy route, and the
   language switch. Without this, triggers fire at the wrong scroll offsets and
   the page looks subtly broken in a way that is painful to trace. */
export function useScrollRefresh(deps: unknown[]) {
  const store = useContext(ScrollContext);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Two frames: one for React to commit, one for layout/fonts to settle.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => store?.refresh()),
    );
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
