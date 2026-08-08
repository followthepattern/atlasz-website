import { useEffect, useState } from "react";

/* Hash routing, hand-rolled. The site is four pages with no nesting, no params
   and no data loading, which is a long way short of what a router library is
   for — and this is the mechanism #privacy already used before there was a
   router at all. */

export type Route = "landing" | "subscribe" | "privacy" | "early-partner";

/* The landing page is the bare URL, deliberately. It has been shareable without
   a fragment since before there was a router, and giving it one now would
   quietly break every link already in the wild. */
const HASH: Record<Route, string> = {
  landing: "",
  subscribe: "#subscribe",
  privacy: "#privacy",
  // Unlisted. Nothing links here; it is opened directly, to present from.
  "early-partner": "#early-partner",
};

const BY_HASH = new Map<string, Route>(
  (Object.entries(HASH) as [Route, string][]).map(([route, hash]) => [hash, route]),
);

function currentRoute(): Route {
  return BY_HASH.get(window.location.hash) ?? "landing";
}

/* Neither pushState nor replaceState fires an event, so a programmatic
   navigate has to tell the mounted hooks itself. Anchors and the back button
   arrive through hashchange/popstate as usual. */
const subscribers = new Set<() => void>();

export function navigate(route: Route) {
  const url = window.location.pathname + window.location.search + HASH[route];
  // Landing replaces rather than pushes: going back from the top of the site
  // should leave it, not walk back through every page the visitor bounced off.
  if (route === "landing") window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  for (const notify of subscribers) notify();
}

export function useRoute(): Route {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    subscribers.add(sync);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    // The hash can have changed between the initial render and this effect.
    sync();
    return () => {
      subscribers.delete(sync);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return route;
}
