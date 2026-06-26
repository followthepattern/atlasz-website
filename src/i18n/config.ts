import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hu from "./locales/hu.json";

export const supportedLngs = ["en", "hu"] as const;
export type SupportedLng = (typeof supportedLngs)[number];

export const LNG_STORAGE_KEY = "atlasz-lng";

// Canonical query param for shareable language links (e.g. ?lang=hu). `lng` is
// accepted as an alias on read for convenience.
export const LNG_QUERY_KEY = "lang";
const LNG_QUERY_KEYS = [LNG_QUERY_KEY, "lng"];

function isSupported(value: string | null): value is SupportedLng {
  return !!value && (supportedLngs as readonly string[]).includes(value);
}

// Reads a language from the URL query (?lang=hu / ?lng=hu) so a shared link can
// open the site in a specific language.
export function languageFromQuery(): SupportedLng | null {
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of LNG_QUERY_KEYS) {
      const value = params.get(key);
      if (isSupported(value)) {
        return value;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function initialLanguage(): SupportedLng {
  // A language link wins over the stored preference and is persisted, so the
  // choice sticks as the visitor moves around the site.
  const fromQuery = languageFromQuery();
  if (fromQuery) {
    try {
      localStorage.setItem(LNG_STORAGE_KEY, fromQuery);
    } catch {
      // ignore
    }
    return fromQuery;
  }

  try {
    const stored = localStorage.getItem(LNG_STORAGE_KEY);
    if (isSupported(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hu: { translation: hu },
  },
  lng: initialLanguage(),
  fallbackLng: "en",
  supportedLngs,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
