import { Hero } from "@/components/Hero";
import { RouteEconomics } from "@/components/RouteEconomics";
import { Features } from "@/components/Features";
import { Integrations } from "@/components/Integrations";
import { References } from "@/components/References";
import { Onboarding } from "@/components/Onboarding";

/** The marketing scroll — the sections whose scroll drives the truck. */
export function LandingPage() {
  return (
    <>
      <Hero />
      <RouteEconomics />
      <Features />
      <Onboarding />
      <Integrations />
      <References />
    </>
  );
}
