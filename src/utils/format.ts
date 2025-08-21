// src/utils/format.ts
export const centsToMoney = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);

export const toDate = (value?: string | null) => value ? new Date(value) : null;

export const statusBadgeClass = (status?: string | null) => {
  if (!status) return "badge";
  const s = status.toLowerCase();
  if (/(paid|bezahlt|completed|fertig)/.test(s)) return "badge badge--ok";
  if (/(overdue|mahnung|warn|late)/.test(s)) return "badge badge--danger";
  return "badge";
};
