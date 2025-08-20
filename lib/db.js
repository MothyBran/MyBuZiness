// lib/db.js
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const needsSSL = connectionString && !/postgres\.railway\.internal/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

export const q = (text, params) => pool.query(text, params);
export const now = () => new Date().toISOString();
export const uuid = () =>
  (globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID());

export async function initDb() {
  const client = await pool.connect();
  try {
    // Kunden
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Customer" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_key" ON "Customer" ("email");
    `);
    // neue Kundenfelder
    await client.query(`
      ALTER TABLE "Customer"
      ADD COLUMN IF NOT EXISTS "phone" TEXT,
      ADD COLUMN IF NOT EXISTS "addressStreet" TEXT,
      ADD COLUMN IF NOT EXISTS "addressZip" TEXT,
      ADD COLUMN IF NOT EXISTS "addressCity" TEXT,
      ADD COLUMN IF NOT EXISTS "addressCountry" TEXT;
    `);

    // Produkte
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "sku" TEXT UNIQUE,
        "priceCents" INTEGER NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product" ("sku");
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'service',
      ADD COLUMN IF NOT EXISTS "categoryCode" TEXT,
      ADD COLUMN IF NOT EXISTS "travelEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "travelRateCents" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "travelUnit" TEXT NOT NULL DEFAULT 'km';
    `);

    // Rechnungen + Positionen + Sequenz
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS "InvoiceNumberSeq" START 1001;
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id"           TEXT         PRIMARY KEY,
        "invoiceNo"    TEXT         UNIQUE NOT NULL,
        "customerId"   TEXT         NOT NULL,
        "issueDate"    DATE         NOT NULL DEFAULT CURRENT_DATE,
        "dueDate"      DATE,
        "currency"     TEXT         NOT NULL DEFAULT 'EUR',
        "netCents"     INTEGER      NOT NULL DEFAULT 0,
        "taxCents"     INTEGER      NOT NULL DEFAULT 0,
        "grossCents"   INTEGER      NOT NULL DEFAULT 0,
        "taxRate"      NUMERIC(5,2) NOT NULL DEFAULT 19,
        "note"         TEXT,
        "status"       TEXT         NOT NULL DEFAULT 'open',
        "paidAt"       TIMESTAMP(3),
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Invoice_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS "Invoice_customer_idx" ON "Invoice" ("customerId");

      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id"             TEXT         PRIMARY KEY,
        "invoiceId"      TEXT         NOT NULL,
        "productId"      TEXT,
        "name"           TEXT         NOT NULL,
        "description"    TEXT,
        "quantity"       INTEGER      NOT NULL DEFAULT 1,
        "unitPriceCents" INTEGER      NOT NULL DEFAULT 0,
        "lineTotalCents" INTEGER      NOT NULL DEFAULT 0,
        CONSTRAINT "InvoiceItem_invoice_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE,
        CONSTRAINT "InvoiceItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "InvoiceItem_invoice_idx" ON "InvoiceItem" ("invoiceId");
    `);

    // Belege + Positionen + Sequenz
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS "ReceiptNumberSeq" START 1001;

      CREATE TABLE IF NOT EXISTS "Receipt" (
        "id"            TEXT         PRIMARY KEY,
        "receiptNo"     TEXT         UNIQUE NOT NULL,
        "date"          DATE         NOT NULL DEFAULT CURRENT_DATE,
        "vatExempt"     BOOLEAN      NOT NULL DEFAULT TRUE,
        "currency"      TEXT         NOT NULL DEFAULT 'EUR',
        "netCents"      INTEGER      NOT NULL DEFAULT 0,
        "taxCents"      INTEGER      NOT NULL DEFAULT 0,
        "grossCents"    INTEGER      NOT NULL DEFAULT 0,
        "discountCents" INTEGER      NOT NULL DEFAULT 0,
        "note"          TEXT,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_receiptNo_key" ON "Receipt" ("receiptNo");

      CREATE TABLE IF NOT EXISTS "ReceiptItem" (
        "id"             TEXT      PRIMARY KEY,
        "receiptId"      TEXT      NOT NULL,
        "productId"      TEXT,
        "name"           TEXT      NOT NULL,
        "quantity"       INTEGER   NOT NULL DEFAULT 1,
        "unitPriceCents" INTEGER   NOT NULL DEFAULT 0,
        "lineTotalCents" INTEGER   NOT NULL DEFAULT 0,
        CONSTRAINT "ReceiptItem_receipt_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE CASCADE,
        CONSTRAINT "ReceiptItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "ReceiptItem_receipt_idx" ON "ReceiptItem" ("receiptId");
    `);

    // Settings (inkl. Design/Logo/§19)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "id" TEXT PRIMARY KEY,
        "companyName" TEXT,
        "addressLine1" TEXT,
        "addressLine2" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "iban" TEXT,
        "vatId" TEXT,
        "currencyDefault" TEXT NOT NULL DEFAULT 'EUR',
        "taxRateDefault" NUMERIC(5,2) NOT NULL DEFAULT 19,
        "logoUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO "Settings" ("id","companyName","currencyDefault","taxRateDefault")
      SELECT 'singleton', 'Mein Unternehmen', 'EUR', 19
      WHERE NOT EXISTS (SELECT 1 FROM "Settings" WHERE "id"='singleton');
      ALTER TABLE "Settings"
      ADD COLUMN IF NOT EXISTS "kleinunternehmer" BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "showLogo" BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "logoMime" TEXT,
      ADD COLUMN IF NOT EXISTS "logoData" BYTEA,
      ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#111111',
      ADD COLUMN IF NOT EXISTS "accentColor" TEXT DEFAULT '#2563eb',
      ADD COLUMN IF NOT EXISTS "backgroundColor" TEXT DEFAULT '#fafafa',
      ADD COLUMN IF NOT EXISTS "textColor" TEXT DEFAULT '#111111',
      ADD COLUMN IF NOT EXISTS "borderRadius" INTEGER NOT NULL DEFAULT 12,
      ADD COLUMN IF NOT EXISTS "fontFamily" TEXT DEFAULT 'system-ui, sans-serif',
      ADD COLUMN IF NOT EXISTS "headerTitle" TEXT DEFAULT 'MyBuZiness';
    `);
  } finally {
    client.release();
  }
}

// === [SCHEMA BOOTSTRAP – Termine/Appointment] ===============================

// 1) Schema-Funktion
async function ensureAppointmentSchema(client) {
  // Erweiterung für UUIDs (nur falls noch nicht vorhanden)
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Appointment" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "kind" TEXT NOT NULL CHECK ("kind" IN ('appointment','order')),
      "title" TEXT NOT NULL,
      "date" DATE NOT NULL,
      "startAt" TIME NOT NULL,
      "endAt" TIME,
      "customerId" TEXT,
      "customerName" TEXT,
      "note" TEXT,
      "status" TEXT DEFAULT 'open',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS "idx_appointment_date" ON "Appointment" ("date");
    CREATE INDEX IF NOT EXISTS "idx_appointment_kind_date" ON "Appointment" ("kind","date");
  `);
}

// 2) Einmalige Initialisierung – wird beim ersten Import/Abruf durchgeführt
let __schemaReadyPromise = null;

export async function ensureSchemaOnce() {
  if (__schemaReadyPromise) return __schemaReadyPromise;
  __schemaReadyPromise = (async () => {
    const client = await pool.connect(); // <-- `pool` muss weiter oben bereits existieren & exportiert werden
    try {
      // Weitere ensure*-Funktionen können hier ergänzt werden
      await ensureAppointmentSchema(client);
    } finally {
      client.release();
    }
  })();
  return __schemaReadyPromise;
}
