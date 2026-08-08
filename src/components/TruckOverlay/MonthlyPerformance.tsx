import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { compactMoney } from "@/i18n/format";

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

const TOTAL_PROFIT = MONTHS.reduce((sum, m) => sum + (m.income - m.cost), 0);

/* Plot geometry, in the SVG's own units. */
const W = 300;
const H = 118;
/* Zero-based, with headroom — a cropped baseline would exaggerate the trend. */
const SCALE_MAX = 168_000;

type Point = [number, number];

function toPoints(pick: (m: (typeof MONTHS)[number]) => number): Point[] {
  return MONTHS.map((m, i) => [
    (i / (MONTHS.length - 1)) * W,
    H - (pick(m) / SCALE_MAX) * H,
  ]);
}

/**
 * Smooths through the points with horizontal control tangents. Straight
 * segments read as sampled readings; this reads as a trend, which is what a
 * month-over-month line is for.
 */
function smoothPath(points: Point[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mid = (x0 + x1) / 2;
    d += ` C ${mid} ${y0} ${mid} ${y1} ${x1} ${y1}`;
  }
  return d;
}

/**
 * Monthly income against cost as a line chart, pinned to the right margin.
 *
 * The shaded band between the two lines is the profit — the gap is the point,
 * so it is drawn rather than left to be inferred.
 *
 * Frameless by design: instrumentation drifting over the scene, not a card on
 * the page. Positioning belongs to the group in TruckOverlay — this travels
 * with the telemetry card rather than anchoring itself.
 */
export function MonthlyPerformance() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const labels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(
      language.startsWith("hu") ? "hu-HU" : "en-US",
      { month: "short" },
    );
    // Explicit date parts: the series is fixed, so it must not shift with today.
    return MONTHS.map((m) => formatter.format(new Date(2026, m.month, 1)));
  }, [language]);

  const incomePoints = useMemo(() => toPoints((m) => m.income), []);
  const costPoints = useMemo(() => toPoints((m) => m.cost), []);

  const incomePath = smoothPath(incomePoints);
  const costPath = smoothPath(costPoints);
  // Forward along income, back along cost: the enclosed area is the margin.
  const bandPath = `${incomePath} L ${costPoints[costPoints.length - 1].join(" ")} ${smoothPath(
    [...costPoints].reverse(),
  ).replace(/^M/, "L")} Z`;

  // Cost, filled down to the baseline. Without it the zero-based scale leaves
  // the lower half of the plot empty and the lines float away from the axis.
  const costArea = `${costPath} L ${W} ${H} L 0 ${H} Z`;

  const lastIncome = incomePoints[incomePoints.length - 1];
  const lastCost = costPoints[costPoints.length - 1];

  return (
    <div className="relative w-full">
      {/* Feathered pool of page colour. Frameless still, but the chart was
          washing out wherever it crossed the truck or the treeline. */}
      <div
        className="ambient-scrim pointer-events-none absolute -inset-x-6 -inset-y-5"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-fg">
            {compactMoney(TOTAL_PROFIT, language)}
          </span>
          <span className="text-xs text-muted">{t("routeEconomics.profit")}</span>
        </div>

        <svg
          viewBox={`0 -6 ${W} ${H + 12}`}
          // Pulled up against the headline. The plot is 118px tall, so this
          // closes the gap by roughly a fifth of the chart's height and sits
          // the figure with the data rather than floating above it.
          className="-mt-2 w-full overflow-visible"
          style={{ height: H }}
        >
          <path d={costArea} fill="var(--fg)" fillOpacity="0.09" />
          <path d={bandPath} fill="var(--positive)" fillOpacity="0.18" />
          <path
            d={incomePath}
            fill="none"
            stroke="var(--fg)"
            strokeWidth="1.75"
            strokeOpacity="0.7"
            strokeLinecap="round"
          />
          <path
            d={costPath}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <circle cx={lastIncome[0]} cy={lastIncome[1]} r="3" fill="var(--fg)" />
          <circle cx={lastCost[0]} cy={lastCost[1]} r="2.5" fill="var(--muted)" />
        </svg>

        <div className="mt-2 flex border-t border-hairline pt-2">
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
            <span className="h-px w-3 bg-fg/70" />
            <span className="text-muted">{t("routeEconomics.income")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-3 bg-muted" />
            <span className="text-muted">{t("routeEconomics.cost")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-[2px] bg-positive/25" />
            <span className="text-muted">{t("routeEconomics.profit")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
