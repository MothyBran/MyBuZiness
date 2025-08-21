// src/pages/Invoices.tsx
import React, { useEffect, useState } from "react";
import { getInvoices } from "../utils/api";
import { Invoice } from "../utils/types";
import { centsToMoney, statusBadgeClass } from "../utils/format";

export default function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  useEffect(()=>{ getInvoices().then(setRows); }, []);
  return (
    <div className="card">
      <div className="card__header"><div className="card__title">Rechnungen</div></div>
      <div className="card__content" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>Nr.</th><th>Ausgestellt</th><th>Fällig</th><th>Status</th><th>Betrag</th><th>Aktion</th></tr></thead>
          <tbody>
            {rows.map(i=>(
              <tr key={i.id}>
                <td className="truncate">{i.invoiceNo}</td> {/* Invoice.invoiceNo  */}
                <td>{i.issueDate}</td> {/* Invoice.issueDate  */}
                <td>{i.dueDate || "—"}</td> {/* Invoice.dueDate  */}
                <td><span className={statusBadgeClass(i.status)}>{i.status || "—"}</span></td> {/* Invoice.status  */}
                <td>{centsToMoney(i.grossCents ?? 0, i.currency || "EUR")}</td> {/* Invoice.grossCents,currency  */}
                <td className="row-actions">
                  <button className="btn">Details</button>
                  <button className="btn btn--ghost">PDF</button>
                  <button className="btn btn--ghost">Mahnung</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
