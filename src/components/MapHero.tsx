// Abstract animated map for the hero background. Pure SVG: a blind map of
// Europe (country-border outlines, no labels) with trucks travelling along
// corridors between real cities. Floating info cards are anchored to the
// actual city locations on the map: each card's screen position is derived
// from the SVG's live coordinate transform, so it tracks the map at any size.

import { useLayoutEffect, useRef, useState } from "react";
import { EUROPE_PATHS, CITIES } from "./europeMap";

const W = 1440;
const H = 720;

type CityName = keyof typeof CITIES;

// Gentle arc between two cities (perpendicular bow controlled by `bend`).
function arc(from: CityName, to: CityName, bend: number) {
  const [ax, ay] = CITIES[from];
  const [bx, by] = CITIES[to];
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * bend;
  const oy = (dx / len) * bend;
  return `M ${ax} ${ay} Q ${(mx + ox).toFixed(1)} ${(my + oy).toFixed(1)} ${bx} ${by}`;
}

// Truck corridors. The first three match the info cards; the rest are ambient.
const ROUTES: { id: string; from: CityName; to: CityName; bend: number }[] = [
  { id: "route-bud-vie", from: "Budapest", to: "Vienna", bend: -30 },
  { id: "route-deb-krk", from: "Debrecen", to: "Krakow", bend: 38 },
  { id: "route-sze-muc", from: "Szeged", to: "Munich", bend: -52 },
  { id: "route-war-bud", from: "Warsaw", to: "Budapest", bend: 54 },
  { id: "route-pra-buc", from: "Prague", to: "Bucharest", bend: -64 },
  { id: "route-mil-zag", from: "Milan", to: "Zagreb", bend: 26 },
];

const ROUTE_D: Record<string, string> = Object.fromEntries(
  ROUTES.map((r) => [r.id, arc(r.from, r.to, r.bend)])
);

const TRUCKS: { route: string; dur: number; begin: number }[] = [
  { route: "route-bud-vie", dur: 16, begin: 0 },
  { route: "route-deb-krk", dur: 26, begin: 5 },
  { route: "route-sze-muc", dur: 30, begin: 12 },
  { route: "route-war-bud", dur: 24, begin: 3 },
  { route: "route-pra-buc", dur: 34, begin: 16 },
  { route: "route-mil-zag", dur: 20, begin: 8 },
];

// Small static node at every city a corridor touches.
const NODE_CITIES = Array.from(
  new Set(ROUTES.flatMap((r) => [r.from, r.to]))
) as CityName[];

// Cities highlighted with a pulsing pin because a card is anchored to them.
const ANCHOR_CITIES: CityName[] = ["Vienna", "Krakow", "Munich"];

function Truck({ route, dur, begin }: { route: string; dur: number; begin: number }) {
  return (
    <g>
      <circle r="6" fill="none" stroke="var(--fg)" strokeWidth="1">
        <animate attributeName="r" values="4;12;4" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle r="3.2" fill="var(--fg)" />
      {/* Negative begin offsets stagger trucks along the same corridor. */}
      <animateMotion dur={`${dur}s`} begin={`-${begin}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${route}`} />
      </animateMotion>
    </g>
  );
}

