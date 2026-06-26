import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { Check } from "@/icons";

type CostKey = "fuel" | "tolls" | "driver" | "other";

interface Route {
  id: string;
  from: string;
  to: string;
  income: number;
  fuel: number;
  tolls: number;
  driver: number;
  other: number;
}

// Mocked operating figures (EUR) for the marketing showcase.
const ROUTES: Route[] = [
  { id: "bud-vie", from: "Budapest", to: "Vienna", income: 1850, fuel: 520, tolls: 180, driver: 360, other: 110 },
  { id: "deb-krk", from: "Debrecen", to: "Kraków", income: 2180, fuel: 690, tolls: 240, driver: 480, other: 140 },
  { id: "sze-muc", from: "Szeged", to: "Munich", income: 3100, fuel: 880, tolls: 410, driver: 620, other: 170 },
  { id: "gyo-mil", from: "Győr", to: "Milan", income: 3640, fuel: 1040, tolls: 560, driver: 720, other: 200 },
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

const money = (n: number) => `€${n.toLocaleString("en-US")}`;

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
  const { t } = useTranslation();
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
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-fg">{money(profit)}</span>
        <span className="text-xs tabular-nums text-positive">
          {(margin * 100).toFixed(1)}%&nbsp;<span className="text-muted">{t("routeEconomics.margin")}</span>
        </span>
        <span className="sr-only">
          cost {money(cost)} of {money(route.income)} income
        </span>
      </div>
    </div>
  );
}

function EconomicsView() {
  const { t } = useTranslation();
  const [selId, setSelId] = useState(ROUTES[0].id);
  const sel = ROUTES.find((r) => r.id === selId) ?? ROUTES[0];
  const selTotals = totals(sel);

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
                  {r.from} <span className="text-muted">→</span> {r.to}
                </span>
                <span className="text-xs tabular-nums text-positive">{Math.round(margin * 100)}%</span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-fg/10">
                <span style={{ width: `${((r.income - profit) / r.income) * 100}%` }} className="bg-accent/35" />
                <span style={{ width: `${(profit / r.income) * 100}%` }} className="bg-positive" />
              </div>
              <div className="flex justify-between text-[11px] tabular-nums text-muted">
                <span>{money(r.income)}</span>
                <span className="text-fg">+{money(profit)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected route breakdown. */}
      <div className="flex flex-col gap-5 rounded-xl border border-hairline bg-canvas/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-fg">
            {sel.from} <span className="text-muted">→</span> {sel.to}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {t("routeEconomics.income")} <span className="text-fg">{money(sel.income)}</span> ·{" "}
            {t("routeEconomics.cost")} <span className="text-fg">{money(selTotals.cost)}</span>
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
                <span className="ml-auto tabular-nums text-fg">{money(item.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-fg/5 px-4 py-2.5 text-sm text-fg">
        {children}
      </div>
    </div>
  );
}

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[90%] text-sm leading-relaxed text-fg">{children}</div>;
}

// Echoes the web chat's live-activity chip, shown as a completed step.
function ToolStep({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <span className="inline-block size-1.5 rounded-full bg-fg/40" />
      <span className="rounded-md bg-fg/5 px-1.5 py-0.5 font-mono">{name}</span>
    </div>
  );
}

// Echoes the web chat's typed result card (ApprovalCard).
function InvoiceCard() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-fg">{t("routeEconomics.chat.cardTitle")}</span>
        <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] font-medium text-muted">
          {t("routeEconomics.chat.cardBadge")}
        </span>
      </div>
      <p className="text-sm tabular-nums text-muted">{t("routeEconomics.chat.cardSummary")}</p>
      <div className="flex gap-2">
        <Button variant="primary" type="button">
          {t("routeEconomics.chat.approve")}
        </Button>
        <Button type="button">{t("routeEconomics.chat.review")}</Button>
      </div>
    </div>
  );
}

