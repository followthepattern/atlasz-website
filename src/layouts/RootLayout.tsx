import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { useScrollRefresh } from "@/motion/ScrollProvider";

/**
 * What every page needs regardless of its chrome: a top-of-page start, and a
 * scroll system that knows the document changed underneath it.
 *
 * Deliberately renders no markup and owns no scene. Its children are the two
 * genuinely separate worlds — the marketing site and the deck — and anything
 * either of them draws would have to be undrawn by the other.
 */
export function RootLayout() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  /* Navigating replaces the document, which invalidates every ScrollTrigger's
     start/end offset — as does the language switch, since the two locales set
     different amounts of copy. */
  useScrollRefresh([pathname, i18n.language]);

  // Arriving at a page part-way down it is disorienting, and the browser
  // restores the previous scroll position on a client-side navigation unless
  // told otherwise.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return <Outlet />;
}
