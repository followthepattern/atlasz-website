import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SceneBackdrop } from "@/scene/SceneBackdrop";
import { useScrollRefresh } from "@/motion/ScrollProvider";
import { LandingPage } from "@/pages/LandingPage";
import { SubscribePage } from "@/pages/SubscribePage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { useDocumentMeta } from "./i18n/useDocumentMeta";
import { useRoute } from "./router";

/**
 * Routing, the scene, and the document head. Everything a page renders belongs
 * to that page — App knows which one is showing, not what is on it.
 */
export default function App() {
  const { i18n } = useTranslation();
  const route = useRoute();
  useDocumentMeta();

  // A route swap replaces the whole document, which invalidates every
  // ScrollTrigger's start/end offset — as does the language switch, since the
  // two locales set different amounts of copy.
  useScrollRefresh([route, i18n.language]);

  // Arriving at a page halfway down it is disorienting. The landing page is
  // included: coming back to it should be coming back to the top of it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <>
      {/* Outside the marketing scroll the page is a form or a legal document;
          the scene settles into a quiet framing instead of following a
          progress it no longer maps to. */}
      <SceneBackdrop ambient={route !== "landing"} />
      {route === "landing" && <LandingPage />}
      {route === "subscribe" && <SubscribePage />}
      {route === "privacy" && <PrivacyPage />}
    </>
  );
}
