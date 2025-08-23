-- Default-Zeile in Settings sicherstellen (idempotent)

INSERT INTO "Settings" (
  id, "companyName", "currencyDefault", "taxRateDefault",
  "createdAt", "updatedAt"
)
SELECT
  'default', 'Mein Unternehmen', 'EUR', 19, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Settings" WHERE id = 'default');

-- Sinnvolle Defaults füllen, falls noch NULL
UPDATE "Settings"
SET
  "invoiceNumberFormat" = COALESCE("invoiceNumberFormat", 'INV-{YYYY}-{0000}'),
  "receiptNumberFormat" = COALESCE("receiptNumberFormat", 'RCPT-{YYYY}-{0000}'),
  "paymentTermsDays"    = COALESCE("paymentTermsDays", 14),
  "primaryColor"        = COALESCE("primaryColor", '#0ea5b7'),
  "secondaryColor"      = COALESCE("secondaryColor", '#475569'),
  "backgroundColor"     = COALESCE("backgroundColor", '#f7f7fb'),
  "textColor"           = COALESCE("textColor", '#111827')
WHERE id = 'default';
