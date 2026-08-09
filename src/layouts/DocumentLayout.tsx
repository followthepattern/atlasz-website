import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { Subheading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

/**
 * Long-form legal copy: a reading column over the parked scene.
 *
 * The footer is deliberately the reduced one — a wordmark and the rights line.
 * The site footer links to the privacy policy, and a legal page carrying a link
 * back to itself reads as an oversight.
 */
export function DocumentLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-8">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-fg hover:opacity-80"
        >
          atlasz
        </Link>
        <Link to="/" className="text-xs text-muted hover:text-fg">
          {t("privacy.back")}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <Outlet />
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
