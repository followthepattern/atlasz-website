import { Outlet, useMatches } from "react-router-dom";
import { SiteScene } from "@/scene/site/SiteScene";
import { useDocumentMeta } from "@/i18n/useDocumentMeta";

/**
 * The marketing site's shell: the landing scene, and nothing else.
 *
 * The scene lives here rather than in each page's own layout so that moving
 * between the landing page, the funnel and the legal pages does not tear the
 * canvas down and fade a fresh one back in. They are three views of one site
 * and they share one continuous scene.
 *
 * The deck is deliberately not under this layout — it has its own road, its own
 * camera and its own canvas. See DeckLayout.
 */

/** Route metadata this layout reads. Set via a route's `handle`. */
export type SceneHandle = { ambient?: boolean };

export function SiteLayout() {
  useDocumentMeta();

  /* Which framing the scene takes is a property of the route, declared in the
     route config, rather than something worked out from the pathname here.
     Adding a page means adding a route, not extending a condition. */
  const matches = useMatches();
  const ambient = matches.some((m) => (m.handle as SceneHandle | undefined)?.ambient);

  return (
    <>
      {/* Off the marketing scroll the page is a form or a legal document, so
          the scene settles into a quiet framing instead of following a
          progress it no longer maps to. */}
      <SiteScene ambient={ambient} />
      <Outlet />
    </>
  );
}
