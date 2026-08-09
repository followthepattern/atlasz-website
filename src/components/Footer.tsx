import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Subheading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

const FTP_URL = "https://followthepattern.net";
const FTP_CONTACT_URL = "https://followthepattern.net/contact";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-8 border-t border-hairline pt-10 sm:flex-row sm:justify-between">
        <div className="flex max-w-xs flex-col gap-2">
          <span className="text-lg font-semibold tracking-tight text-fg">atlasz</span>
          <Text className="text-xs">{t("footer.tagline")}</Text>
        </div>

        <div className="flex flex-col gap-3">
          <Subheading className="text-xs uppercase tracking-wide text-muted">
            {t("footer.companyHeading")}
          </Subheading>
          <nav className="flex flex-col gap-2 text-sm">
            <a
              href={FTP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-fg"
            >
              {t("footer.links.website")}
            </a>
            <a
              href={FTP_CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-fg"
            >
              {t("footer.links.contact")}
            </a>
            <Link to="/privacy" className="text-muted hover:text-fg">
              {t("footer.links.privacy")}
            </Link>
          </nav>
        </div>
      </div>

      <Text className="mt-10 text-xs">{t("footer.rights", { year })}</Text>
    </footer>
  );
}
