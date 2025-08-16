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
          <Link href="/belege" style={btnGhost}>Zurück zur Liste</Link>
        </div>
      </div>

      <section id="print-area" style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div><strong>Beleg-Nr.:</strong> {r.receiptNo}</div>
            <div><strong>Datum:</strong> {new Date(r.date).toLocaleDateString()}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div><strong>Währung:</strong> {r.currency}</div>
            {r.vatExempt && <div style={{ color:"#666" }}>Kein USt-Ausweis gem. §19 UStG</div>}
          </div>
        </div>

        <div style={{ overflowX:"auto" }}>
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
        </div>

        <div style={{ marginTop:16, display:"grid", gap:4, justifyContent:"end" }}>
          <div style={{ textAlign:"right" }}>Netto: <strong>{fromCents(r.netCents, r.currency)}</strong></div>
          {!r.vatExempt && <div style={{ textAlign:"right" }}>USt: <strong>{fromCents(r.taxCents, r.currency)}</strong></div>}
          {r.discountCents > 0 && <div style={{ textAlign:"right" }}>Rabatt: <strong>-{fromCents(r.discountCents, r.currency)}</strong></div>}
          <div style={{ textAlign:"right", fontSize:18 }}>Gesamt: <strong>{fromCents(r.grossCents, r.currency)}</strong></div>
        </div>

        {r.note && (
          <div style={{ marginTop:16 }}>
            <strong>Hinweis:</strong>
            <p>{r.note}</p>
          </div>
        )}
      </section>

      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          #print-area { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </main>
  );
}

const card = { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:16, marginTop:12 };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const btnPrimary = { padding:"10px 12px", borderRadius:10, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:10, border:"1px solid #111", background:"transparent", color:"#111", cursor:"pointer" };
