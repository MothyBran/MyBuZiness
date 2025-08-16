"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fromCents } from "@/lib/money";

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/receipts/${id}`);
    const json = await res.json();
    setData(json.data || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <main><p>Lade…</p></main>;
  if (!data)    return <main><p>Beleg nicht gefunden.</p></main>;

  const r = data.receipt;
  const items = data.items || [];

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <h1>Beleg {r.receiptNo}</h1>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => window.print()} style={btnPrimary}>Als PDF drucken</button>
          <Link href="/belege" style={btnGhost}>Zurück</Link>
        </div>
      </div>

      <section id="print-area" style={card}>
        {/* Kopf */}
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div><strong>Beleg-Nr.:</strong> {r.receiptNo}</div>
            <div><strong>Datum:</strong> {new Date(r.date).toLocaleDateString()}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div><strong>Währung:</strong> {r.currency}</div>
          </div>
        </div>

        {/* Positionen */}
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={th}>Position</th>
              <th style={th}>Menge</th>
              <th style={th}>Einzelpreis</th>
              <th style={th}>Summe</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td style={td}><strong>{it.name}</strong></td>
                <td style={{ ...td, textAlign:"right" }}>{it.quantity}</td>
                <td style={{ ...td, textAlign:"right" }}>{fromCents(it.unitPriceCents, r.currency)}</td>
                <td style={{ ...td, textAlign:"right" }}>{fromCents(it.lineTotalCents, r.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summen */}
        <div style={{ marginTop:16, textAlign:"right" }}>
          Netto: <strong>{fromCents(r.netCents, r.currency)}</strong><br/>
          {r.discountCents > 0 && <>Rabatt: -{fromCents(r.discountCents, r.currency)}<br/></>}
          <span style={{ fontSize:18 }}>Gesamt: <strong>{fromCents(r.grossCents, r.currency)}</strong></span>
        </div>

        {/* Fußzeile mit Kleinunternehmer Hinweis */}
        <div style={{ marginTop:24, fontSize:13, color:"#555" }}>
          {r.vatExempt && (
            <p><em>Hinweis: Kein Ausweis der Umsatzsteuer gemäß §19 UStG (Kleinunternehmerregelung).</em></p>
          )}
          {r.note && <p>{r.note}</p>}
        </div>
      </section>

      <style>{`
        @media print {
          header, nav, .no-print { display: none
