import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useScrollStore } from "@/motion/ScrollProvider";

export function BotBrowserScene() {
  const { i18n } = useTranslation();
  const hu = i18n.resolvedLanguage === "hu";
  const ref = useRef<HTMLDivElement>(null);
  const scroll = useScrollStore();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const track = ref.current?.closest<HTMLElement>(".journey-card-track");
    if (!track) return;
    const update = () => {
      const range = Math.max(1, track.offsetHeight - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, -track.getBoundingClientRect().top / range)));
    };
    const unsubscribe = scroll.subscribe(update);
    const observer = new ResizeObserver(update);
    observer.observe(track);
    window.addEventListener("resize", update);
    return () => { unsubscribe(); observer.disconnect(); window.removeEventListener("resize", update); };
  }, [scroll]);
  // Complete before the sticky frame releases, leaving time to read the result.
  const phase = Math.min(8, progress * 10);
  const frame = Math.floor(phase);
  const fields = [
    [hu ? "Felrakó" : "Pickup", "Budapest, HU"],
    [hu ? "Lerakó" : "Delivery", "Vienna, AT"],
    [
      hu ? "Rakomány" : "Cargo",
      hu ? "12 raklap · Hűtött" : "12 pallets · Refrigerated",
    ],
    [hu ? "Jármű" : "Vehicle", "ATZ-104"],
    [hu ? "Partnerazonosító" : "Partner reference", "EXL-2084"],
  ];
  return (
    <div ref={ref} className="bot-browser-scene" data-bot-step={frame}>
      <div className="bot-request">
        <span className="bot-avatar" aria-hidden="true">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="6" y="11" width="28" height="23" rx="7" />
            <path d="M20 11V5M14 27h12" />
            <circle cx="13" cy="20" r="2" />
            <circle cx="27" cy="20" r="2" />
          </svg>
        </span>
        <div>
          <strong>Atlasz Bot</strong>
          <p>
            {hu
              ? "Foglalja le ezt a fuvart az ügyfélportálon."
              : "Book this transport in the customer portal."}
          </p>
        </div>
      </div>
      <div className="bot-browser-windows">
        <div
          className={`bot-reference-window ${frame >= 5 ? "is-active" : ""}`}
        >
          <div className="bot-window-bar">
            <i />
            <i />
            <i />
            <span>{hu ? "Partnernyilvántartás" : "Partner directory"}</span>
          </div>
          <div className="bot-reference-body">
            <small>{hu ? "Partner" : "Partner"}</small>
            <strong>Example Logistics</strong>
            <small>{hu ? "Ügyfélazonosító" : "Customer reference"}</small>
            <b>EXL-2084</b>
            <span className="bot-reference-status">
              {frame >= 6
                ? hu
                  ? "✓ Azonosító átmásolva"
                  : "✓ Reference copied"
                : hu
                  ? "Azonosító keresése"
                  : "Look up reference"}
            </span>
          </div>
        </div>
        <div className="bot-portal-window">
          <div className="bot-window-bar">
            <i />
            <i />
            <i />
            <span>{hu ? "Ügyfélportál" : "Customer portal"}</span>
          </div>
          <div className="bot-address">
            ▣ &nbsp; portal.example / transport / new
          </div>
          <div className="bot-portal-body">
            <div className="bot-form-heading">
              <strong>
                {hu ? "Új fuvarfoglalás" : "New transport booking"}
              </strong>
              <span>SO-4471</span>
            </div>
            <div className="bot-form-fields">
              {fields.map(([label, value], index) => (
                <div
                  className={
                    frame >= (index === 4 ? 6 : index + 1) ? "is-filled" : ""
                  }
                  key={label}
                >
                  <span>{label}</span>
                  <div>
                    {phase > (index === 4 ? 5 : index) ? (
                      value.slice(0, Math.ceil(value.length * Math.min(1, phase - (index === 4 ? 5 : index))))
                    ) : (
                      <span className="bot-empty-field" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={`bot-submit ${frame >= 7 ? "is-submitted" : ""}`}>
              {frame >= 7
                ? hu
                  ? "✓ Foglalás visszaigazolva"
                  : "✓ Booking confirmed"
                : hu
                  ? "Fuvar lefoglalása"
                  : "Book transport"}
            </div>
          </div>
        </div>

      </div>
      <div
        className={`bot-sync-result ${frame === 8 ? "is-complete" : ""}`}
        role="status"
      >
        <span>{frame === 8 ? "✓" : "↔"}</span>
        <div>
          <strong>
            {frame === 8
              ? hu
                ? "Fuvar frissítve az ATLASZ-ban"
                : "Transport updated in ATLASZ"
              : hu
                ? "Atlasz Bot dolgozik a böngészőben"
                : "Atlasz Bot is working in the browser"}
          </strong>
          <small>
            {frame === 8
              ? "SO-4471 · EXL-2084"
              : hu
                ? "Adatok átvitele a meglévő alkalmazások között"
                : "Moving data between your existing apps"}
          </small>
        </div>
      </div>
      <div className="bot-demo-controls">
        <span>
          {hu ? "Szemléltető munkafolyamat" : "Illustrative workflow"}
        </span>
        <span>{hu ? "Görgessen a folytatáshoz" : "Scroll to continue"}</span>
      </div>
    </div>
  );
}
