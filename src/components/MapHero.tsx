// Abstract animated map for the hero background. Pure SVG: a blind map of
// Europe (country-border outlines, no labels) with trucks that travel along
// route paths, plus fixed, non-interactive info cards.

import { EUROPE_PATHS } from "./europeMap";

const W = 1440;
const H = 720;

// Corridors the trucks travel along (also drawn as faint flowing roads).
const ROUTES: { id: string; d: string }[] = [
  { id: "route-1", d: "M -60 530 C 220 430, 380 470, 560 360 S 940 250, 1140 256 S 1440 180, 1520 150" },
  { id: "route-2", d: "M 1520 120 C 1220 220, 1040 200, 860 320 S 520 470, 320 478 S 40 560, -60 612" },
  { id: "route-3", d: "M 150 -60 C 230 210, 430 300, 520 470 S 770 700, 900 800" },
  { id: "route-4", d: "M 1520 430 C 1240 470, 1080 520, 900 540 S 520 610, 300 648 S 40 706, -60 730" },
  { id: "route-5", d: "M -60 230 C 270 250, 470 190, 700 230 S 1120 300, 1520 286" },
];

const TRUCKS: { route: string; dur: number; begin: number }[] = [
  { route: "route-1", dur: 30, begin: 0 },
  { route: "route-1", dur: 30, begin: 15 },
  { route: "route-2", dur: 38, begin: 7 },
  { route: "route-3", dur: 24, begin: 3 },
  { route: "route-4", dur: 34, begin: 18 },
  { route: "route-5", dur: 28, begin: 11 },
];

function Truck({ route, dur, begin }: { route: string; dur: number; begin: number }) {
  return (
    <g>
      <circle r="6" fill="none" stroke="var(--fg)" strokeWidth="1">
        <animate attributeName="r" values="4;12;4" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle r="3.2" fill="var(--fg)" />
      {/* Negative begin offsets stagger the trucks along the same corridor. */}
      <animateMotion dur={`${dur}s`} begin={`-${begin}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${route}`} />
      </animateMotion>
    </g>
  );
}

// Fixed, non-interactive context card pinned over the map.
function TruckCard({
  plate,
  status,
  tone,
  from,
  to,
  metricLabel,
  metricValue,
  className = "",
}: {
  plate: string;
  status: string;
  tone: "positive" | "muted";
  from: string;
  to: string;
  metricLabel: string;
  metricValue: string;
  className?: string;
}) {
  const badge =
    tone === "positive"
      ? "bg-positive-bg text-positive"
      : "bg-fg/10 text-muted";
  return (
    <div className={`pointer-events-none absolute z-20 w-52 select-none ${className}`}>
      <div className="rounded-lg border border-hairline bg-canvas/80 p-3 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fg/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-fg" />
            </span>
            {plate}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge}`}>
            {status}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="text-fg">{from}</span>
          <span className="text-muted">→</span>
          <span className="text-fg">{to}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted">
          {metricLabel}: <span className="text-fg">{metricValue}</span>
        </div>
      </div>
    </div>
  );
}

export function MapHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Blind map of Europe: country borders as faint lines. */}
        <g stroke="var(--fg)" strokeOpacity="0.11" strokeWidth="1" strokeLinejoin="round">
          {EUROPE_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Truck corridors: faint roads with a flowing dash for a sense of motion. */}
        {ROUTES.map((r, i) => (
          <path
            key={r.id}
            id={r.id}
            d={r.d}
            stroke="var(--fg)"
            strokeOpacity="0.14"
            strokeWidth="2"
            strokeDasharray="2 12"
            className="route-flow"
            style={{ animationDuration: `${5 + i}s` }}
          />
        ))}

        {TRUCKS.map((t, i) => (
          <Truck key={i} {...t} />
        ))}
      </svg>

      {/* Fade the map into the page so the hero copy stays legible. */}
      <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />

      {/* Fixed, non-clickable truck context cards. */}
      <TruckCard
        plate="AI MI 333"
        status="En route"
        tone="positive"
        from="Budapest"
        to="Vienna"
        metricLabel="ETA"
        metricValue="1h 12m"
        className="right-[6%] top-[16%] hidden md:block"
      />
      <TruckCard
        plate="AI MI 118"
        status="Loading"
        tone="muted"
        from="Debrecen"
        to="Kraków"
        metricLabel="Cargo"
        metricValue="18.4 t"
        className="right-[18%] top-[54%] hidden lg:block"
      />
      <TruckCard
        plate="AI MI 077"
        status="En route"
        tone="positive"
        from="Szeged"
        to="Munich"
        metricLabel="Speed"
        metricValue="82 km/h"
        className="right-[40%] top-[30%] hidden xl:block"
      />
    </div>
  );
}
