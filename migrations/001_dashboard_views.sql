-- Erzeugt/aktualisiert schlanke Views für's Dashboard
-- (idempotent via CREATE OR REPLACE VIEW)

-- Monatsumsatz nur Rechnungen (ohne drafts)
CREATE OR REPLACE VIEW view_invoices_monthly AS
SELECT
  to_char(COALESCE("issueDate","createdAt"), 'YYYY-MM') AS ym,
  COALESCE(SUM("grossCents"),0)::bigint               AS gross_cents
FROM "Invoice"
WHERE status <> 'draft'
GROUP BY 1;

-- Monatsumsatz Quittungen
CREATE OR REPLACE VIEW view_receipts_monthly AS
SELECT
  to_char(COALESCE(date,"createdAt"), 'YYYY-MM') AS ym,
  COALESCE(SUM("grossCents"),0)::bigint         AS gross_cents
FROM "Receipt"
GROUP BY 1;

-- Kombinierter Monatsumsatz (Invoices + Receipts)
CREATE OR REPLACE VIEW view_monthly_revenue AS
SELECT ym, SUM(gross_cents)::bigint AS gross_cents
FROM (
  SELECT ym, gross_cents FROM view_invoices_monthly
  UNION ALL
  SELECT ym, gross_cents FROM view_receipts_monthly
) t
GROUP BY ym
ORDER BY ym DESC;

-- Offene Rechnungen (Anzahl + Summe)
CREATE OR REPLACE VIEW view_open_invoices_summary AS
SELECT
  COUNT(*)::int                              AS open_count,
  COALESCE(SUM("grossCents"),0)::bigint      AS open_sum
FROM "Invoice"
WHERE status = 'open';
