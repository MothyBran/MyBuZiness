"use client";
import { useEffect, useState } from "react";
import { LIST_API } from "@/lib/api";
import { formatCurrency } from "@/lib/money";

export default function RechnungenPage() {
  const [invoices, setInvoices] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/invoices");
    const js = await res.json().catch(() => ({ data: [] }));
    setInvoices(js.data || []);
  }

  return (
    <div className="page">
      <h1>Rechnungen</h1>
      <div className="list">
        {invoices.map((inv) => {
          const gross = formatCurrency(inv.grossCents, inv.currency);
          const isOpen = expanded === inv.id;
          return (
            <div key={inv.id} className="row">
              <div
                className="row-header"
                onClick={() => setExpanded(isOpen ? null : inv.id)}
              >
                <div className="col no">{inv.invoiceNo}</div>
                <div className="col date">{inv.issueDate?.slice(0, 10)}</div>
                <div className="col customer">{inv.customerName}</div>
                <div className="col amount">{gross}</div>
              </div>
              {isOpen && (
                <div className="row-body">
                  <table className="inner-table">
                    <thead>
                      <tr>
                        <th>Produkt</th>
                        <th>Menge</th>
                        <th>Einzelpreis</th>
                        <th>Summe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inv.items || []).map((it) => (
                        <tr key={it.id}>
                          <td>{it.name}</td>
                          <td>{it.quantity}</td>
                          <td>{formatCurrency(it.unitPriceCents, inv.currency)}</td>
                          <td>{formatCurrency(it.lineTotalCents, inv.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="actions">
                    <button>⚙️ Bearbeiten</button>
                    <button>❌ Löschen</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 16px;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .row {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          background: #fff;
        }
        .row-header {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          cursor: pointer;
          font-weight: 500;
        }
        .row-body {
          padding: 12px;
          background: #f9fafb;
        }
        .inner-table {
          width: 100%;
          border-collapse: collapse;
        }
        .inner-table th,
        .inner-table td {
          padding: 6px 8px;
          text-align: left;
          font-size: 14px;
        }
        .actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        .actions button {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }
        @media (max-width: 640px) {
          .row-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .inner-table th,
          .inner-table td {
            font-size: 12px;
            padding: 4px;
          }
        }
      `}</style>
    </div>
  );
}
