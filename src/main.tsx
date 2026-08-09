import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";
import { ScrollProvider } from "./motion/ScrollProvider";
import "./i18n/config";
import "./styles/globals.css";

/* Real paths rather than hashes, so the router needs the host to serve
   index.html for unknown paths. See vercel.json, and the deploy notes in the
   README for static hosts that need it configured by hand. */
const router = createBrowserRouter(routes);

/* ScrollProvider wraps the router rather than sitting inside it: it owns a
   single Lenis instance and GSAP's ticker, both of which must survive
   navigation. Rebuilding them per route would restart smooth scrolling
   mid-journey. */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ScrollProvider>
      <RouterProvider router={router} />
    </ScrollProvider>
  </React.StrictMode>,
);
