// app/belege/[id]/druck/page.jsx
"use client";

import { useEffect, useState } from "react";
import React from "react";

function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}

function fmtDEDate(input){
  if (!input) return "—";
  const d = new Date(input);
  return isNaN(d) ? "—" : d.toLocaleDateString("de-DE");
}

export default function ReceiptPrintPage({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    // Da params asynchron in Next.js 15+ sind
    Promise.resolve(params).then(p => {
      load(p.id);
    });
  }, [params]);

  async function load(id) {
    try {
      const res = await fetch(`/api/receipts/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Beleg nicht gefunden.");
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error || "Beleg nicht gefunden.");
      setData(json.data);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Lade Beleg…</div>;
  if (err || !data) return <div style={{ padding: "2rem", color: "red", textAlign: "center" }}>Fehler: {err || "Beleg nicht gefunden"}</div>;

  const curr = data.currency || "EUR";
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <>
      {/* Verstecke die normale UI beim Drucken */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-area { margin: 0; padding: 0; width: 100%; max-width: 100%; box-shadow: none; border: none; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        body { background: #f8fafc; color: #1e293b; font-family: sans-serif; }
        .print-area {
          max-width: 800px; margin: 2rem auto; padding: 3rem;
          background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .header { display: flex; justify-content: space-between; margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
        .title { font-size: 2rem; font-weight: bold; margin: 0; }
        .meta-table { width: auto; min-width: 250px; text-align: left; border-collapse: collapse; }
        .meta-table td { padding: 4px 8px 4px 0; }
        .meta-table strong { color: #475569; }

        .items-table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
        .items-table th, .items-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: left; }
        .items-table th { background: #f1f5f9; color: #475569; font-weight: bold; }
        .items-table .num { text-align: right; }

        .totals { margin-top: 2rem; display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; border-collapse: collapse; }
        .totals-table td { padding: 8px; text-align: right; }
        .totals-table .label { text-align: left; color: #475569; }
        .totals-table .final { font-size: 1.25rem; font-weight: bold; border-top: 2px solid #cbd5e1; }

        .note { margin-top: 3rem; padding-top: 1rem; border-top: 1px dashed #cbd5e1; color: #64748b; font-size: 0.875rem; }

        .btn-print {
          display: block; margin: 2rem auto; padding: 0.75rem 1.5rem;
          background: #0aa; color: white; border: none; border-radius: 0.5rem;
          font-size: 1rem; cursor: pointer; font-weight: bold;
        }
      `}} />

      <button className="no-print btn-print" onClick={() => window.print()}>🖨️ Jetzt drucken / als PDF speichern</button>

      <div className="print-area">
        <div className="header">
          <div>
            <h1 className="title">Beleg / Quittung</h1>
            <div style={{ color: "#64748b", marginTop: "4px" }}>Dokument für Ihre Unterlagen</div>
          </div>
          <div>
            <table className="meta-table">
              <tbody>
                <tr>
                  <td><strong>Beleg-Nr:</strong></td>
                  <td>{data.receiptNo || "—"}</td>
                </tr>
                <tr>
                  <td><strong>Datum:</strong></td>
                  <td>{fmtDEDate(data.date)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Bezeichnung</th>
              <th className="num">Menge</th>
              <th className="num">Einzelpreis</th>
              <th className="num">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{it.name}</td>
                <td className="num">{it.quantity}</td>
                <td className="num">{money(it.unitPriceCents, curr)}</td>
                <td className="num">{money(it.lineTotalCents || (it.quantity * it.unitPriceCents), curr)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="label">Zwischensumme</td>
                <td>{money(data.netCents + (data.discountCents || 0), curr)}</td>
              </tr>
              {data.discountCents > 0 && (
                <tr>
                  <td className="label">Rabatt</td>
                  <td>- {money(data.discountCents, curr)}</td>
                </tr>
              )}
              <tr>
                <td className="label">Netto</td>
                <td>{money(data.netCents, curr)}</td>
              </tr>
              <tr>
                <td className="label">USt. {data.vatExempt ? "(Befreit)" : "19%"}</td>
                <td>{money(data.taxCents, curr)}</td>
              </tr>
              <tr>
                <td className="label final">Gesamtsumme</td>
                <td className="final">{money(data.grossCents, curr)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {data.note && (
          <div className="note">
            <strong>Notiz:</strong><br/>
            {data.note}
          </div>
        )}
      </div>
    </>
  );
}
