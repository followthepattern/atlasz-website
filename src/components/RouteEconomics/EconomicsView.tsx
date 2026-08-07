import { useState } from "react";
import { useTranslation } from "react-i18next";

type CostKey = "fuel" | "tolls" | "driver" | "other";

interface Route {
  id: string;
  income: number;
  fuel: number;
  tolls: number;
  driver: number;
  other: number;
}

// Mocked operating figures (EUR) for the marketing showcase.
const ROUTES: Route[] = [
  { id: "bud-vie", income: 1850, fuel: 520, tolls: 180, driver: 360, other: 110 },
  { id: "deb-krk", income: 2180, fuel: 690, tolls: 240, driver: 480, other: 140 },
  { id: "sze-muc", income: 3100, fuel: 880, tolls: 410, driver: 620, other: 170 },
  { id: "gyo-mil", income: 3640, fuel: 1040, tolls: 560, driver: 720, other: 200 },
];

// Costs render as a ramp on the web app's primary series color (var(--accent)
// at descending opacity); profit is var(--positive), the one green wedge — both
// straight from the web app's chart palette. Order drives donut and legend.
const COST_RAMP: { key: CostKey; opacity: number }[] = [
  { key: "fuel", opacity: 0.92 },
  { key: "tolls", opacity: 0.6 },
  { key: "driver", opacity: 0.4 },
  { key: "other", opacity: 0.24 },
];

function money(n: number, language: string) {
  const isHu = language.startsWith("hu");
  return new Intl.NumberFormat(isHu ? "hu-HU" : "en-US", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: isHu ? "narrowSymbol" : "symbol",
    maximumFractionDigits: 0,
  }).format(n);
}

function routeName(id: string, t: ReturnType<typeof useTranslation>["t"]) {
  return {
    from: t(`routeEconomics.routes.${id}.from`),
    to: t(`routeEconomics.routes.${id}.to`),
  };
}

function totals(r: Route) {
  const cost = r.fuel + r.tolls + r.driver + r.other;
  const profit = r.income - cost;
  return { cost, profit, margin: profit / r.income };
}

const R = 62;
const CX = 88;
const STROKE = 20;
const CIRC = 2 * Math.PI * R;
const GAP = 2.5; // px of bare track between wedges

function Donut({ route }: { route: Route }) {
  const { t, i18n } = useTranslation();
  const { cost, profit, margin } = totals(route);

  const segments = [
    { key: "profit", value: profit, color: "var(--positive)", opacity: 1 },
    ...COST_RAMP.map((c) => ({ key: c.key, value: route[c.key], color: "var(--accent)", opacity: c.opacity })),
  ];

  let acc = 0;
  const arcs = segments.map((s) => {
    const len = (s.value / route.income) * CIRC;
    const dash = Math.max(len - GAP, 0.001);
    const arc = { ...s, dasharray: `${dash} ${CIRC - dash}`, offset: -acc };
    acc += len;
    return arc;
  });

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg viewBox="0 0 176 176" className="h-44 w-44 -rotate-90" aria-hidden="true">
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--hairline)" strokeWidth={STROKE} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={CX}
            cy={CX}
            r={R}
            fill="none"
            stroke={a.color}
            strokeOpacity={a.opacity}
            strokeWidth={STROKE}
            strokeDasharray={a.dasharray}
            strokeDashoffset={a.offset}
            strokeLinecap="butt"
            className="transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-fg">{money(profit, i18n.language)}</span>
        <span className="text-xs tabular-nums text-positive">
          {(margin * 100).toFixed(1)}%&nbsp;<span className="text-muted">{t("routeEconomics.margin")}</span>
        </span>
        <span className="sr-only">
          {t("routeEconomics.donutSummary", {
            cost: money(cost, i18n.language),
            income: money(route.income, i18n.language),
          })}
        </span>
      </div>
    </div>
  );
}

export function EconomicsView() {
  const { t, i18n } = useTranslation();
  const [selId, setSelId] = useState(ROUTES[0].id);
  const sel = ROUTES.find((r) => r.id === selId) ?? ROUTES[0];
  const selTotals = totals(sel);
  const selectedRouteName = routeName(sel.id, t);

  const legend = [
    { key: "profit", value: selTotals.profit, color: "var(--positive)", opacity: 1, label: t("routeEconomics.profit") },
    ...COST_RAMP.map((c) => ({
      key: c.key,
      value: sel[c.key],
      color: "var(--accent)",
      opacity: c.opacity,
      label: t(`routeEconomics.costs.${c.key}`),
    })),
  ];

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1.05fr_1fr]">
      {/* Route ledger — pick a route to drive the breakdown. */}
      <div className="flex flex-col gap-2">
        {ROUTES.map((r) => {
          const { profit, margin } = totals(r);
          const name = routeName(r.id, t);
          const selected = r.id === selId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelId(r.id)}
              aria-pressed={selected}
              className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selected ? "border-accent bg-fg/5" : "border-hairline hover:bg-fg/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg">
                  {name.from} <span className="text-muted">→</span> {name.to}
                </span>
                <span className="text-xs tabular-nums text-positive">{Math.round(margin * 100)}%</span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-fg/10">
                <span style={{ width: `${((r.income - profit) / r.income) * 100}%` }} className="bg-accent/35" />
                <span style={{ width: `${(profit / r.income) * 100}%` }} className="bg-positive" />
              </div>
              <div className="flex justify-between text-[11px] tabular-nums text-muted">
                <span>{money(r.income, i18n.language)}</span>
                <span className="text-fg">+{money(profit, i18n.language)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected route breakdown. */}
      <div className="flex flex-col gap-5 rounded-xl border border-hairline bg-canvas/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-fg">
            {selectedRouteName.from} <span className="text-muted">→</span> {selectedRouteName.to}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {t("routeEconomics.income")} <span className="text-fg">{money(sel.income, i18n.language)}</span> ·{" "}
            {t("routeEconomics.cost")} <span className="text-fg">{money(selTotals.cost, i18n.language)}</span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
          <Donut route={sel} />
          <ul className="flex w-full flex-col gap-2">
            {legend.map((item) => (
              <li key={item.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color, opacity: item.opacity }}
                />
                <span className="text-muted">{item.label}</span>
                <span className="ml-auto tabular-nums text-fg">{money(item.value, i18n.language)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
