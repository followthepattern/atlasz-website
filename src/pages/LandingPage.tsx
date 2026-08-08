import { Hero } from "@/components/Hero";
import { TruckOverlay } from "@/components/TruckOverlay";
import { RouteEconomics } from "@/components/RouteEconomics";
import { Features } from "@/components/Features";
import { Integrations } from "@/components/Integrations";
import { References } from "@/components/References";
import { Onboarding } from "@/components/Onboarding";
import { Footer } from "@/components/Footer";
import { navigate } from "@/router";

/** The marketing scroll — the only page whose scroll drives the 3D scene. */
export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Only over the marketing scroll — every other page parks the scene in
          an ambient framing these readouts would no longer describe. */}
      <TruckOverlay />
      <Hero onHome={() => navigate("landing")} onStart={() => navigate("subscribe")} />
      <RouteEconomics />
      <Features />
      <Onboarding />
      <Integrations />
      <References />
      <Footer />
    </div>
  );
}
