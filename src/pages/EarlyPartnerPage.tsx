import { useEffect, useState, type ReactNode } from "react";
import { SplitText } from "@/motion/SplitText";
import { useReveal } from "@/motion/useReveal";
import { useScrollStore } from "@/motion/ScrollProvider";
import { DURATION, STAGGER } from "@/motion/tokens";

/* The Early Partner Program deck, presented live during a demo.
 *
 * Hungarian only and hardcoded: this is one deck shown to one room, and
 * routing it through i18n would mean maintaining an English translation nobody
 * will ever read. Every string is the original deck's, verbatim.
 *
 * What the deck had and this does not: keyboard paging, fullscreen, print, and
 * a slide rail that jumped between five absolutely-positioned <section>s. The
 * scroll is the sequencer now, and the 3D scene behind it is the reason the
 * page exists rather than the PDF. */

const SECTIONS = 5;

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
      className="relative flex min-h-screen w-full items-center px-8 py-24 sm:px-14 lg:px-20"
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

/** Scroll position as `01 / 05`, with a hairline fill. Presenter's aid. */
function ProgressRail() {
  const store = useScrollStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => store.subscribe(setProgress), [store]);

  const index = Math.min(SECTIONS - 1, Math.round(progress * (SECTIONS - 1)));
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex items-center justify-center gap-4">
      <div className="h-px w-40 overflow-hidden bg-fg/15">
        <div
          className="h-full origin-left bg-fg/60 transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <span className="font-mono text-[0.7rem] tracking-[0.12em] text-muted/70">
        <span className="text-fg">{pad(index + 1)}</span> / {pad(SECTIONS)}
      </span>
    </div>
  );
}

export function EarlyPartnerPage() {
  return (
    <div className="flex min-h-full flex-col">
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

      <Slide>
        <Eyebrow>Bemutatkozás</Eyebrow>

        <h2 className="text-3xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-4xl lg:text-5xl">
          <SplitText text="Huszka Csaba" />
        </h2>

        <p data-reveal className="max-w-prose text-lg leading-relaxed text-muted">
          A FOLLOWTHEPATTERN alapítója és vezetője vagyok.
        </p>

        <ul
          data-reveal
          className="mt-1 flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-muted marker:text-muted/50"
        >
          <li>Több mint egy évtizedes tapasztalat szoftverfejlesztésben</li>
          <li>
            A FOLLOWTHEPATTERN különböző méretű cégek számára fejleszt alkalmazásokat,
            hogy hatékonyabbá tegye a működésüket
          </li>
        </ul>
      </Slide>

      <Slide>
        <Eyebrow>A termék</Eyebrow>

        <h2 className="text-3xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-4xl lg:text-5xl">
          <SplitText text="Mi az atlasz?" />
        </h2>

        <p data-reveal className="max-w-prose text-lg italic leading-relaxed text-muted">
          „Adjon kollégáinak AI-alapú szuperképességeket.”
        </p>

        <p data-reveal className="max-w-prose text-lg font-semibold leading-relaxed text-fg">
          AI-alapú fuvarmenedzsment rendszer, ami felgyorsítja a munkavégzést.
        </p>

        <div className="mt-1 grid grid-cols-2 gap-3">
          <Card>
            <span className="text-sm font-semibold text-fg">Számlázás</span>
          </Card>
          <Card>
            <span className="text-sm font-semibold text-fg">
              Automatikus dokumentum kezelés
            </span>
          </Card>
          <Card>
            <span className="text-sm font-semibold text-fg">AI automatizáció</span>
          </Card>
          <Card>
            <span className="text-sm font-semibold text-fg">
              Átlátható, modern felület
            </span>
          </Card>
        </div>

        <Footnote>A részleteket nem diákon mutatjuk — hanem élőben.</Footnote>
      </Slide>

      {/* The spoken beat. In the deck this slide was a cue to stop talking and
          open the app; here the scene carries the pause. */}
      <Slide>
        <Eyebrow>Következik</Eyebrow>

        <h2 className="text-4xl font-semibold leading-[1.06] tracking-tight text-fg sm:text-5xl lg:text-6xl">
          <SplitText text="Élő bemutató." />
        </h2>
      </Slide>

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

      <ProgressRail />
    </div>
  );
}
