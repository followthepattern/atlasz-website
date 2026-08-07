/** EUR, formatted for the active language. Shared so the floating readouts and
    the route economics section can never drift apart on currency or grouping. */
export function money(value: number, language: string) {
  const isHu = language.startsWith("hu");
  return new Intl.NumberFormat(isHu ? "hu-HU" : "en-US", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: isHu ? "narrowSymbol" : "symbol",
    maximumFractionDigits: 0,
  }).format(value);
}

/** EUR, abbreviated — for chart scales where the full figure will not fit. */
export function compactMoney(value: number, language: string) {
  return new Intl.NumberFormat(language.startsWith("hu") ? "hu-HU" : "en-US", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: language.startsWith("hu") ? "narrowSymbol" : "symbol",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

export function decimal(value: number, language: string, digits: number) {
  return new Intl.NumberFormat(language.startsWith("hu") ? "hu-HU" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