// Fixed, non-interactive context card pinned to a city on the map.
function TruckCard({
  plate,
  status,
  tone,
  from,
  to,
  metricLabel,
  metricValue,
  style,
  className = "",
}: {
  plate: string;
  status: string;
  tone: "positive" | "muted";
  from: string;
  to: string;
  metricLabel: string;
  metricValue: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const badge =
    tone === "positive" ? "bg-positive-bg text-positive" : "bg-fg/10 text-muted";
  return (
    <div
      className={`pointer-events-none absolute z-20 w-52 select-none ${className}`}
      style={style}
    >
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

// Card box size (w-52 = 208px; height is roughly constant for this layout),
// used to draw the leader line to the nearest edge of the card.
const CARD_W = 208;
const CARD_H = 82;

// Closest point on the card rectangle to the city pin — where the leader
// line attaches so it never crosses the card.
function leaderTarget(p: { x: number; y: number }, off: { x: number; y: number }) {
  const L = p.x + off.x;
  const T = p.y + off.y;
  const tx = Math.min(Math.max(p.x, L), L + CARD_W);
  const ty = Math.min(Math.max(p.y, T), T + CARD_H);
  return { x: tx, y: ty };
}

// Each card hangs off a real city. `off` nudges it clear of the pin (in px,
// applied after the map-to-screen transform).
const CARDS: {
  key: string;
  anchor: CityName;
  off: { x: number; y: number };
  className: string;
  plate: string;
  status: string;
  tone: "positive" | "muted";
  from: string;
  to: string;
  metricLabel: string;
  metricValue: string;
}[] = [
  {
    key: "vie",
    anchor: "Vienna",
    off: { x: -64, y: -208 },
    className: "hidden md:block",
    plate: "AI MI 333",
    status: "En route",
    tone: "positive",
    from: "Budapest",
    to: "Vienna",
    metricLabel: "ETA",
    metricValue: "1h 12m",
  },
  {
    key: "krk",
    anchor: "Krakow",
    off: { x: 22, y: -8 },
    className: "hidden lg:block",
    plate: "AI MI 118",
    status: "Loading",
    tone: "muted",
    from: "Debrecen",
    to: "Kraków",
    metricLabel: "Cargo",
    metricValue: "18.4 t",
  },
  {
    key: "muc",
    anchor: "Munich",
    off: { x: -104, y: 46 },
    className: "hidden xl:block",
    plate: "AI MI 077",
    status: "En route",
    tone: "positive",
    from: "Szeged",
    to: "Munich",
    metricLabel: "Speed",
    metricValue: "82 km/h",
  },
];

// Map the anchor cities' viewBox coordinates to pixel positions inside the
// hero, using the SVG's live screen CTM so cards stay aligned under the
// `slice` scaling at any container size.
function useAnchorPositions(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const compute = () => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const rect = svg.getBoundingClientRect();
      const pt = svg.createSVGPoint();
      const next: Record<string, { x: number; y: number }> = {};
      for (const name of ANCHOR_CITIES) {
        const [x, y] = CITIES[name];
        pt.x = x;
        pt.y = y;
        const p = pt.matrixTransform(ctm);
        next[name] = { x: p.x - rect.left, y: p.y - rect.top };
      }
      setPos(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(svg);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [svgRef]);

  return pos;
}

export function MapHero() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pos = useAnchorPositions(svgRef);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        ref={svgRef}
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
            d={ROUTE_D[r.id]}
            stroke="var(--fg)"
            strokeOpacity="0.16"
            strokeWidth="1.6"
            strokeDasharray="2 11"
            className="route-flow"
            style={{ animationDuration: `${5 + i}s` }}
          />
        ))}

        {/* City nodes. */}
        <g fill="var(--fg)">
          {NODE_CITIES.map((name) => {
            const [x, y] = CITIES[name];
            return <circle key={name} cx={x} cy={y} r="2.2" fillOpacity="0.5" />;
          })}
        </g>

        {/* Pulsing pins for the cities the cards point at. */}
        {ANCHOR_CITIES.map((name) => {
          const [x, y] = CITIES[name];
          return (
            <g key={name}>
              <circle cx={x} cy={y} r="4" fill="none" stroke="var(--fg)" strokeWidth="1">
                <animate attributeName="r" values="3;11;3" dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r="3" fill="var(--fg)" />
            </g>
          );
        })}

        {TRUCKS.map((t, i) => (
          <Truck key={i} {...t} />
        ))}
      </svg>

      {/* Fade the map into the page so the hero copy stays legible. */}
      <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />

      {/* Leader lines tying each card to its city pin. Drawn above the fade
          but below the cards. Pixel coordinates (no viewBox). */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
        {CARDS.map((c) => {
          const p = pos[c.anchor];
          if (!p) return null;
          const t = leaderTarget(p, c.off);
          return (
            <g key={c.key} className={c.className}>
              <line
                x1={p.x}
                y1={p.y}
                x2={t.x}
                y2={t.y}
                stroke="var(--fg)"
                strokeOpacity="0.34"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={t.x} cy={t.y} r="2" fill="var(--fg)" fillOpacity="0.4" />
            </g>
          );
        })}
      </svg>

      {/* City-anchored truck context cards. */}
      {CARDS.map((c) => {
        const p = pos[c.anchor];
        return (
          <TruckCard
            key={c.key}
            plate={c.plate}
            status={c.status}
            tone={c.tone}
            from={c.from}
            to={c.to}
            metricLabel={c.metricLabel}
            metricValue={c.metricValue}
            className={c.className}
            style={
              p
                ? { left: p.x + c.off.x, top: p.y + c.off.y }
                : { left: -9999, top: -9999 }
            }
          />
        );
      })}
    </div>
  );
}
