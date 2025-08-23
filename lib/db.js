// lib/db.js
import { Pool } from "pg";

const urlFromEnv =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

export const hasDbUrl = Boolean(urlFromEnv);

// Hinweis im Build/Startup-Log:
if (!hasDbUrl) {
  console.warn("[db] DATABASE_URL/POSTGRES_URL fehlt. Starte ohne Verbindung.");
}

// SSL nur wenn extern (nicht .railway.internal)
const needsSSL =
  hasDbUrl && !/\.railway\.internal(?::\d+)?(?:\/|$)/.test(urlFromEnv);

let pool = null;

if (hasDbUrl) {
  pool = new Pool({
    connectionString: urlFromEnv,
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // kleine Probeverbindung auf Start (non-blocking)
  pool
    .query("SELECT 1")
    .then(() => console.log("[db] Verbindung erfolgreich."))
    .catch((e) => console.error("[db] Verbindungsfehler:", e?.message));
}

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

// Hilfsfunktion für Healthchecks
export const dbStatus = async () => {
  if (!pool) {
    return { connected: false, reason: "NO_DB_URL" };
  }
  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (e) {
    return { connected: false, reason: e?.message || "unknown" };
  }
};

// Zeitstempel
export const now = () => new Date().toISOString();
