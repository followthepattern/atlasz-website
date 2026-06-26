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

const FEATURES = [
  {
    key: "capture",
    icon: (
      <Icon>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 8h8" />
        <path d="M7 12h10" />
        <path d="M7 16h6" />
      </Icon>
    ),
  },
  {
    key: "profitability",
    icon: (
      <Icon>
        <path d="M4 20V4" />
        <path d="M4 20h16" />
        <path d="M8 16v-4" />
        <path d="M13 16V8" />
        <path d="M18 16v-7" />
      </Icon>
    ),
  },
  {
    key: "shipments",
    icon: (
      <Icon>
        <path d="M12 3 21 7.5v9L12 21 3 16.5v-9z" />
        <path d="M3 7.5 12 12l9-4.5" />
        <path d="M12 12v9" />
      </Icon>
    ),
  },
  {
    key: "mobile",
    icon: (
      <Icon>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </Icon>
    ),
  },
  {
    key: "invoicing",
    icon: (
      <Icon>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4" />
        <path d="M10 12h5" />
        <path d="M10 16h5" />
      </Icon>
    ),
  },
  {
    key: "tracking",
    icon: (
      <Icon>
        <path d="M3 7h11v8H3z" />
        <path d="M14 10h4l3 3v2h-7z" />
        <circle cx="7" cy="17.5" r="1.5" />
        <circle cx="17" cy="17.5" r="1.5" />
      </Icon>
    ),
  },
];

export function Features() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="flex max-w-xl flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("features.eyebrow")}
        </span>
        <Heading className="text-3xl">{t("features.heading")}</Heading>
        <Text className="text-base">{t("features.intro")}</Text>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.key}
            className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline text-fg">
              {feature.icon}
            </span>
            <Subheading>{t(`features.items.${feature.key}.title`)}</Subheading>
            <Text>{t(`features.items.${feature.key}.description`)}</Text>
          </div>
        ))}
      </div>
    </section>
  );
}
