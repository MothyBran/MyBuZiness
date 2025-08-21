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

// src/utils/format.ts  (ERGÄNZUNGEN AM ENDE DER DATEI)
export const yyyymm = (d?: string | null) => {
  if (!d) return new Date().toISOString().slice(0, 7).replace("-", "");
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
};

// Frontend‑Anzeigeformat, wenn DB‑Nummer abweicht/leer ist:
export const displayInvoiceNo = (row: any, indexInMonth = 0) => {
  const base = yyyymm(row.issueDate || row.createdAt); // Invoice.issueDate/createdAt 
  const seq = String((indexInMonth + 1)).padStart(3, "0");
  const fromDb = row.invoiceNo as string | undefined; // Invoice.invoiceNo 
  // Wenn DB‑Nummer schon im richtigen Format ist, nimm sie:
  if (fromDb && /^RN-\d{6}-\d{3}$/i.test(fromDb)) return fromDb;
  return `RN-${base}-${seq}`;
};

export const displayReceiptNo = (row: any, indexInMonth = 0) => {
  const base = yyyymm(row.date || row.createdAt); // Receipt.date/createdAt 
  const seq = String((indexInMonth + 1)).padStart(3, "0");
  const fromDb = row.receiptNo as string | undefined; // Receipt.receiptNo 
  if (fromDb && /^BN-\d{6}-\d{3}$/i.test(fromDb)) return fromDb;
  return `BN-${base}-${seq}`;
};
