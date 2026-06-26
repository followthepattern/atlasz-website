import { useTranslation } from "react-i18next";
import { Heading, Subheading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

const LAST_UPDATED = "22 June 2026";
const CONTACT_EMAIL = "csaba@followthepattern.net";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Subheading>{title}</Subheading>
      {children}
    </section>
  );
}

export function Privacy({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-8">
        <button
          type="button"
          onClick={onBack}
          className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
        >
          atlasz
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted hover:text-fg"
        >
          {t("privacy.back")}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-2">
          <Heading>{t("privacy.title")}</Heading>
          <Text className="text-xs">{t("privacy.lastUpdated", { date: LAST_UPDATED })}</Text>
        </div>

        <Text className="text-base">{t("privacy.intro")}</Text>

        <Section title={t("privacy.controller.title")}>
          <div className="flex flex-col gap-1.5 text-sm text-muted">
            <span className="text-fg">{t("privacy.controller.name")}</span>
            <span>
              {t("privacy.controller.taxLabel")}: {t("privacy.controller.tax")}
            </span>
            <span>
              {t("privacy.controller.countryLabel")}: {t("privacy.controller.country")}
            </span>
            <span>
              {t("privacy.controller.emailLabel")}:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-fg underline hover:opacity-80"
              >
                {CONTACT_EMAIL}
              </a>
            </span>
          </div>
        </Section>

        <Section title={t("privacy.collect.title")}>
          <Text>{t("privacy.collect.lead")}</Text>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
            <li>
              <span className="text-fg">{t("privacy.collect.contactLabel")}</span>
              {t("privacy.collect.contact")}
            </li>
            <li>
              <span className="text-fg">{t("privacy.collect.quizLabel")}</span>
              {t("privacy.collect.quiz")}
            </li>
            <li>
              <span className="text-fg">{t("privacy.collect.consentLabel")}</span>
              {t("privacy.collect.consent")}
            </li>
            <li>
              <span className="text-fg">{t("privacy.collect.technicalLabel")}</span>
              {t("privacy.collect.technical")}
            </li>
          </ul>
        </Section>

        <Section title={t("privacy.use.title")}>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
            <li>
              {t("privacy.use.item1before")}
              <span className="text-fg">{t("privacy.use.item1consent")}</span>
              {t("privacy.use.item1after")}
            </li>
            <li>{t("privacy.use.item2", { email: CONTACT_EMAIL })}</li>
            <li>{t("privacy.use.item3")}</li>
          </ul>
        </Section>

        <Section title={t("privacy.share.title")}>
          <Text>{t("privacy.share.lead")}</Text>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
            <li>
              <span className="text-fg">{t("privacy.share.scalewayLabel")}</span>
              {t("privacy.share.scaleway")}
            </li>
          </ul>
          <Text>{t("privacy.share.location")}</Text>
          <Text>{t("privacy.share.transfers")}</Text>
        </Section>

        <Section title={t("privacy.retention.title")}>
          <Text>{t("privacy.retention.body")}</Text>
        </Section>

        <Section title={t("privacy.rights.title")}>
          <Text>{t("privacy.rights.lead")}</Text>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
            <li>{t("privacy.rights.access")}</li>
            <li>{t("privacy.rights.rectify")}</li>
            <li>{t("privacy.rights.erase")}</li>
            <li>{t("privacy.rights.restrict")}</li>
            <li>{t("privacy.rights.portability")}</li>
            <li>{t("privacy.rights.withdraw")}</li>
            <li>{t("privacy.rights.complaint")}</li>
          </ul>
        </Section>

        <Section title={t("privacy.contact.title")}>
          <Text>
            {t("privacy.contact.before")}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-fg underline hover:opacity-80"
            >
              {CONTACT_EMAIL}
            </a>
            {t("privacy.contact.after")}
          </Text>
          <Text>{t("privacy.contact.timing")}</Text>
        </Section>

        <Section title={t("privacy.cookies.title")}>
          <Text>{t("privacy.cookies.body")}</Text>
        </Section>

        <Section title={t("privacy.children.title")}>
          <Text>{t("privacy.children.body")}</Text>
        </Section>

        <Section title={t("privacy.changes.title")}>
          <Text>{t("privacy.changes.body")}</Text>
        </Section>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="flex flex-col gap-2 border-t border-hairline pt-6">
          <Subheading className="text-sm">atlasz</Subheading>
          <Text className="text-xs">
            {t("footer.rights", { year: new Date().getFullYear() })}
          </Text>
        </div>
      </footer>
    </div>
  );
}
