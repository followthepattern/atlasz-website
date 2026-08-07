import { useTranslation } from "react-i18next";
import { decimal, money } from "@/i18n/format";
import { FLOATING_SHELL, useTruckAnchor } from "./useTruckAnchor";

/* The Budapest → Vienna figures from the route economics section, so the
   floating readout and the section further down the page can never disagree. */
const INCOME = 1850;
const COSTS = [
  { key: "fuel", value: 520, opacity: 0.92 },
  { key: "tolls", value: 180, opacity: 0.6 },
  { key: "driver", value: 360, opacity: 0.4 },
  { key: "other", value: 110, opacity: 0.24 },
] as const;

const TOTAL_COST = COSTS.reduce((sum, cost) => sum + cost.value, 0);
const PROFIT = INCOME - TOTAL_COST;
const MARGIN = (PROFIT / INCOME) * 100;

/**
 * Income against costs, in the shape of a consumer banking breakdown: one
 * headline figure, a single stacked bar, and a short ledger.
 *
 * The figures are the trip's, and they are fixed. An earlier version accrued
 * costs with scroll position, which meant the card opened the page reading
 * "€1,850 · 100.0% margin" — a number that is true only before any cost has
 * landed, and reads as a claim. The vehicle's own live readings are the
 * telemetry card's job; this one states what the run earns.
 */
export function TripEconomics() {
  const { t, i18n } = useTranslation();
  const wrapperRef = useTruckAnchor<HTMLDivElement>();
  const language = i18n.language;

  return (
    <div ref={wrapperRef} aria-hidden="true" className={FLOATING_SHELL}>
      {/* Down and to the left of the cab: beside the vehicle, but low enough to
          clear the headline block the truck sits alongside. */}
      <div className="glass-quiet w-64 -translate-x-[102%] translate-y-[52%] rounded-xl p-3.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {t("routeEconomics.leads.economics.eyebrow")}
        </span>

        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xl font-semibold tabular-nums tracking-tight text-fg">
            {money(PROFIT, language)}
          </span>
          <span className="text-xs tabular-nums text-positive">
            {decimal(MARGIN, language, 1)}%
          </span>
        </div>
        <span className="text-[11px] text-muted">
          {t("routeEconomics.profit")} · {t("routeEconomics.margin")}
        </span>

        {/* Costs from the left, profit is what is left of the income. */}
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-fg/10">
          {COSTS.map((cost) => (
            <span
              key={cost.key}
              className="bg-accent"
              style={{ width: `${(cost.value / INCOME) * 100}%`, opacity: cost.opacity }}
            />
          ))}
          <span
            className="bg-positive"
            style={{ width: `${(PROFIT / INCOME) * 100}%` }}
          />
        </div>

        <dl className="mt-3 flex flex-col gap-1 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">{t("routeEconomics.income")}</dt>
            <dd className="tabular-nums text-fg">{money(INCOME, language)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">{t("routeEconomics.cost")}</dt>
            <dd className="tabular-nums text-fg">{money(TOTAL_COST, language)}</dd>
          </div>
        </dl>

        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline pt-2 text-[11px]">
          {COSTS.map((cost) => (
            <span key={cost.key} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                style={{ opacity: cost.opacity }}
              />
              <span className="text-muted">{t(`routeEconomics.costs.${cost.key}`)}</span>
              <span className="tabular-nums text-fg">{money(cost.value, language)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
