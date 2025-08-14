export function toCents(input) {
  // akzeptiert "12,34" oder "12.34" oder 12.34
  const s = String(input).replace(",", ".").trim();
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents, currency = "EUR") {
  const value = (Number(cents || 0) / 100);
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
}
