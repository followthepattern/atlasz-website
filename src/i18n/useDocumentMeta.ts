import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LNG_QUERY_KEY, supportedLngs, type SupportedLng } from "./config";

// Maps our language codes to BCP 47 locales for og:locale / hreflang.
const OG_LOCALE: Record<SupportedLng, string> = {
  en: "en_US",
  hu: "hu_HU",
};

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [, name] = selector.match(/\[(?:name|property)="(.+)"\]/) ?? [];
    if (name) el.setAttribute(selector.includes("property=") ? "property" : "name", name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

// Keeps language-dependent <head> SEO metadata in sync with the active i18n
// language. The SPA serves a single index.html, so these are updated at runtime
// (picked up by JS-rendering crawlers such as Googlebot). The static defaults in
// index.html cover the no-JS / first-paint case.
function setHreflangAlternates() {
  const { origin, pathname, hash } = window.location;
  document.head
    .querySelectorAll('link[rel="alternate"][data-i18n="1"]')
    .forEach((el) => el.remove());

  const add = (hreflang: string, lang: SupportedLng | null) => {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = hreflang;
    link.setAttribute("data-i18n", "1");
    const search = lang ? `?${LNG_QUERY_KEY}=${lang}` : "";
    link.href = `${origin}${pathname}${search}${hash}`;
    document.head.appendChild(link);
  };

  supportedLngs.forEach((lng) => add(lng, lng));
  add("x-default", null);
}

export function useDocumentMeta() {
  const { t, i18n } = useTranslation();
  const lang = (supportedLngs as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLng)
    : "en";

  useEffect(() => {
    const title = t("meta.title");
    const description = t("meta.description");

    document.documentElement.lang = lang;
    document.title = title;

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:locale"]', "content", OG_LOCALE[lang]);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);

    setHreflangAlternates();
  }, [t, lang]);
}
