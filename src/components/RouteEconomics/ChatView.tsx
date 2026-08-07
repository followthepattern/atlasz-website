import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePrefersReducedMotion } from "@/motion/usePrefersReducedMotion";
import { BusyLine } from "./shared";

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

export function ChatView() {
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
