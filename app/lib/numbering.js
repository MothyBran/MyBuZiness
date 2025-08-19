// app/lib/numbering.js
/**
 * Rendern eines Nummernformats:
 * Tokens:
 *  {YYYY} Jahr 4-stellig, {YY} 2-stellig, {MM}, {DD}
 *  {SEQ}  laufende Nummer ohne Padding
 *  {SEQN} laufenede Nummer mit N Stellen (z.B. {SEQ5} => 00001)
 */
export function renderNumber(format, seq) {
  const d = new Date();
  let out = String(format || "{YYYY}-{SEQ}");
  out = out.replaceAll("{YYYY}", String(d.getFullYear()));
  out = out.replaceAll("{YY}", String(d.getFullYear()).slice(-2));
  out = out.replaceAll("{MM}", String(d.getMonth() + 1).padStart(2, "0"));
  out = out.replaceAll("{DD}", String(d.getDate()).padStart(2, "0"));

  // {SEQ5} etc.
  out = out.replace(/\{SEQ(\d+)\}/g, (_m, n) => String(seq).padStart(Number(n), "0"));
  // {SEQ}
  out = out.replaceAll("{SEQ}", String(seq));
  return out;
}
