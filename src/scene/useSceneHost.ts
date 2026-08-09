import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { DURATION, EASE } from "@/motion/tokens";
import { useScrollStore } from "@/motion/ScrollProvider";
import { prefersReducedMotion } from "@/motion/usePrefersReducedMotion";
import { detectQuality } from "./quality";
import { observeTheme, paletteForDocument } from "./palette";
import type { SceneFactory } from "./types";

/** Scroll progress the camera parks at when the page is not a scroll. */
const AMBIENT_PROGRESS = 0.14;

export type SceneHostOptions = {
  /** Quiet framing for pages that are a form or a document, not a scroll. */
  ambient?: boolean;
  /** Called if the GPU drops the context — the caller keeps the gradient. */
  onLost?: () => void;
};

/**
 * Everything true of hosting any scene: the renderer, the frame loop, the
 * hidden-tab pause, the resize, the theme watch and the fade-in.
 *
 * A hook rather than a component because each layout owns its own canvas
 * component — one for the marketing site, one for the deck — and what differs
 * between them is which scene they build, not how a scene is driven. Attach the
 * returned ref to a `<canvas>`.
 */
export function useSceneHost(createScene: SceneFactory, options: SceneHostOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useScrollStore();

  const { ambient = false, onLost } = options;
  // Read through a ref inside the loop: `ambient` flips as the visitor moves
  // between pages of one layout, and rebuilding the whole scene for a framing
  // change would tear down a canvas that is working perfectly well.
  const ambientRef = useRef(ambient);
  ambientRef.current = ambient;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = prefersReducedMotion();
    const quality = detectQuality();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality.antialias,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      onLost?.();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const instance = createScene({
      palette: paletteForDocument(),
      quality,
      aspect: window.innerWidth / window.innerHeight,
      reduced,
    });
    instance.resize(window.innerWidth, window.innerHeight);

    const stopTheme = observeTheme((next) => instance.setPalette(next));

    const unsubscribe = store.subscribe((progress) => {
      instance.setProgress(ambientRef.current ? AMBIENT_PROGRESS : progress);
    });

    const onResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      instance.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // A permanently mounted canvas rendering at 60fps forever is a laptop
    // killer. Stop entirely while the tab is hidden.
    // Start paused if the page is already in a background tab. Keying only off
    // the visibilitychange event misses this case entirely: a tab opened in the
    // background renders (throttled, but continuously) until it is first shown.
    let running = !document.hidden;
    let frame = 0;
    const timer = new THREE.Timer();

    const onVisibility = () => {
      const visible = !document.hidden;
      if (visible && !running) {
        running = true;
        timer.update(); // discard the hidden gap so nothing jumps on resume
        frame = requestAnimationFrame(loop);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      running = false;
      cancelAnimationFrame(frame);
      onLost?.();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    // Fade in off the first rendered frame, so the scene arrives rather than
    // pops. Driven by GSAP rather than a CSS transition: a transition started
    // from inside rAF can be interrupted mid-flight and leave the canvas
    // stranded at a fraction of full opacity, which reads as a washed-out scene
    // rather than as a bug.
    let revealed = false;
    gsap.set(canvas, { opacity: 0 });
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      gsap.to(canvas, {
        opacity: 1,
        duration: DURATION.long,
        ease: EASE.out,
        overwrite: "auto",
      });
    };

    function loop() {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      timer.update();
      instance.update(timer.getElapsed(), timer.getDelta());
      renderer.render(instance.scene, instance.camera);
      reveal();
    }

    if (running) frame = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      // Tear down to fully visible, never to a fraction. A killed fade must not
      // be able to leave the scene permanently half-transparent — in dev,
      // StrictMode's double-mount kills this tween mid-flight every time.
      gsap.killTweensOf(canvas);
      canvas.style.opacity = "1";
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      unsubscribe();
      stopTheme();
      instance.dispose();
      renderer.dispose();
      /* Deliberately no forceContextLoss(). It looks like the right way to
         hand a discarded canvas's context back, but StrictMode's double-invoke
         runs this cleanup against a canvas React then mounts again — and a
         renderer built over a force-lost context throws, which lands in the
         onLost path and disables the scene for the rest of the session.
         Dropping the detached canvas is enough; the browser reclaims the
         context, verified over twenty site/deck swaps with none lost. */
    };
  }, [store, createScene, onLost]);

  return canvasRef;
}
