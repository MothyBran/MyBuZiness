// src/pages/Quotes.tsx
import React, { useEffect, useState } from "react";
import { getQuotes } from "../utils/api";
import { Quote } from "../utils/types";
import { centsToMoney, statusBadgeClass } from "../utils/format";

export default function Quotes() {
  const [rows, setRows] = useState<Quote[]>([]);
  useEffect(()=>{ getQuotes().then(setRows); }, []);
  return (
    <div className="card">
      <div className="card__header"><div className="card__title">Angebote</div></div>
      <div className="card__content" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>Nr.</th><th>Datum</th><th>Gültig bis</th><th>Status</th><th>Brutto</th></tr></thead>
          <tbody>
            {rows.map(q=>(
              <tr key={q.id}>
                <td className="truncate">{q.quoteNo}</td> {/* Quote.quoteNo  */}
                <td>{q.issueDate}</td> {/* Quote.issueDate  */}
                <td>{q.validUntil || "—"}</td> {/* Quote.validUntil  */}
                <td><span className={statusBadgeClass(q.status)}>{q.status || "—"}</span></td> {/* Quote.status  */}
                <td>{centsToMoney(q.grossCents ?? 0, q.currency || "EUR")}</td> {/* Quote.grossCents,currency  */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
