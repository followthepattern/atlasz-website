import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Footer } from "@/components/Footer";
import { CaptureView } from "@/components/RouteEconomics/CaptureView";
import { SCENE_START, within } from "@/scene/sandbox/scenes";
import { OperationsChat } from "@/components/landing/OperationsChat";
import { BotBrowserScene } from "@/components/landing/BotBrowserScene";
import { copy } from "@/components/landing/content";
import {
  Pricing,
  FuelingPhone,
  Forecast,
  Depot,
} from "@/components/landing/JourneyDemos";

function Stage({
  id,
  at,
  title,
  body,
  children,
  demoLabel,
  sceneLayer,
  className = "",
}: {
  id: string;
  at: number;
  title: string;
  body: string;
  children?: ReactNode;
  demoLabel?: string;
  sceneLayer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "400px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      id={id}
      data-scene-start={at}
      className={`journey-stage ${className}`}
    >
      <div className="journey-card-track">
        <div className="journey-sticky">
          {visible && sceneLayer}
          <article className="journey-card">
            <h2>{title}</h2>
            <p className="journey-description">{body}</p>
            {children && (
              <div className="journey-demo-slot">
                {demoLabel && <span className="demo-caption">{demoLabel}</span>}
                {visible ? children : null}
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { i18n } = useTranslation();
  const c = copy[i18n.resolvedLanguage === "hu" ? "hu" : "en"];
  return (
    <>
      <header className="journey-header">
        <Link to="/" className="journey-brand">
          ATLASZ
        </Link>
        <div>
          <LanguageSwitcher />
          <Link to="/subscribe" className="journey-header-cta">
            {c.cta}
          </Link>
        </div>
      </header>
      <main>
        <section className="journey-hero" data-scene-start={0}>
          <div className="journey-hero-copy">
            <h1>{c.hero}</h1>
            <p className="journey-pillars">{c.pillars}</p>
            <p className="journey-intro">{c.intro}</p>
            <Link className="journey-cta" to="/subscribe">
              {c.cta}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <a className="journey-scroll" href="#capture">
            {c.scroll}
            <span aria-hidden="true">↓</span>
          </a>
        </section>
        <Stage
          id="capture"
          at={SCENE_START[1]}
          title={c.capture[0]}
          body={c.capture[1]}
          demoLabel={c.demo}
        >
          <CaptureView />
        </Stage>
        <Stage
          id="operations"
          at={SCENE_START[2]}
          title={c.operations[0]}
          body={c.operations[1]}
          demoLabel={c.demo}
        >
          <OperationsChat />
        </Stage>
        <Stage
          id="finance"
          at={SCENE_START[3]}
          title={c.finance[0]}
          body={c.finance[1]}
          demoLabel={c.demo}
        >
          <Pricing c={c} />
        </Stage>
        <Stage
          id="tracking"
          at={SCENE_START[4]}
          title={c.tracking[0]}
          body={c.tracking[1]}
        >
          <div className="tracking-readout">
            <span className="signal-dot" />
            {c.live}
            <strong>ATZ-104</strong>
          </div>
          <div className="telemetry-explanation">
            {c.telemetry.map(([title, description]) => (
              <div key={title}><h3>{title}</h3><p>{description}</p></div>
            ))}
            <div className="telemetry-planned"><h3>{c.devices[0]}</h3><p>{c.devices[1]}</p></div>
          </div>
        </Stage>
        <Stage
          id="mobile"
          at={SCENE_START[5]}
          title={c.mobile[0]}
          body={c.mobile[1]}
          demoLabel={c.demo}
        >
          <FuelingPhone c={c} />
        </Stage>
        <Stage
          id="intelligence"
          at={SCENE_START[6]}
          title={c.intelligence[0]}
          body={c.intelligence[1]}
          demoLabel={c.demo}
          className="journey-short"
        >
          <Forecast c={c} />
        </Stage>
        <Stage
          id="migration"
          at={within(6, 0.5)}
          title={c.migration[0]}
          body={c.migration[1]}
          className="journey-short"
        >
          <div className="bot-flow">
            <strong>{c.bot}</strong>
            {c.botSteps.map((step) => (
              <span key={step}>✓ {step}</span>
            ))}
          </div>
        </Stage>
        <Stage
          id="ATLASZ-bot"
          at={within(6, 0.75)}
          title={
            i18n.resolvedLanguage === "hu"
              ? "Meglévő alkalmazásai. Együttműködve."
              : "Your existing apps. Working together."
          }
          body={
            i18n.resolvedLanguage === "hu"
              ? "Az Atlasz Bot a böngészőben használt rendszereiben dolgozik: adatokat visz át és rutinfeladatokat végez el a csapata számára."
              : "Atlasz Bot works in your browser-based systems, moving data and completing routine tasks for your team."
          }
          sceneLayer={<BotBrowserScene />}
          className="journey-bot-stage"
        />
        <Stage
          id="invoicing"
          at={SCENE_START[7]}
          title={c.invoice[0]}
          body={c.invoice[1]}
          demoLabel={c.demo}
          className="journey-short"
        >
          <Depot c={c} />
        </Stage>
        <Stage
          id="service"
          at={within(7, 0.6)}
          title={c.service[0]}
          body={c.service[1]}
          demoLabel={c.demo}
          className="journey-short"
        >
          <Depot c={c} service />
        </Stage>
        <section className="journey-arrival" data-scene-start={1} aria-label={i18n.resolvedLanguage === "hu" ? "Érkezés az ATLASZ telephelyére" : "Arrival at the ATLASZ depot"} />
        <section className="journey-finish">
          <h2>{c.partners}</h2>
          <div className="journey-partners">
            <span>General Frigolog</span>
            <span>Adler-Trans</span>
            <span>Boro-Trans</span>
          </div>
          <div className="journey-closing">
            <h2>{c.closing}</h2>
            <Link to="/subscribe" className="journey-cta">
              {c.cta}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <Footer />
        </section>
      </main>
    </>
  );
}
