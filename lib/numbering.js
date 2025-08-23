// /lib/numbering.js
// Robuste Belegnummern-Erzeugung über eine persistente Tabelle "Numbering".
// Unterstützt Formate wie: "INV-{yyyy}-{0000}", "RCPT-{yy}{MM}-{00000}"

import { pool } from "@/lib/db";

/**
 * Tokens:
 * {yyyy},{yy},{MM},{dd}
 * {000},{0000},{00000} → laufende Nummer mit führenden Nullen
 */
function renderFormat(fmt, seq, date = new Date()) {
  const padToken = fmt.match(/\{0+\}/g)?.sort((a, b) => b.length - a.length)?.[0];
  const width = padToken ? padToken.length - 2 : 0;

  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  let out = fmt
    .replace(/\{yyyy\}/g, yyyy)
    .replace(/\{yy\}/g, yy)
    .replace(/\{MM\}/g, MM)
    .replace(/\{dd\}/g, dd);

  if (width > 0) {
    const padded = String(seq).padStart(width, "0");
    out = out.replace(/\{0+\}/g, padded);
  }
  return out;
}

/**
 * Sorgt dafür, dass es die Tabelle gibt.
 */
async function ensureNumberingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Numbering" (
      "key" TEXT PRIMARY KEY,
      "next" BIGINT NOT NULL DEFAULT 1,
      "period" TEXT,                 -- optional (z.B. 'yyyy', 'yyyyMM') für automatisches Zurücksetzen
      "periodValue" TEXT,            -- letzter gespeicherter Periodenwert
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Liefert die nächste Nummer für eine Kategorie (z.B. 'invoice', 'receipt', 'order', 'quote').
 * @param {string} key - z.B. "invoice"
 * @param {string} format - z.B. "INV-{yyyy}-{0000}"
 * @param {object} opts - { period: 'yyyy' | 'yyyyMM' | null }
 */
export async function nextNumber(key, format, opts = {}) {
  const { period = null, date = new Date() } = opts;

  const periodValue =
    period === "yyyy"
      ? String(date.getFullYear())
      : period === "yyyyMM"
      ? `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
      : null;

  const client = await pool.connect();
  try {
    await ensureNumberingTable(client);

    // Transaktion, damit zwei gleichzeitige Aufrufe nicht kollidieren
    await client.query("BEGIN");

    // Sperren der Zeile (oder Dummy-Select) für konsistente Erhöhung
    await client.query(`LOCK TABLE "Numbering" IN ROW EXCLUSIVE MODE;`);

    const { rows } = await client.query(
      `SELECT "key","next","period","periodValue" FROM "Numbering" WHERE "key" = $1 LIMIT 1;`,
      [key]
    );

    let seq = 1;
    if (rows.length === 0) {
      // Neuer Eintrag
      await client.query(
        `INSERT INTO "Numbering" ("key","next","period","periodValue","updatedAt") VALUES ($1,$2,$3,$4,NOW());`,
        [key, 2, period, periodValue]
      );
      seq = 1;
    } else {
      const row = rows[0];
      // Periodenwechsel → zurücksetzen
      if (period && row.period === period && row.periodvalue !== periodValue) {
        await client.query(
          `UPDATE "Numbering" SET "next" = 2, "periodValue" = $1, "updatedAt" = NOW() WHERE "key" = $2;`,
          [periodValue, key]
        );
        seq = 1;
      } else {
        // normal erhöhen
        const res = await client.query(
          `UPDATE "Numbering" SET "next" = "next" + 1, "period" = COALESCE("period",$1), "periodValue" = COALESCE("periodValue",$2), "updatedAt" = NOW()
           WHERE "key" = $3
           RETURNING "next";`,
          [period, periodValue, key]
        );
        seq = Number(res.rows[0].next) - 1;
      }
    }

    await client.query("COMMIT");

    const no = renderFormat(format, seq, date);
    return { seq, no };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
