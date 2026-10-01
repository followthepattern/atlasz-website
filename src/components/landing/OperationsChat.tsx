import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useScrollStore } from "@/motion/ScrollProvider";

export function OperationsChat() {
  const { i18n } = useTranslation();
  const hu = i18n.resolvedLanguage === "hu";
  const ref = useRef<HTMLDivElement>(null);
  const scroll = useScrollStore();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const track = ref.current?.closest<HTMLElement>(".journey-card-track");
    if (!track) return;
    const update = () =>
      setProgress(
        Math.max(
          0,
          Math.min(
            1,
            -track.getBoundingClientRect().top /
              Math.max(1, track.offsetHeight - innerHeight),
          ),
        ),
      );
    const unsubscribe = scroll.subscribe(update);
    const observer = new ResizeObserver(update);
    observer.observe(track);
    window.addEventListener("resize", update);
    return () => {
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [scroll]);
  const request = hu
    ? "Rendeld az SO-4471 feladatot a Budapest–Bécs útvonalhoz."
    : "Assign task SO-4471 to the Budapest–Vienna route.";
  const response = hu
    ? "Az ATZ-104 járművön van kapacitás. Hozzárendeljem a feladatot?"
    : "ATZ-104 has capacity on this route. Shall I assign the task?";
  const confirmation = hu ? "Igen, rendeld hozzá." : "Yes, assign it.";
  const type = (text: string, from: number, to: number) =>
    text.slice(
      0,
      Math.ceil(
        text.length * Math.max(0, Math.min(1, (progress - from) / (to - from))),
      ),
    );
  const sent = progress >= 0.27;
  const confirmed = progress >= 0.72;
  const done = progress >= 0.82;
  return (
    <div
      ref={ref}
      className="operations-chat"
      data-chat-stage={
        done
          ? "assigned"
          : confirmed
            ? "confirmed"
            : sent
              ? "proposed"
              : "composing"
      }
    >
      <div className="operations-chat-header">
        <span className="signal-dot" />
        <strong>ATLASZ AI</strong>
        <span>{hu ? "Fuvarszervezés" : "Operations"}</span>
      </div>
      <div className="operations-chat-thread">
        {sent ? (
          <div className="operations-bubble operations-user">{request}</div>
        ) : (
          <p className="operations-chat-welcome">
            {hu ? "Mit szervezzünk meg?" : "What shall we organize?"}
          </p>
        )}
        {progress > 0.3 && (
          <div className="operations-bubble operations-assistant">
            {type(response, 0.3, 0.49)}
          </div>
        )}
        {progress >= 0.5 && (
          <div className={`operations-route ${done ? "is-assigned" : ""}`}>
            <div>
              <strong>SO-4471</strong>
              <span>
                {done
                  ? hu
                    ? "✓ Hozzárendelve"
                    : "✓ Assigned"
                  : hu
                    ? "Javasolt útvonal"
                    : "Suggested route"}
              </span>
            </div>
            <b>{hu ? "Budapest → Bécs" : "Budapest → Vienna"}</b>
            <p>ATZ-104 · Kovács Péter</p>
            <small>
              {hu
                ? "12 raklap · Kiszállítás 17:00"
                : "12 pallets · Delivery 17:00"}
            </small>
          </div>
        )}
        {confirmed && (
          <div className="operations-bubble operations-user operations-confirmation">
            {confirmation}
          </div>
        )}
        {done && (
          <p className="operations-chat-done" role="status">
            {hu
              ? "✓ Útvonal frissítve. A sofőr értesítve."
              : "✓ Route updated. Driver notified."}
          </p>
        )}
      </div>
      <div
        className="operations-composer"
        aria-label={hu ? "Szemléltető üzenet" : "Illustrative message"}
      >
        <span>
          {!sent
            ? type(request, 0.02, 0.25) ||
              (hu ? "Kérje meg az ATLASZ-t…" : "Ask ATLASZ…")
            : !confirmed && progress >= 0.54
              ? type(confirmation, 0.54, 0.7)
              : hu
                ? "Kérje meg az ATLASZ-t…"
                : "Ask ATLASZ…"}
        </span>
        <span aria-hidden="true">↑</span>
      </div>
      <div className="operations-scroll-hint">
        {hu ? "Görgessen a beszélgetéshez" : "Scroll through the conversation"}
      </div>
    </div>
  );
}
