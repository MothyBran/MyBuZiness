// /lib/db.js
import { Pool } from "pg";
import crypto from "crypto";

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

if (!connectionString) {
  console.warn("[db] DATABASE_URL/POSTGRES_URL fehlt. Starte ohne Verbindung.");
}

const needsSSL =
  connectionString && !/postgres\.railway\.internal/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const q = (text, params) => pool.query(text, params);
export const now = () => new Date().toISOString();
export const uuid = () =>
  globalThis.crypto?.randomUUID?.() ?? crypto.randomUUID();

// --- nur das Appointment-Schema bei Bedarf anlegen (Rest ist bereits vorhanden)
async function ensureAppointmentSchema(client) {
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

let __schemaReadyPromise = null;
export async function ensureSchemaOnce() {
  if (__schemaReadyPromise) return __schemaReadyPromise;
  __schemaReadyPromise = (async () => {
    const client = await pool.connect();
    try {
      await ensureAppointmentSchema(client);
    } finally {
      client.release();
    }
  })();
  return __schemaReadyPromise;
}
