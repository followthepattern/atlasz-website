import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { compactMoney } from "@/i18n/format";
import { FLOATING_SHELL, useTruckAnchor } from "./useTruckAnchor";

/* Eight months of fleet income and cost, in euros. Fixed rather than derived
   from today's date so the chart is identical on every load. */
const MONTHS = [
  { month: 0, income: 96_000, cost: 68_000 },
  { month: 1, income: 104_000, cost: 72_000 },
  { month: 2, income: 118_000, cost: 79_000 },
  { month: 3, income: 112_000, cost: 76_000 },
  { month: 4, income: 131_000, cost: 86_000 },
  { month: 5, income: 142_000, cost: 92_000 },
  { month: 6, income: 138_000, cost: 89_000 },
  { month: 7, income: 156_000, cost: 98_000 },
] as const;

const PEAK = Math.max(...MONTHS.map((m) => m.income));
const TOTAL_PROFIT = MONTHS.reduce((sum, m) => sum + (m.income - m.cost), 0);

/**
 * Monthly income against cost, riding beside the truck.
 *
 * Deliberately frameless — no panel, no border. It is instrumentation drifting
 * over the scene rather than a card sitting on the page, and a surface behind it
 * would only reintroduce the contrast problem the readouts were moved into the
 * background to avoid.
 *
 * Each bar is a month's income; the green portion is what was left after costs.
 * Month names come from Intl, so they follow the active language without adding
 * a single translation key.
 */
export function MonthlyPerformance() {
  const { t, i18n } = useTranslation();
  const wrapperRef = useTruckAnchor<HTMLDivElement>();
  const language = i18n.language;

  const labels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(
      language.startsWith("hu") ? "hu-HU" : "en-US",
      { month: "short" },
    );
    // Explicit date parts: the series is fixed, so it must not shift with today.
    return MONTHS.map((m) => formatter.format(new Date(2026, m.month, 1)));
  }, [language]);

  return (
    <div ref={wrapperRef} aria-hidden="true" className={FLOATING_SHELL}>
      {/* Left of the cab and dropped below it, into the band under the CTA —
          high enough and it sits straight across the headline block. */}
      <div className="w-[380px] -translate-x-[104%] translate-y-[36%]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-fg">
            {compactMoney(TOTAL_PROFIT, language)}
          </span>
          <span className="text-xs text-muted">{t("routeEconomics.profit")}</span>
        </div>

        <div className="mt-4 flex h-40 items-end gap-2">
          {MONTHS.map((m) => {
            const profitShare = ((m.income - m.cost) / m.income) * 100;
            return (
              <div
                key={m.month}
                className="flex w-full flex-1 flex-col overflow-hidden rounded-[3px]"
                style={{ height: `${(m.income / PEAK) * 100}%` }}
              >
                <span className="w-full bg-positive" style={{ height: `${profitShare}%` }} />
                <span className="w-full bg-fg/25" style={{ height: `${100 - profitShare}%` }} />
              </div>
            );
          })}
        </div>

        {/* Separate row so the bars' percentage heights stay true. */}
        <div className="mt-2 flex gap-2 border-t border-hairline pt-2">
          {labels.map((label, i) => (
            <span
              key={MONTHS[i].month}
              className="flex-1 text-center text-[10px] uppercase tracking-wide text-muted"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            <span className="text-muted">{t("routeEconomics.profit")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-fg/25" />
            <span className="text-muted">{t("routeEconomics.cost")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
