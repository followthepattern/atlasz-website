import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { DURATION, EASE } from "@/motion/tokens";
import { useScrollStore } from "@/motion/ScrollProvider";
import { prefersReducedMotion } from "@/motion/usePrefersReducedMotion";
import { createWorld } from "./world";
import { createCameraRig } from "./cameraRig";
import { truckScreen } from "./truckScreen";
import { detectQuality } from "./quality";
import { observeTheme, paletteForDocument } from "./palette";

type SceneCanvasProps = {
  /** Quiet framing for the funnel and #privacy, where the page is a form. */
  ambient?: boolean;
  /** Called if the GPU drops the context — the parent swaps in the gradient. */
  onLost?: () => void;
};

/** Scroll progress the camera parks at when the page is not the marketing scroll. */
const AMBIENT_PROGRESS = 0.14;

export default function SceneCanvas({ ambient = false, onLost }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef(ambient);
  ambientRef.current = ambient;

  const store = useScrollStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = prefersReducedMotion();
    const quality = detectQuality();
    const palette = paletteForDocument();

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

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.5,
      600,
    );

    const world = createWorld(palette, quality);
    const rig = createCameraRig(camera, world.follow, world.truckAnchors, { reduced });
    rig.setProgress(0);
    rig.snap();

    const stopTheme = observeTheme((next) => world.setPalette(next));

    const unsubscribe = store.subscribe((progress) => {
      rig.setProgress(ambientRef.current ? AMBIENT_PROGRESS : progress);
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
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

    // Roof anchor, projected each frame so the telemetry card can ride above
    // the truck. Read from the asset's own anchors, not a fixed height, so it
    // keeps tracking if the model is ever swapped.
    const roofLocal =
      world.truckAnchors.roof?.clone() ?? new THREE.Vector3(-4.9, 4, 0);
    const roofWorld = new THREE.Vector3();
    const projected = new THREE.Vector3();

    function publishTruckScreen() {
      const cos = Math.cos(world.follow.heading);
      const sin = Math.sin(world.follow.heading);
      roofWorld.set(
        world.follow.position.x + cos * roofLocal.x + sin * roofLocal.z,
        world.follow.position.y + roofLocal.y,
        world.follow.position.z - sin * roofLocal.x + cos * roofLocal.z,
      );
      projected.copy(roofWorld).project(camera);
      const onScreen =
        projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
      truckScreen.publish({
        x: (projected.x * 0.5 + 0.5) * window.innerWidth,
        y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
        visible: onScreen,
      });
    }

    function loop() {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      timer.update();
      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();
      world.update(elapsed, delta, store.get());
      rig.update(elapsed, delta);
      renderer.render(world.scene, camera);
      publishTruckScreen();
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
      truckScreen.reset(); // the card must not linger over a torn-down scene
      world.dispose();
      renderer.dispose();
    };
  }, [store, onLost]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
