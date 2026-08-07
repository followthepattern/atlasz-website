import { useTranslation } from "react-i18next";
import { Heading, Subheading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { SplitText } from "@/motion/SplitText";
import { useReveal } from "@/motion/useReveal";

const COMPANIES = [
  { key: "gfl", url: "https://www.gfl-transport.com/", logo: "/references/gfl.png" },
];

export function References() {
  const { t } = useTranslation();
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="mx-auto w-full max-w-5xl px-6 py-24">
      <div className="flex max-w-xl flex-col gap-3">
        <span data-reveal className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("references.eyebrow")}
        </span>
        <Heading className="text-3xl sm:text-4xl">
          <SplitText text={t("references.heading")} />
        </Heading>
        <Text data-reveal className="text-base">
          {t("references.intro")}
        </Text>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COMPANIES.map((company) => (
          <a
            key={company.key}
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
            data-reveal
            className="glass flex flex-col gap-2 rounded-xl p-6 transition-colors hover:bg-fg/5"
          >
            <span className="mb-2 inline-flex w-fit items-center rounded-md bg-white px-3 py-2">
              <img
                src={company.logo}
                alt={t(`references.companies.${company.key}.name`)}
                className="h-8 w-auto"
                loading="lazy"
              />
            </span>
            <Subheading>{t(`references.companies.${company.key}.name`)}</Subheading>
            <span className="text-xs text-muted">
              {t(`references.companies.${company.key}.category`)}
            </span>
            <Text>{t(`references.companies.${company.key}.description`)}</Text>
            <span className="mt-1 text-sm text-fg underline">
              {t(`references.companies.${company.key}.link`)}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
