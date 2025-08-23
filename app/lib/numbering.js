// app/lib/numbering.js

/**
 * Rendert ein Nummernformat anhand eines sequence-Werts.
 * Unterstützte Tokens:
 *  {YYYY} Jahr 4-stellig, {YY} 2-stellig, {MM} Monat 2-stellig, {DD} Tag 2-stellig
 *  {SEQ}  laufende Nummer ohne Padding
 *  {SEQN} z. B. {SEQ4} => Links mit Nullen auf N Stellen aufgefüllt
 */
export function renderNumber(format, seq, date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  let out = String(format || "{YYYY}-{SEQ}");

  out = out.replaceAll("{YYYY}", String(d.getFullYear()));
  out = out.replaceAll("{YY}", String(d.getFullYear()).slice(-2));
  out = out.replaceAll("{MM}", String(d.getMonth() + 1).padStart(2, "0"));
  out = out.replaceAll("{DD}", String(d.getDate()).padStart(2, "0"));

  // {SEQ5}, {SEQ3}, ...
  out = out.replace(/\{SEQ(\d+)\}/g, (_m, n) => String(seq).padStart(Number(n), "0"));

  // {SEQ}
  out = out.replaceAll("{SEQ}", String(seq));

  return out;
}

/**
 * Ermittelt die nächste fortlaufende Ziffernfolge einer Spalte, z. B. aus "R-2024-0012" -> 13.
 * Nutzt die höchste Ziffernfolge (regexp_replace(..., '\D','','g')) und +1.
 * Falls keine Einträge: 1.
 *
 * @param {function} q - DB-Query-Funktion (aus lib/db)
 * @param {string} table - Tabellenname in Quotes, z. B. "Invoice"
 * @param {string} col   - Spaltenname in Quotes, z. B. "invoiceNo"
 * @returns {Promise<number>} next integer sequence (>=1)
 */
export async function nextDigitSequence(q, table, col) {
  const sql = `
    SELECT COALESCE(
      MAX(NULLIF(regexp_replace(${col}, '\\D', '', 'g'), '')::bigint),
    0)::bigint AS last FROM ${table}`;
  const row = (await q(sql)).rows?.[0];
  const last = Number(row?.last || 0);
  return (Number.isFinite(last) ? last : 0) + 1;
}
