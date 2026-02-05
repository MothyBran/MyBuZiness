
/**
 * Ersetzt Platzhalter in einem Format-String durch aktuelle Datumswerte und eine Sequenznummer.
 * Platzhalter:
 *  {YYYY} -> 2023
 *  {YY}   -> 23
 *  {MM}   -> 01..12
 *  {DD}   -> 01..31
 *  {SEQ}  -> Sequenznummer (ohne Padding)
 *  {SEQx} -> Sequenznummer mit x Stellen Padding (z.B. {SEQ3} -> 001)
 *
 * @param {string} formatPattern z.B. "{YYYY}-{MM}-{SEQ3}"
 * @param {number} seqNum z.B. 123
 * @param {Date} date (optional, default: heute)
 * @returns {string} z.B. "2023-10-123"
 */
export function renderNumber(formatPattern, seqNum, date = new Date()) {
  let s = formatPattern || "{SEQ}";
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  s = s.replace(/{YYYY}/g, yyyy);
  s = s.replace(/{YY}/g, yy);
  s = s.replace(/{MM}/g, mm);
  s = s.replace(/{DD}/g, dd);

  // {SEQ} / {SEQn}
  s = s.replace(/{SEQ(\d*)}/g, (_, digits) => {
    const pad = digits ? parseInt(digits, 10) : 0;
    return String(seqNum).padStart(pad, "0");
  });

  return s;
}
