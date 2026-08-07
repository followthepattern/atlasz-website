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
      {/* Sits above the canvas and the floating readouts (both negative z) and
          below the copy at z-10, so the headline keeps its contrast whatever
          the scene is doing behind it. */}
      <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />

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

      <div
        ref={ref}
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20"
      >
        <div className="flex max-w-2xl flex-col items-start gap-6">
          <span
            data-reveal
            className="glass rounded-full px-3 py-1 text-xs tracking-wide text-muted"
          >
            {t("hero.badge")}
          </span>

          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-6xl">
            <SplitText text={t("hero.titleLine1")} immediate className="block" />
            <SplitText
              text={t("hero.titleLine2")}
              immediate
              delay={0.12}
              className="block text-muted"
            />
          </h1>

          {/* The same local pool the floating chart uses. The headline is white
              and heavy enough to carry itself on the broad hero fade alone; the
              subtitle is muted body colour at body size, and the scene's grid
              lines run straight through it. */}
          <div data-reveal className="relative max-w-xl">
            <div
              className="ambient-scrim pointer-events-none absolute -inset-x-5 -inset-y-3"
              aria-hidden="true"
            />
            <Text className="relative text-base">{t("hero.subtitle")}</Text>
          </div>

          <div data-reveal>
            <Button variant="primary" onClick={onStart} className="mt-2">
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
