// /lib/money.js
// Zentrale Geld-Helfer (alle Beträge intern in Cents)

const EUR = "EUR";

export function toCents(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Math.round(value * 100);
  // "12,34" oder "12.34" → 1234
  const s = String(value).trim().replace(/\s/g, "");
  const norm = s.replace(/\./g, "").replace(",", ".");
  const f = Number(norm);
  return Number.isFinite(f) ? Math.round(f * 100) : 0;
}

export function fromCents(cents) {
  const v = (Number(cents) || 0) / 100;
  return Math.round(v * 100) / 100;
}

export function formatMoney(cents, currency = EUR, locale = "de-DE") {
  const v = fromCents(cents);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function addCents(...parts) {
  return parts.reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export function calcTax(netCents, taxRatePercent = 19) {
  const tax = Math.round((netCents * Number(taxRatePercent || 0)) / 100);
  return {
    netCents: Number(netCents) || 0,
    taxCents: tax,
    grossCents: (Number(netCents) || 0) + tax,
  };
}
