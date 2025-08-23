-- Sinnvolle Indizes für schnelle Dashboard-Abfragen

-- Invoice
CREATE INDEX IF NOT EXISTS idx_invoice_status ON "Invoice"(status);
CREATE INDEX IF NOT EXISTS idx_invoice_issue_created ON "Invoice"(COALESCE("issueDate","createdAt"));
CREATE INDEX IF NOT EXISTS idx_invoice_created_at ON "Invoice"("createdAt");

-- Receipt
CREATE INDEX IF NOT EXISTS idx_receipt_date_created ON "Receipt"(COALESCE(date,"createdAt"));
CREATE INDEX IF NOT EXISTS idx_receipt_created_at ON "Receipt"("createdAt");

-- Order / Quote (falls später im Dashboard)
CREATE INDEX IF NOT EXISTS idx_order_created_at ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS idx_quote_created_at ON "Quote"("createdAt");

-- Appointment (für kommende Termine)
CREATE INDEX IF NOT EXISTS idx_appointment_date ON "Appointment"(date);
