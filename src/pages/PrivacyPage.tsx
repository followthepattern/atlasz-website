import { Privacy } from "@/components/Privacy";
import { navigate } from "@/router";

/**
 * A route binding and nothing more. `Privacy` is self-contained down to its own
 * reduced footer — a legal page should not carry the site nav that links back
 * to itself — so there is nothing for this page to compose around it.
 */
export function PrivacyPage() {
  return <Privacy onBack={() => navigate("landing")} />;
}
