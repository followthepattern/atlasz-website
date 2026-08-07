import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useScrollStore } from "@/motion/ScrollProvider";
import { truckScreen } from "@/scene/truckScreen";

/* Figures the card reports as the truck runs the route. These are a
   demonstration of what atlasz tracks, not live data. */
const TANK_FULL = 82;
const TANK_ON_ARRIVAL = 43;
const CONSUMPTION_FROM = 27.6;
const CONSUMPTION_TO = 29.4;

/**
 * Floating telemetry card, pinned above the truck.
 *
 * Position and values are written straight to the DOM rather than held in
 * React state: both update every frame, and a re-render per frame would put the
 * whole page's reconciliation in the animation loop. The card only ever renders
 * when its labels or the language change.
 */
export function RouteTelemetry() {
  const { t, i18n } = useTranslation();
  const scroll = useScrollStore();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const tankBarRef = useRef<HTMLSpanElement>(null);
  // <dd> maps to HTMLElement in React's JSX types, not a more specific one.
  const tankRef = useRef<HTMLElement>(null);
  const consumptionRef = useRef<HTMLElement>(null);

  // Track the language in a ref so the per-frame writer never needs re-binding.
  const languageRef = useRef(i18n.language);
  languageRef.current = i18n.language;
  const labelsRef = useRef({ enRoute: "", arrived: "" });
  labelsRef.current = {
    enRoute: t("telemetry.status.enRoute"),
    arrived: t("telemetry.status.arrived"),
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const format = (value: number, digits: number) =>
      new Intl.NumberFormat(languageRef.current.startsWith("hu") ? "hu-HU" : "en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);

    const writeValues = (progress: number) => {
      const p = Math.min(1, Math.max(0, progress));
      const tank = TANK_FULL + (TANK_ON_ARRIVAL - TANK_FULL) * p;
      const consumption = CONSUMPTION_FROM + (CONSUMPTION_TO - CONSUMPTION_FROM) * p;

      if (tankRef.current) tankRef.current.textContent = `${format(tank, 0)}%`;
      if (tankBarRef.current) tankBarRef.current.style.width = `${tank}%`;
      if (consumptionRef.current) {
        consumptionRef.current.textContent = `${format(consumption, 1)} l/100 km`;
      }
      if (statusRef.current) {
        statusRef.current.textContent =
          p > 0.985 ? labelsRef.current.arrived : labelsRef.current.enRoute;
      }
    };

    const unsubscribeScroll = scroll.subscribe(writeValues);

    const unsubscribePosition = truckScreen.subscribe(({ x, y, visible }) => {
      wrapper.style.opacity = visible ? "1" : "0";
      // translate3d keeps this on the compositor; the card is repositioned every
      // frame and must never trigger layout.
      wrapper.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    });

    return () => {
      unsubscribeScroll();
      unsubscribePosition();
    };
  }, [scroll]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-20 hidden opacity-0 transition-opacity duration-500 md:block"
      style={{ transform: "translate3d(-9999px, -9999px, 0)" }}
    >
      <div className="glass w-60 -translate-x-1/2 -translate-y-[135%] rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
          <span
            ref={statusRef}
            className="text-[10px] font-medium uppercase tracking-wide text-muted"
          />
        </div>

        <div className="mt-1.5 text-sm text-fg">
          {t("routeEconomics.routes.bud-vie.from")}
          <span className="mx-1 text-muted">→</span>
          {t("routeEconomics.routes.bud-vie.to")}
        </div>

        <dl className="mt-3 flex flex-col gap-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">{t("telemetry.metrics.tank")}</dt>
            <dd ref={tankRef} className="tabular-nums text-fg" />
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-fg/10">
            <span ref={tankBarRef} className="block h-full rounded-full bg-fg/55" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">{t("telemetry.metrics.consumption")}</dt>
            <dd ref={consumptionRef} className="tabular-nums text-fg" />
          </div>
        </dl>
      </div>
    </div>
  );
}
