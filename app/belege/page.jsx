"use client";
import { useEffect, useState } from "react";
import { LIST_API } from "@/lib/api";
import { formatCurrency } from "@/lib/money";

export default function BelegePage() {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // Belege laden
    const res = await fetch("/api/receipts");
    const js = await res.json().catch(() => ({ data: [] }));
    setReceipts(js.data || []);

    // Produkte laden
    const pr = await fetch("/api/products");
    const prJs = await pr.json().catch(() => ({ data: [] }));
    setProducts(
      (prJs.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.priceCents ?? 0,
        currency: p.currency || "EUR",
      }))
    );
  }

  return (
    <div className="page">
      <h1>Belege</h1>
      <div className="list">
        {receipts.map((r) => {
          const gross = formatCurrency(r.grossCents, r.currency);
          const isOpen = expanded === r.id;
          return (
            <div key={r.id} className="row">
              <div
                className="row-header"
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                <div className="col no">{r.receiptNo}</div>
                <div className="col date">{r.date?.slice(0, 10)}</div>
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
                      {(r.items || []).map((it) => (
                        <tr key={it.id}>
                          <td>{it.name}</td>
                          <td>{it.quantity}</td>
                          <td>{formatCurrency(it.unitPriceCents, r.currency)}</td>
                          <td>{formatCurrency(it.lineTotalCents, r.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {r.discountCents > 0 && (
                    <div className="discount">
                      Rabatt: -{formatCurrency(r.discountCents, r.currency)}
                    </div>
                  )}
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
        .discount {
          margin-top: 8px;
          color: #c00;
          font-weight: 500;
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
