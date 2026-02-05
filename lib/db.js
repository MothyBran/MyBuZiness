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
    // 1. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Customers
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Customer" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      ALTER TABLE "Customer"
      ADD COLUMN IF NOT EXISTS "phone" TEXT,
      ADD COLUMN IF NOT EXISTS "addressStreet" TEXT,
      ADD COLUMN IF NOT EXISTS "addressZip" TEXT,
      ADD COLUMN IF NOT EXISTS "addressCity" TEXT,
      ADD COLUMN IF NOT EXISTS "addressCountry" TEXT,
      ADD COLUMN IF NOT EXISTS "userId" TEXT;

      CREATE INDEX IF NOT EXISTS "Customer_userId_idx" ON "Customer" ("userId");
    `);

    // 3. Products
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "sku" TEXT,
        "priceCents" INTEGER NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'service',
      ADD COLUMN IF NOT EXISTS "categoryCode" TEXT,
      ADD COLUMN IF NOT EXISTS "travelEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "travelRateCents" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "travelUnit" TEXT NOT NULL DEFAULT 'km',
      ADD COLUMN IF NOT EXISTS "userId" TEXT;

      CREATE INDEX IF NOT EXISTS "Product_userId_idx" ON "Product" ("userId");
    `);

    // 4. Invoices
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS "InvoiceNumberSeq" START 1001;
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id"           TEXT         PRIMARY KEY,
        "invoiceNo"    TEXT         NOT NULL,
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
    `);
    await client.query(`
      ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "userId" TEXT;
      CREATE INDEX IF NOT EXISTS "Invoice_userId_idx" ON "Invoice" ("userId");

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
    `);

    // 5. Receipts
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS "ReceiptNumberSeq" START 1001;
      CREATE TABLE IF NOT EXISTS "Receipt" (
        "id"            TEXT         PRIMARY KEY,
        "receiptNo"     TEXT         NOT NULL,
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
    `);
    await client.query(`
      ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "userId" TEXT;
      CREATE INDEX IF NOT EXISTS "Receipt_userId_idx" ON "Receipt" ("userId");

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
    `);

    // 6. Settings
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
    `);
    await client.query(`
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
      ADD COLUMN IF NOT EXISTS "headerTitle" TEXT DEFAULT 'MyBuZiness',
      ADD COLUMN IF NOT EXISTS "userId" TEXT;

      CREATE UNIQUE INDEX IF NOT EXISTS "Settings_userId_key" ON "Settings" ("userId");
    `);

    // 7. Appointments
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
      ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
      CREATE INDEX IF NOT EXISTS "Appointment_userId_idx" ON "Appointment" ("userId");
    `);

    // 8. Orders (Separate table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT PRIMARY KEY,
        "orderNo" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "issueDate" DATE,
        "validUntil" DATE,
        "currency" TEXT DEFAULT 'EUR',
        "netCents" INTEGER DEFAULT 0,
        "taxCents" INTEGER DEFAULT 0,
        "grossCents" INTEGER DEFAULT 0,
        "status" TEXT DEFAULT 'open',
        "userId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order" ("userId");

      CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "productId" TEXT,
        "name" TEXT,
        "quantity" INTEGER DEFAULT 1,
        "unitPriceCents" INTEGER DEFAULT 0,
        "lineTotalCents" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OrderItem_order_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE
      );
    `);

    // 9. Finance & Tax
    await client.query(`
      CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
        "id" TEXT PRIMARY KEY,
        "kind" TEXT NOT NULL CHECK ("kind" IN ('income','expense','transfer')),
        "bookedOn" DATE NOT NULL DEFAULT CURRENT_DATE,
        "categoryCode" TEXT,
        "categoryName" TEXT,
        "paymentMethod" TEXT,
        "counterpartyName" TEXT,
        "counterpartyVatId" TEXT,
        "reference" TEXT,
        "invoiceId" TEXT,
        "receiptId" TEXT,
        "documentId" TEXT,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "vatRate" NUMERIC(5,2),
        "netCents" INTEGER NOT NULL DEFAULT 0,
        "vatCents" INTEGER NOT NULL DEFAULT 0,
        "grossCents" INTEGER NOT NULL DEFAULT 0,
        "note" TEXT,
        "userId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "FinanceTransaction_userId_idx" ON "FinanceTransaction" ("userId");

      CREATE TABLE IF NOT EXISTS "TaxCategory" (
        "code" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL CHECK ("type" IN ('income','expense')),
        "skr03" TEXT,
        "vatRateDefault" NUMERIC(5,2)
      );

      CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT PRIMARY KEY,
        "filename" TEXT NOT NULL,
        "mimetype" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        "data" BYTEA NOT NULL,
        "userId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "Document_userId_idx" ON "Document" ("userId");
    `);

    // Defaults for TaxCategory (shared/global or per user? Global is fine usually)
    await client.query(`
      INSERT INTO "TaxCategory"("code","name","type","skr03","vatRateDefault")
      SELECT x.code,x.name,x.type,x.skr03,x.vr FROM (VALUES
        ('INC_STD','Betriebseinnahmen 19%', 'income','8400','19'),
        ('INC_RED','Betriebseinnahmen 7%',  'income','8300','7'),
        ('INC_0'  ,'Einnahmen steuerfrei', 'income','8336','0'),
        ('EXP_MAT','Büro/Material 19%',    'expense','4930','19'),
        ('EXP_SERV','Fremdleistungen 19%','expense','4900','19'),
        ('EXP_TRAV','Reisekosten 7%',      'expense','4660','7'),
        ('EXP_0','Ausgabe steuerfrei',     'expense','4936','0')
      ) AS x(code,name,type,skr03,vr)
      WHERE NOT EXISTS (SELECT 1 FROM "TaxCategory" LIMIT 1);
    `);

    // 10. Migration: Relax global constraints
    const relaxConstraints = [
      `ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_key"`,
      `DROP INDEX IF EXISTS "Product_sku_key"`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_userId_key" ON "Product" ("sku", "userId")`,

      `ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNo_key"`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNo_userId_key" ON "Invoice" ("invoiceNo", "userId")`,

      `ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "Receipt_receiptNo_key"`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_receiptNo_userId_key" ON "Receipt" ("receiptNo", "userId")`,

      `DROP INDEX IF EXISTS "Customer_email_key"`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_userId_key" ON "Customer" ("email", "userId")`
    ];

    for (const sql of relaxConstraints) {
      try {
        await client.query(sql);
      } catch (e) {
        console.log("Migration Note: " + sql + " -> " + e.message);
      }
    }

  } finally {
    client.release();
  }
}

export async function ensureSchemaOnce() {
  return initDb();
}
