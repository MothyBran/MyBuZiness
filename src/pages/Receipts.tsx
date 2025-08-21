// src/pages/Receipts.tsx
import React, { useEffect, useState } from "react";
import { getReceipts } from "../utils/api";
import { Receipt } from "../utils/types";
import { centsToMoney } from "../utils/format";

export default function Receipts() {
  const [rows, setRows] = useState<Receipt[]>([]);
  useEffect(()=>{ getReceipts().then(setRows); }, []);
  return (
    <div className="card">
      <div className="card__header"><div className="card__title">Belege</div></div>
      <div className="card__content" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>Nr.</th><th>Datum</th><th>Brutto</th><th>Notiz</th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td className="truncate">{r.receiptNo}</td> {/* Receipt.receiptNo  */}
                <td>{r.date}</td> {/* Receipt.date  */}
                <td>{centsToMoney(r.grossCents ?? 0, r.currency || "EUR")}</td> {/* Receipt.grossCents,currency  */}
                <td className="truncate">{r.note || "—"}</td> {/* Receipt.note  */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
