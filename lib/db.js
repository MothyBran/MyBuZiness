// lib/db.js
import { Pool } from "pg";

const urlFromEnv =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

export const hasDbUrl = Boolean(urlFromEnv);

// Hinweis im Start-Log
if (!hasDbUrl) {
  console.warn("[db] DATABASE_URL/POSTGRES_URL fehlt. Starte ohne Verbindung.");
}

// SSL nur wenn extern (nicht *.railway.internal)
const needsSSL =
  hasDbUrl && !/\.railway\.internal(?::\d+)?(?:\/|$)/.test(urlFromEnv);

export const pool = hasDbUrl
  ? new Pool({
      connectionString: urlFromEnv,
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

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

// Einfache Status-Prüfung
export const dbStatus = async () => {
  if (!pool) return { connected: false, reason: "NO_DB_URL" };
  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (e) {
    return { connected: false, reason: e?.message || "unknown" };
  }
};

// Legacy-Kompat: initDb/ensureSchemaOnce werden von manchen Routen erwartet.
// Wir machen das idempotent und leichtgewichtig.
let _schemaEnsured = false;

export const ensureSchemaOnce = async () => {
  if (_schemaEnsured) return;
  if (!pool) {
    console.warn("[db] ensureSchemaOnce: keine DB-Verbindung verfügbar.");
    _schemaEnsured = true; // trotzdem nicht erneut versuchen
    return;
  }
  try {
    // Minimaler Test gegen ein vorhandenes, kleines Table (Settings existiert in deinem Schema)
    await q('SELECT 1 FROM "Settings" LIMIT 1');
  } catch {
    // Falls Table fehlt, versuchen wir NICHT automatisch zu migrieren,
    // sondern nur einen generischen Ping, damit die Funktion nicht crasht.
    await q("SELECT 1");
  }
  _schemaEnsured = true;
  console.log("[db] Schema check abgeschlossen (ensureSchemaOnce).");
};

export const initDb = async () => {
  // Alias für ensureSchemaOnce – wird von alten Routen importiert
  await ensureSchemaOnce();
};

export const now = () => new Date().toISOString();

// Beim Start non-blocking testen
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
