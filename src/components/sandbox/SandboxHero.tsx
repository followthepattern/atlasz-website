import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { buttonClasses } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ArrowRight } from "@/icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SplitText } from "@/motion/SplitText";
import { useReveal } from "@/motion/useReveal";
import { DURATION, STAGGER } from "@/motion/tokens";

/**
 * The sandbox's opening frame — the site's hero, composed again in here.
 *
 * A copy of `components/Hero`, deliberately, and not an import of it. The
 * sandbox exists so scene ideas can be tried without the site being reachable
 * from inside it; importing the live hero would mean every tweak made while
 * prototyping in here shipped to the landing page. So the sandbox owns the
 * composition and shares only the toolkit — SplitText, useReveal, the button
 * and text primitives — which are primitives rather than chrome.
 *
 * It reads the same `hero.*` keys, so this is the same wording in both
 * languages rather than a paraphrase that drifts.
 *
 * All of it is real markup: `<h1>`, `<p>`, `<a>`. None of the copy is painted
 * into the canvas, so it survives a crawler, a screen reader, and a machine
 * with no working WebGL — where `.scene-backdrop`'s gradient is all that sits
 * behind it and nothing else about this component changes.
 */
export function SandboxHero() {
  const { t } = useTranslation();
  const ref = useReveal<HTMLDivElement>({
    stagger: STAGGER.loose,
    duration: DURATION.long,
    y: 22,
  });

  return (
    <section className="relative flex min-h-[92vh] flex-col overflow-hidden">
      {/* Layered at -6: above the canvas at -10, below the floating readouts at
          -5, and far below the copy at z-10. It has to dim the scene without
          dimming the instruments — sitting in normal flow it painted over them
          and washed them out. */}
      <div
        className="hero-scrim pointer-events-none absolute inset-0 z-[-6]"
        aria-hidden="true"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
        >
          atlasz
        </Link>
        <LanguageSwitcher />
      </header>

      {/* Copy sits in the upper band, centred, with the truck framed below it —
          which is the framing scene 1 was cut for: the vehicle rides low there
          precisely so this band stays free for a headline. */}
      <div
        ref={ref}
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-14 text-center sm:pt-20"
      >
        {/* One pool behind the whole block. Scrimming only part of it left the
            title and the subtitle sitting on visibly different backgrounds, as
            though they belonged to different elements. */}
        <div className="relative flex w-full flex-col items-center gap-6">
          <div
            className="ambient-scrim pointer-events-none absolute -inset-x-8 -inset-y-7"
            aria-hidden="true"
          />

          <span
            data-reveal
            className="glass relative rounded-full px-3 py-1 text-xs tracking-wide text-muted"
          >
            {t("hero.badge")}
          </span>

          {/* A single run rather than two stacked lines — sized so it holds one
              line on a desktop viewport in both languages. */}
          <h1 className="relative max-w-5xl text-3xl font-semibold leading-[1.12] tracking-tight text-fg sm:text-4xl lg:text-[2.6rem]">
            <SplitText
              text={`${t("hero.titleLine1")} ${t("hero.titleLine2")}`}
              immediate
            />
          </h1>

          <Text data-reveal className="relative max-w-2xl text-base">
            {t("hero.subtitle")}
          </Text>

          <div data-reveal className="relative">
            <Link to="/subscribe" className={buttonClasses("primary")}>
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
