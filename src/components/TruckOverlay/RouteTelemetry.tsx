import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useScrollStore } from "@/motion/ScrollProvider";
import { decimal } from "@/i18n/format";

/* Figures the card reports as the truck runs the route. A demonstration of
   what atlasz tracks, not live data. */
const TANK_FULL = 82;
const TANK_ON_ARRIVAL = 43;
const CONSUMPTION_FROM = 27.6;
const CONSUMPTION_TO = 29.4;

/**
 * Origin, destination, tank level and consumption.
 *
 * Positioning belongs to the group in TruckOverlay, not here — the readouts
 * have to travel together.
 */
export function RouteTelemetry() {
  const { t, i18n } = useTranslation();
  const scroll = useScrollStore();

  const statusRef = useRef<HTMLSpanElement>(null);
  const tankBarRef = useRef<HTMLSpanElement>(null);
  const tankRef = useRef<HTMLElement>(null);
  const consumptionRef = useRef<HTMLElement>(null);

  // Held in refs so the per-frame writer never needs rebinding on re-render.
  const languageRef = useRef(i18n.language);
  languageRef.current = i18n.language;
  const labelsRef = useRef({ enRoute: "", arrived: "" });
  labelsRef.current = {
    enRoute: t("telemetry.status.enRoute"),
    arrived: t("telemetry.status.arrived"),
  };

  useEffect(() => {
    return scroll.subscribe((progress) => {
      const p = Math.min(1, Math.max(0, progress));
      const tank = TANK_FULL + (TANK_ON_ARRIVAL - TANK_FULL) * p;
      const consumption = CONSUMPTION_FROM + (CONSUMPTION_TO - CONSUMPTION_FROM) * p;

      if (tankRef.current) {
        tankRef.current.textContent = `${decimal(tank, languageRef.current, 0)}%`;
      }
      if (tankBarRef.current) tankBarRef.current.style.width = `${tank}%`;
      if (consumptionRef.current) {
        consumptionRef.current.textContent = `${decimal(consumption, languageRef.current, 1)} l/100 km`;
      }
      if (statusRef.current) {
        statusRef.current.textContent =
          p > 0.985 ? labelsRef.current.arrived : labelsRef.current.enRoute;
      }
    });
  }, [scroll]);

  return (
    <div className="glass-quiet w-full rounded-xl p-3">
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
  );
}
