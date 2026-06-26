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

const STEPS = [
  {
    key: "import",
    icon: (
      <Icon>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </Icon>
    ),
  },
  {
    key: "assist",
    icon: (
      <Icon>
        <path d="M12 3a4 4 0 0 1 4 4c0 1.5-.8 2.5-1.5 3.2-.6.6-1 1.2-1 2.3v.5h-3v-.5c0-1.1-.4-1.7-1-2.3C8.8 9.5 8 8.5 8 7a4 4 0 0 1 4-4z" />
        <path d="M10 18h4" />
        <path d="M10.5 21h3" />
      </Icon>
    ),
  },
  {
    key: "live",
    icon: (
      <Icon>
        <path d="M5 13l4 4L19 7" />
        <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      </Icon>
    ),
  },
];

export function Onboarding() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="flex max-w-xl flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("onboarding.eyebrow")}
        </span>
        <Heading className="text-3xl">{t("onboarding.heading")}</Heading>
        <Text className="text-base">{t("onboarding.intro")}</Text>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline text-fg">
                {step.icon}
              </span>
              <span className="text-sm font-medium text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <Subheading>{t(`onboarding.steps.${step.key}.title`)}</Subheading>
            <Text>{t(`onboarding.steps.${step.key}.description`)}</Text>
          </div>
        ))}
      </div>
    </section>
  );
}
