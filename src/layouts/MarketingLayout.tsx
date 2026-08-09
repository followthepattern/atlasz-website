import { Outlet } from "react-router-dom";
import { TruckOverlay } from "@/components/TruckOverlay";
import { Footer } from "@/components/Footer";

/**
 * The scroll-driven marketing pages: full-bleed, with the scene's own readouts
 * floating over it.
 *
 * The readouts belong here rather than to the scene because they only make
 * sense over a page whose scroll drives the truck — parked in an ambient
 * framing they would be describing a journey that is not happening.
 */
export function MarketingLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <TruckOverlay />
      <Outlet />
      <Footer />
    </div>
  );
}
