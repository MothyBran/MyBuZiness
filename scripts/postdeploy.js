// scripts/postdeploy.js
// Führt SQL-Dateien aus ./migrations in alphabetischer Reihenfolge aus.
// Stoppt beim ersten Fehler mit eindeutigem Log.

import fs from "fs";
import path from "path";
import { Client } from "pg";

const connStr =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

if (!connStr) {
  console.error("[postdeploy] DATABASE_URL/POSTGRES_URL fehlt – breche ab.");
  process.exit(1);
}

// SSL nur wenn extern (nicht *.railway.internal)
const needsSSL = !/\.railway\.internal(?::\d+)?(?:\/|$)/.test(connStr);

const client = new Client({
  connectionString: connStr,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

async function runSql(sql, label = "inline") {
  console.log(`[postdeploy] RUN ${label}`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`[postdeploy] OK  ${label}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(`[postdeploy] FAIL ${label}:`, err?.message);
    throw err;
  }
}

async function runMigrations(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[postdeploy] Keine Migrations gefunden (${dir} existiert nicht).`);
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));

  if (files.length === 0) {
    console.log(`[postdeploy] Keine .sql-Dateien in ${dir}.`);
    return;
  }

  for (const file of files) {
    const full = path.join(dir, file);
    const sql = fs.readFileSync(full, "utf8");
    await runSql(sql, file);
  }
}

async function main() {
  console.log("[postdeploy] Verbinde zur Datenbank …");
  await client.connect();
  console.log("[postdeploy] Verbindung steht.");

  // 0) Minimal-Ping
  await runSql("SELECT 1", "ping.sql");

  // 1) Alle SQLs in ./migrations ausführen (alphanumerisch)
  await runMigrations(path.join(process.cwd(), "migrations"));

  // 2) Beispielhafte, idempotente Seeds/Checks (hier: Settings-Default)
  const seedSettings = `
    INSERT INTO "Settings" (id, "companyName", "currencyDefault", "taxRateDefault",
                            "createdAt", "updatedAt")
    SELECT 'default', 'Mein Unternehmen', 'EUR', 19, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "Settings" WHERE id = 'default');
  `;
  await runSql(seedSettings, "seed_settings.inline.sql");

  console.log("[postdeploy] Fertig ✅");
  await client.end();
}

main().catch(async (err) => {
  console.error("[postdeploy] Abgebrochen:", err?.message || err);
  try { await client.end(); } catch {}
  process.exit(1);
});
