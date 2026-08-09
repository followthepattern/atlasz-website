import { Navigate, type RouteObject } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { SiteLayout, type SceneHandle } from "@/layouts/SiteLayout";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { FunnelLayout } from "@/layouts/FunnelLayout";
import { DocumentLayout } from "@/layouts/DocumentLayout";
import { DeckLayout } from "@/layouts/DeckLayout";
import { LandingPage } from "@/pages/LandingPage";
import { SubscribePage } from "@/pages/SubscribePage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { EarlyPartnerPage } from "@/pages/EarlyPartnerPage";

/* Every route the site has, and the chrome each one wears:

   RootLayout            scroll reset + ScrollTrigger refresh; draws nothing
     SiteLayout          the marketing site's one continuous scene
       MarketingLayout     full-bleed scroll + floating readouts
       FunnelLayout        narrow column, language switch, site footer
       DocumentLayout      reading column, reduced footer
     DeckLayout          its own scene, its own canvas, no site chrome

   The two scene-owning layouts are siblings, so moving between the site and
   the deck unmounts one canvas and mounts the other. That is the point: they
   are different roads, and building a second renderer over a live WebGL
   context raises INVALID_OPERATION on every swap.

   Within the site the scene persists, and how it is framed is declared here as
   `handle` rather than worked out from the pathname at render time. */

const ambient: SceneHandle = { ambient: true };

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <SiteLayout />,
        children: [
          {
            element: <MarketingLayout />,
            children: [{ index: true, element: <LandingPage /> }],
          },
          {
            element: <FunnelLayout />,
            handle: ambient,
            children: [{ path: "subscribe", element: <SubscribePage /> }],
          },
          {
            element: <DocumentLayout />,
            handle: ambient,
            children: [{ path: "privacy", element: <PrivacyPage /> }],
          },
        ],
      },
      {
        element: <DeckLayout />,
        children: [{ path: "early-partner", element: <EarlyPartnerPage /> }],
      },
      // Anything else is a mistyped or stale URL; the landing page is the site.
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];
