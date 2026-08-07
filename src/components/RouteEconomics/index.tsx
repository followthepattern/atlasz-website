import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { SplitText } from "@/motion/SplitText";
import { useReveal } from "@/motion/useReveal";
import { usePrefersReducedMotion } from "@/motion/usePrefersReducedMotion";
import { EconomicsView } from "./EconomicsView";
import { ChatView } from "./ChatView";
import { CaptureView } from "./CaptureView";

type Tab = "economics" | "chat" | "capture";

// Compact icons used in place of the tab labels on small screens.
function TabIcon({ tab, className = "" }: { tab: Tab; className?: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  if (tab === "economics") {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="M7 16v-5" />
        <path d="M12 16v-9" />
        <path d="M17 16v-3" />
      </svg>
    );
  }
  if (tab === "chat") {
    return (
      <svg {...common}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M10 12h5" />
      <path d="M10 16h5" />
    </svg>
  );
}

// How long each tab stays on screen before the slideshow advances — tuned so
// each tab's own animation has time to play through once.
const DWELL: Record<Tab, number> = { economics: 7000, chat: 11000, capture: 9500 };

export function RouteEconomics() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const [tab, setTab] = useState<Tab>("economics");
  const [auto, setAuto] = useState(true);
  const [hovering, setHovering] = useState(false);
  const tabs: Tab[] = ["economics", "chat", "capture"];
  const revealRef = useReveal<HTMLElement>();

  // Slideshow: gently auto-advance through the tabs. Pauses while hovered and
  // stops for good once the visitor interacts; off when motion is reduced.
  useEffect(() => {
    if (reduce || !auto || hovering) return;
    const id = setTimeout(
      () => setTab((cur) => tabs[(tabs.indexOf(cur) + 1) % tabs.length]),
      DWELL[tab]
    );
    return () => clearTimeout(id);
  }, [tab, auto, hovering, reduce]);

  return (
    <section ref={revealRef} className="mx-auto w-full max-w-5xl px-6 py-24">
      <div key={`lead-${tab}`} className="tab-fade flex max-w-xl flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t(`routeEconomics.leads.${tab}.eyebrow`)}
        </span>
        <Heading className="text-3xl sm:text-4xl">
          {/* Re-keyed by tab above, so this replays with each slideshow change. */}
          <SplitText text={t(`routeEconomics.leads.${tab}.heading`)} immediate />
        </Heading>
        <Text className="text-base">{t(`routeEconomics.leads.${tab}.subtitle`)}</Text>
      </div>

      <div
        data-reveal
        className="glass mt-8 overflow-hidden rounded-2xl"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setAuto(false)}
      >
        <div className="flex items-center justify-center gap-3 border-b border-hairline px-5 py-3 sm:justify-between">
          <div
            role="tablist"
            aria-label={t("routeEconomics.tablist")}
            className="flex items-center gap-0.5 rounded-md border border-hairline p-0.5 text-xs"
          >
            {tabs.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  setAuto(false);
                  setTab(key);
                }}
                aria-label={t(`routeEconomics.tabs.${key}`)}
                title={t(`routeEconomics.tabs.${key}`)}
                className={`inline-flex items-center justify-center gap-1.5 rounded px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tab === key ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <TabIcon tab={key} className="sm:hidden" />
                <span className="hidden sm:inline">{t(`routeEconomics.tabs.${key}`)}</span>
              </button>
            ))}
          </div>
          {tab === "economics" && (
            <span className="hidden rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted sm:inline">
              {t("routeEconomics.period")}
            </span>
          )}
        </div>

        <div key={tab} className="tab-fade">
          {tab === "economics" && <EconomicsView />}
          {tab === "chat" && <ChatView />}
          {tab === "capture" && <CaptureView />}
        </div>
      </div>
    </section>
  );
}
