// src/server/db.ts
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL fehlt in der Umgebung (.env)");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional: ssl auf Railway/Prod
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}

/**
 * Hilfsfunktion für PATCH‑Updates:
 * Baut dynamisches UPDATE mit nur den gelieferten Feldern (Whitelist).
 */
export function buildUpdateQuery(
  table: string,
  idField: string,
  idValue: string,
  payload: Record<string, any>,
  allowed: string[],
) {
  const keys = Object.keys(payload).filter((k) => allowed.includes(k));
  if (keys.length === 0) return null;

  const setSql = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  const values = [idValue, ...keys.map((k) => payload[k])];
  const text = `UPDATE "${table}" SET ${setSql}, "updatedAt" = NOW() WHERE "${idField}" = $1 RETURNING *;`;
  return { text, values };
}
