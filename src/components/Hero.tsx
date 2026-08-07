import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ArrowRight } from "@/icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SplitText } from "@/motion/SplitText";
import { useReveal } from "@/motion/useReveal";
import { DURATION, STAGGER } from "@/motion/tokens";

type HeroProps = {
  onHome: () => void;
  onStart: () => void;
};

/**
 * The opening frame. Replaces the SVG Europe map hero — the 3D scene now lives
 * behind the whole page (see SceneBackdrop), so this is pure typography and
 * floating UI over it.
 */
export function Hero({ onHome, onStart }: HeroProps) {
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
        <button
          type="button"
          onClick={onHome}
          className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
        >
          atlasz
        </button>
        <LanguageSwitcher />
      </header>

      {/* Copy sits in the upper band, centred, with the truck framed below it. */}
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
            <Button variant="primary" onClick={onStart}>
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
