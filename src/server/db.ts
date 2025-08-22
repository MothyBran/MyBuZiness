// src/server/db.ts
import { Pool } from "pg";

// Wir initialisieren den Pool ERST BEI NUTZUNG (Lazy), NICHT beim Import.
// So crasht der Next-Build nicht, selbst wenn DATABASE_URL im Build-Stage fehlt.

let _pool: Pool | null = null;

function shouldUseSSL(conn: string) {
  // Railway intern: keine SSL-Pflicht; extern: SSL erlauben
  return !/postgres\.railway\.internal/.test(conn);
}

function getPool(): Pool {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // erst zur Laufzeit im Request meckern – NICHT beim Import
    throw new Error("DATABASE_URL fehlt in der Umgebung (.env)");
  }
  _pool = new Pool({
    connectionString,
    ssl: shouldUseSSL(connectionString) ? { rejectUnauthorized: false } : false,
  });
  return _pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}

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
