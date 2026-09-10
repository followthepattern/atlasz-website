import { SCENES, SCENE_START } from '@/scene/sandbox/scenes';

// Keep the original seven-scene scroll pace; added scenes extend the page.
/** Animation-only lab. The compact layout controls are the only overlay. */
export function SandboxPage() {
  return (
    <main className="relative" aria-label="Sandbox animation journey">
      {SCENES.map((scene, i) => (
        <section key={scene.name} data-scene-start={SCENE_START[i]} aria-label={scene.name}
          style={{ minHeight: `${scene.span * (5800 / 2.325)}vh` }} />
      ))}
    </main>
  );
}
