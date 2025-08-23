// lib/db.js
import { Pool } from "pg";

// ---- Env & Connection -------------------------------------------------------
const urlFromEnv =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

export const hasDbUrl = Boolean(urlFromEnv);

if (!hasDbUrl) {
  console.warn("[db] DATABASE_URL/POSTGRES_URL fehlt. Starte ohne Verbindung.");
}

// SSL nur, wenn die DB nicht innerhalb von Railway erreichbar ist
const needsSSL =
  hasDbUrl && !/\.railway\.internal(?::\d+)?(?:\/|$)/.test(urlFromEnv);

export const pool = hasDbUrl
  ? new Pool({
      connectionString: urlFromEnv,
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

// zentrale Query-Funktion
export const q = async (text, params) => {
  if (!pool) {
    const err = new Error(
      "Keine Datenbankverbindung: DATABASE_URL/POSTGRES_URL nicht gesetzt."
    );
    err.code = "NO_DB_URL";
    throw err;
  }
  return pool.query(text, params);
};

// ---- Health/Status ----------------------------------------------------------
export const dbStatus = async () => {
  if (!pool) return { connected: false, reason: "NO_DB_URL" };
  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (e) {
    return { connected: false, reason: e?.message || "unknown" };
  }
};

// ---- Schema-Init (No-Op + Ping) --------------------------------------------
let _schemaEnsured = false;

export const ensureSchemaOnce = async () => {
  if (_schemaEnsured) return;
  if (!pool) {
    console.warn("[db] ensureSchemaOnce: keine DB-Verbindung verfügbar.");
    _schemaEnsured = true;
    return;
  }
  try {
    // leichter Check gegen existierende Tabelle (falls vorhanden)
    await q("SELECT 1");
  } catch (e) {
    console.warn("[db] ensureSchemaOnce warn:", e?.message);
  }
  _schemaEnsured = true;
  console.log("[db] Schema check abgeschlossen (ensureSchemaOnce).");
};

// Legacy-Alias – einige Routen importieren initDb()
export const initDb = async () => {
  await ensureSchemaOnce();
};

// ---- IDs/Utils --------------------------------------------------------------
/**
 * Liefert eine neue UUID (String). Kompatibel zu Routen, die `uuid()` aus lib/db importieren.
 * Beispiel: const id = uuid(); // "d2f5c4e8-...."
 */
export const uuid = () => crypto.randomUUID();

// Alternativer Name, falls in einzelnen Dateien `newId` genutzt wird
export const newId = uuid;

export const now = () => new Date().toISOString();

// ---- Startup Probe (non-blocking) ------------------------------------------
(async () => {
  if (pool) {
    try {
      await pool.query("SELECT 1");
      console.log("[db] Verbindung erfolgreich.");
    } catch (e) {
      console.error("[db] Verbindungsfehler:", e?.message);
    }
  }
})();
