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
  } finally {
    client.release();
  }
}

// kleine Helfer
export const q = (text, params) => pool.query(text, params);
export const now = () => new Date().toISOString();
export const uuid = () => (globalThis.crypto?.randomUUID?.() ?? require("crypto").randomUUID());
