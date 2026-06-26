import { useTranslation } from "react-i18next";
import {
  LNG_QUERY_KEY,
  LNG_STORAGE_KEY,
  supportedLngs,
  type SupportedLng,
} from "@/i18n/config";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current: SupportedLng = i18n.resolvedLanguage === "hu" ? "hu" : "en";

  function setLng(lng: SupportedLng) {
    if (lng === current) return;
    void i18n.changeLanguage(lng);
    try {
      localStorage.setItem(LNG_STORAGE_KEY, lng);
    } catch {
      // ignore
    }
    // Keep the URL a shareable language link; preserves path and #hash.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(LNG_QUERY_KEY, lng);
      window.history.replaceState(null, "", url);
    } catch {
      // ignore
    }
  }

  return (
    <div
      role="group"
      aria-label={t("language.switch")}
      className="flex items-center gap-0.5 rounded-md border border-hairline p-0.5 text-xs"
    >
      {supportedLngs.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => setLng(lng)}
          aria-pressed={lng === current}
          className={`rounded px-2 py-1 uppercase transition-colors ${
            lng === current ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
