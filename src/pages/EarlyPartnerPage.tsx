import { type ReactNode } from "react";
import { SCENES, SCENE_START, type SceneContent } from "@/scene/sandbox/scenes";
import { SplitText } from "@/motion/SplitText";
import { useReveal } from "@/motion/useReveal";
import { DURATION, STAGGER } from "@/motion/tokens";

/* Content is declared with the scene in sandbox/scenes.ts.
 * This page only renders the corresponding presentation. */

/** The deck's kicker label — a mono rule-and-caps line above every heading. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      data-reveal
      className="flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted/70"
    >
      <span className="h-px w-6 bg-fg/20" aria-hidden="true" />
      {children}
    </span>
  );
}

/** The deck's mono footnote, set quieter than body copy. */
function Footnote({ children }: { children: ReactNode }) {
  return (
    <p
      data-reveal
      className="max-w-prose font-mono text-xs leading-relaxed tracking-[0.08em] text-muted/70"
    >
      {children}
    </p>
  );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div data-reveal className="glass flex flex-col gap-2.5 rounded-xl p-5">
      {title ? (
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted/70">
          {title}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/**
 * One full-height frame. Copy is held to a left band so the truck driving
 * through the right of the screen is never behind the text.
 */
function Slide({ children }: { children: ReactNode }) {
  const ref = useReveal<HTMLElement>({
    stagger: STAGGER.loose,
    duration: DURATION.long,
    y: 22,
  });

  return (
    <section
      ref={ref}
      className="partner-slide relative flex min-h-screen w-full items-center px-8 py-24 sm:px-14 lg:px-20"
    >
      <div className="relative w-full max-w-2xl">
        {/* A pool of page colour under the copy. The scene's brightness changes
            as the truck drives through frame, so the text cannot rely on the
            background being where it started. */}
        <div
          className="ambient-scrim pointer-events-none absolute -inset-x-10 -inset-y-9"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5">{children}</div>
      </div>
    </section>
  );
}

function SceneExplanation({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="scene-explanation">
      <Slide>
        <Card>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-fg">{title}</h2>
          <p className="text-base leading-relaxed text-muted">{children}</p>
        </Card>
      </Slide>
    </div>
  );
}

function OpeningContent() {
  return (
      <Slide>
        <div data-reveal className="mb-3 flex items-center gap-4">
          {/* The atlasz lettermark — the same glyph as the favicon. */}
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-black">
            <svg viewBox="0 0 1024 1024" className="h-7 w-7" aria-hidden="true">
              <g
                fill="none"
                stroke="#ffffff"
                strokeWidth="132"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M250 800 L512 250 L774 800" />
                <line x1="383" y1="660" x2="641" y2="660" />
              </g>
            </svg>
          </span>
          <span className="text-xl font-semibold tracking-tight text-fg">atlasz</span>
        </div>

        <Eyebrow>Atlasz Demo · 2026</Eyebrow>

        <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight text-fg sm:text-5xl lg:text-6xl">
          <SplitText text="AI-alapú fuvarmenedzsment rendszer" immediate />
        </h1>
      </Slide>
  );
}

function PartnerProgramContent() {
  return (
      <Slide>
        <Eyebrow>Együttműködés</Eyebrow>

        <h2 className="text-3xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-4xl lg:text-5xl">
          <SplitText text="Early Partner Program" />
        </h2>

        <p data-reveal className="max-w-prose text-lg leading-relaxed text-muted">
          Ha az atlaszban lát potenciált, örömmel dolgoznánk együtt az első
          partnereink egyikeként.
        </p>

        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card title="Mit várunk?">
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed text-muted marker:text-muted/50">
              <li>Aktív használat</li>
              <li>Kijelölt kapcsolattartó</li>
              <li>Rendszeres visszajelzés</li>
              <li>Közös egyeztetések</li>
            </ul>
          </Card>
          <Card title="Mit biztosítunk?">
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed text-muted marker:text-muted/50">
              <li>Early Access</li>
              <li>Kiemelt támogatás</li>
              <li>Közvetlen kapcsolat a fejlesztőkkel</li>
              <li>Kedvezményes partneri feltételek</li>
            </ul>
          </Card>
        </div>

        <Footnote>
          A részletes feltételeket az Early Partner Program szerződése tartalmazza,
          amelyet a bemutató után elküldünk.
        </Footnote>
      </Slide>
  );
}

function ScenePresentation({ content }: { content: SceneContent }) {
  switch (content.kind) {
    case "opening": return <OpeningContent />;
    case "partner-program": return <PartnerProgramContent />;
    case "explanation": return <SceneExplanation title={content.title}>{content.body}</SceneExplanation>;
    case "none": return null;
  }
}

export function EarlyPartnerPage() {
  return (
    <main className="partner-journey relative" lang="hu" aria-label="Early Partner Program">
      {SCENES.map((scene, index) => (
        <section key={scene.name} data-scene-start={SCENE_START[index]}
          style={{ minHeight: `${scene.span * (5800 / 2.325)}vh` }}>
          {scene.content.kind !== "none" && (
            <div className="sticky top-0"><ScenePresentation content={scene.content} /></div>
          )}
        </section>
      ))}
    </main>
  );
}
