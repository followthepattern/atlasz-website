import type { SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { Heading, Subheading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

function Icon(props: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

const PARTNERS = [
  {
    key: "eurowag",
    icon: (
      <Icon>
        <rect x="4" y="3" width="9" height="18" rx="1" />
        <path d="M4 10h9" />
        <path d="M13 7h3l3 3v7a2 2 0 0 1-4 0v-3h-2" />
        <path d="M3 21h11" />
      </Icon>
    ),
  },
  {
    key: "mobilecms",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="2" />
        <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
        <path d="M16.2 16.2a6 6 0 0 0 0-8.4" />
        <path d="M4.9 4.9a10 10 0 0 0 0 14.2" />
        <path d="M19.1 19.1a10 10 0 0 0 0-14.2" />
      </Icon>
    ),
  },
  {
    key: "webeye",
    icon: (
      <Icon>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </Icon>
    ),
  },
];

const CATEGORY_KEYS = ["telematics", "accounting", "tachograph", "fuel", "loadboards", "more"];

export function Integrations() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="flex max-w-xl flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("integrations.eyebrow")}
        </span>
        <Heading className="text-3xl">{t("integrations.heading")}</Heading>
        <Text className="text-base">{t("integrations.intro")}</Text>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PARTNERS.map((partner) => (
          <div
            key={partner.key}
            className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline text-fg">
                {partner.icon}
              </span>
              <div className="flex flex-col">
                <Subheading>{t(`integrations.partners.${partner.key}.name`)}</Subheading>
                <span className="text-xs text-muted">
                  {t(`integrations.partners.${partner.key}.category`)}
                </span>
              </div>
            </div>
            <Text>{t(`integrations.partners.${partner.key}.description`)}</Text>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Text>{t("integrations.moreLead")}</Text>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => (
            <span
              key={key}
              className="rounded-full border border-hairline px-3 py-1 text-xs text-muted"
            >
              {t(`integrations.categories.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
