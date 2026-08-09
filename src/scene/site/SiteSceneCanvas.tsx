import { useSceneHost } from "../useSceneHost";
import { createSiteScene } from "./world";

/**
 * The marketing site's canvas: one vehicle driving the length of the page.
 *
 * Lazily loaded, and separate from the deck's canvas so that this chunk — the
 * renderer plus this world's assets — is only fetched by someone actually on
 * the marketing site.
 */
export default function SiteSceneCanvas({
  ambient = false,
  onLost,
}: {
  ambient?: boolean;
  onLost?: () => void;
}) {
  const canvasRef = useSceneHost(createSiteScene, { ambient, onLost });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