// Live tool activity while the agent "works" — pulsing dot + mono chip.
function BusyLine({ name }: { name: string }) {
  return (
    <div className="chat-in flex items-center gap-1.5 text-xs text-muted">
      <span className="inline-block size-1.5 animate-pulse rounded-full bg-fg/40" />
      <span className="rounded-md bg-fg/5 px-1.5 py-0.5 font-mono">{name}</span>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

type ChatItem =
  | { seq: number; type: "user" | "assistant"; key: string }
  | { seq: number; type: "tool"; name: string }
  | { seq: number; type: "card" };

// The conversation, played out one step at a time and then looped. `after` is
// the dwell before the next step; the first step resets the transcript.
type ScriptStep =
  | { type: "user" | "assistant"; key: string; after: number; reset?: boolean }
  | { type: "busy"; name: string; after: number }
  | { type: "card"; after: number };

const SCRIPT: ScriptStep[] = [
  { type: "user", key: "u1", reset: true, after: 1000 },
  { type: "busy", name: "transports.list", after: 1300 },
  { type: "assistant", key: "a1", after: 2600 },
  { type: "user", key: "u2", after: 1100 },
  { type: "busy", name: "invoices.create", after: 1500 },
  { type: "assistant", key: "a2", after: 700 },
  { type: "card", after: 4200 },
];

// Full transcript shown at once when motion is reduced.
const STATIC_ITEMS: ChatItem[] = [
  { seq: 0, type: "user", key: "u1" },
  { seq: 1, type: "tool", name: "transports.list" },
  { seq: 2, type: "assistant", key: "a1" },
  { seq: 3, type: "user", key: "u2" },
  { seq: 4, type: "tool", name: "invoices.create" },
  { seq: 5, type: "assistant", key: "a2" },
  { seq: 6, type: "card" },
];

function ChatItemView({ item, t }: { item: ChatItem; t: (k: string) => string }) {
  switch (item.type) {
    case "user":
      return <UserMessage>{t(`routeEconomics.chat.${item.key}`)}</UserMessage>;
    case "assistant":
      return <AssistantMessage>{t(`routeEconomics.chat.${item.key}`)}</AssistantMessage>;
    case "tool":
      return <ToolStep name={item.name} />;
    case "card":
      return <InvoiceCard />;
  }
}

function ChatView() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();

  const [step, setStep] = useState(0);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const seqRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drive the scripted conversation; loops back to the first step.
  useEffect(() => {
    if (reduce) return;
    const s = SCRIPT[step];
    if (s.type === "busy") {
      setBusy(s.name);
    } else {
      setBusy(null);
      const next: ChatItem =
        s.type === "card"
          ? { seq: seqRef.current++, type: "card" }
          : { seq: seqRef.current++, type: s.type, key: s.key };
      const reset = "reset" in s && s.reset;
      setItems((prev) => (reset ? [next] : [...prev, next]));
    }
    const id = setTimeout(() => setStep((step + 1) % SCRIPT.length), s.after);
    return () => clearTimeout(id);
  }, [step, reduce]);

  const shown = reduce ? STATIC_ITEMS : items;

  // Keep the transcript pinned to the latest line by scrolling only this panel,
  // never the page (scrollIntoView would pull the whole window down).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, busy, reduce]);

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className="flex h-[380px] flex-col gap-4 overflow-y-auto p-5">
        {shown.map((item) => (
          <div key={item.seq} className="chat-in">
            <ChatItemView item={item} t={t} />
          </div>
        ))}
        {!reduce && busy && <BusyLine name={busy} />}
      </div>

      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-2">
          <Input
            variant="default"
            className="flex-1"
            placeholder={t("routeEconomics.chat.placeholder")}
            aria-label={t("routeEconomics.chat.placeholder")}
          />
          <Button variant="primary" type="button">
            {t("routeEconomics.chat.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M10 12h5" />
      <path d="M10 16h5" />
    </svg>
  );
}

const TASK_FIELD_KEYS = ["reference", "pickup", "delivery", "cargo", "weight"] as const;

// Upload → scan → fields fill in one by one → task created, then loop.
type CaptureStep = { do: "reset" | "upload" | "scan" | "field" | "done"; after: number };

const CAPTURE_SCRIPT: CaptureStep[] = [
  { do: "reset", after: 700 },
  { do: "upload", after: 1500 },
  { do: "scan", after: 1300 },
  { do: "field", after: 550 },
  { do: "field", after: 550 },
  { do: "field", after: 550 },
  { do: "field", after: 550 },
  { do: "field", after: 800 },
  { do: "done", after: 4500 },
];

function CaptureView() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [fields, setFields] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const s = CAPTURE_SCRIPT[step];
    switch (s.do) {
      case "reset":
        setProgress(0);
        setScanning(false);
        setFields(0);
        setDone(false);
        break;
      case "upload":
        setProgress(100);
        break;
      case "scan":
        setScanning(true);
        break;
      case "field":
        setFields((f) => f + 1);
        break;
      case "done":
        setScanning(false);
        setDone(true);
        break;
    }
    const id = setTimeout(() => setStep((step + 1) % CAPTURE_SCRIPT.length), s.after);
    return () => clearTimeout(id);
  }, [step, reduce]);

  // Reduced motion: render the finished state, no loop.
  const shownProgress = reduce ? 100 : progress;
  const shownFields = reduce ? TASK_FIELD_KEYS.length : fields;
  const shownDone = reduce ? true : done;
  const uploaded = shownProgress >= 100;

  return (
    <div className="grid gap-4 p-4 sm:gap-6 sm:p-5 lg:grid-cols-2">
      {/* Incoming document. */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="rounded-xl border border-dashed border-hairline p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline text-muted">
              <FileGlyph />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-fg">{t("routeEconomics.capture.fileName")}</div>
              <div className="text-[11px] text-muted">{t("routeEconomics.capture.fileMeta")}</div>
            </div>
            {uploaded && (
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-positive">
                <Check className="h-3.5 w-3.5" />
                {t("routeEconomics.capture.uploaded")}
              </span>
            )}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-1000 ease-out motion-reduce:transition-none"
              style={{ width: `${shownProgress}%` }}
            />
          </div>
        </div>

        {uploaded && (
          <div className="chat-in rounded-lg border border-hairline bg-canvas/40 p-3 text-xs leading-relaxed text-muted">
            {t("routeEconomics.capture.preview")}
          </div>
        )}

        {!reduce && scanning && <BusyLine name="documents.scan" />}
      </div>

      {/* Extracted transport task. */}
      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-hairline bg-canvas/40 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-fg">{t("routeEconomics.capture.taskTitle")}</span>
          {shownDone && (
            <span className="chat-in flex shrink-0 items-center gap-1 rounded-full bg-positive-bg px-2 py-0.5 text-[11px] font-medium text-positive">
              <Check className="h-3.5 w-3.5" />
              {t("routeEconomics.capture.created")}
            </span>
          )}
        </div>

        <dl className="flex flex-col divide-y divide-hairline">
          {TASK_FIELD_KEYS.slice(0, shownFields).map((key) => (
            <div key={key} className="chat-in flex items-center justify-between gap-3 py-2 text-sm">
              <dt className="shrink-0 text-muted">{t(`routeEconomics.capture.fields.${key}.label`)}</dt>
              <dd className="min-w-0 text-right text-fg">{t(`routeEconomics.capture.fields.${key}.value`)}</dd>
            </div>
          ))}
          {shownFields === 0 && <div className="py-2 text-sm text-muted">…</div>}
        </dl>
      </div>
    </div>
  );
}

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
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div key={`lead-${tab}`} className="tab-fade flex max-w-xl flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t(`routeEconomics.leads.${tab}.eyebrow`)}
        </span>
        <Heading className="text-3xl">{t(`routeEconomics.leads.${tab}.heading`)}</Heading>
        <Text className="text-base">{t(`routeEconomics.leads.${tab}.subtitle`)}</Text>
      </div>

      <div
        className="mt-8 overflow-hidden rounded-2xl border border-hairline bg-surface"
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
