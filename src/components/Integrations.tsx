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

const FEATURED_PARTNERS = [
  { key: "eurowag", x: 17, y: 23 },
  { key: "mobilecms", x: 83, y: 25 },
  { key: "webeye", x: 50, y: 82 },
];

function partnerIcon(key: string) {
  return PARTNERS.find((partner) => partner.key === key)?.icon;
}

function CenterNode({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-integration-node="center"
      className={`flex flex-col items-center justify-center rounded-lg border border-fg/20 bg-canvas/95 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)] ${
        compact ? "min-h-32 px-6 py-7" : "h-44 w-44"
      }`}
    >
      <span className="text-2xl font-semibold tracking-tight text-fg">atlasz</span>
      <span className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        AI TMS
      </span>
    </div>
  );
}

function FeaturedNode({ partnerKey, className = "" }: { partnerKey: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      data-integration-node={`featured-${partnerKey}`}
      className={`rounded-lg border border-hairline bg-surface p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline text-fg">
          {partnerIcon(partnerKey)}
        </span>
        <div className="min-w-0">
          <Subheading className="truncate">
            {t(`integrations.partners.${partnerKey}.name`)}
          </Subheading>
          <span className="text-xs text-muted">
            {t(`integrations.partners.${partnerKey}.category`)}
          </span>
        </div>
      </div>
      <Text className="mt-3 text-xs leading-relaxed">
        {t(`integrations.partners.${partnerKey}.description`)}
      </Text>
    </div>
  );
}

export function Integrations() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("integrations.eyebrow")}
        </span>
        <Heading className="text-3xl">{t("integrations.heading")}</Heading>
        <Text className="text-base">{t("integrations.intro")}</Text>
      </div>

      <div className="mt-14 hidden md:block">
        <div className="relative min-h-[620px] overflow-hidden">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {FEATURED_PARTNERS.map((node) => (
              <line
                key={`${node.key}-line`}
                x1="50"
                y1="50"
                x2={node.x}
                y2={node.y}
                stroke="var(--hairline)"
                strokeWidth="0.35"
              />
            ))}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <CenterNode />
          </div>

          {FEATURED_PARTNERS.map((partner) => (
            <div
              key={partner.key}
              className="absolute z-30 w-60 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${partner.x}%`, top: `${partner.y}%` }}
            >
              <FeaturedNode partnerKey={partner.key} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 md:hidden">
        <CenterNode compact />
        {FEATURED_PARTNERS.map((partner) => (
          <FeaturedNode key={partner.key} partnerKey={partner.key} />
        ))}
      </div>
    </section>
  );
}
