import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "@/icons";
import { usePrefersReducedMotion } from "@/motion/usePrefersReducedMotion";
import { BusyLine } from "./shared";

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

export function CaptureView() {
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
