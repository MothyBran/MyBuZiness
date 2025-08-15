// lib/db.js
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
// Railway-intern meist ohne SSL, extern ggf. mit SSL.
// Wir erkennen das grob am Host:
const needsSSL = connectionString && !/postgres\.railway\.internal/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false
});

// Tabellen automatisch anlegen, wenn sie fehlen
export async function initDb() {
  const client = await pool.connect();
  try {
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
      `);

      await client.query(`
      -- Laufnummer für Rechnungen
      CREATE SEQUENCE IF NOT EXISTS "InvoiceNumberSeq" START 1001;

      -- RECHNUNG (Invoice)
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
        "status"       TEXT         NOT NULL DEFAULT 'open', -- open | paid | canceled
        "paidAt"       TIMESTAMP(3),
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Invoice_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS "Invoice_customer_idx" ON "Invoice" ("customerId");

      -- POSITIONEN (InvoiceItem)
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id"            TEXT         PRIMARY KEY,
        "invoiceId"     TEXT         NOT NULL,
        "productId"     TEXT,
        "name"          TEXT         NOT NULL,
        "description"   TEXT,
        "quantity"      INTEGER      NOT NULL DEFAULT 1,
        "unitPriceCents" INTEGER     NOT NULL DEFAULT 0,
        "lineTotalCents" INTEGER     NOT NULL DEFAULT 0,
        CONSTRAINT "InvoiceItem_invoice_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE,
        CONSTRAINT "InvoiceItem_product_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS "InvoiceItem_invoice_idx" ON "InvoiceItem" ("invoiceId");
    `);
    
  } finally {
    client.release();
  }
}

// kleine Helfer
export const q = (text, params) => pool.query(text, params);
export const now = () => new Date().toISOString();
export const uuid = () => (globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID());
