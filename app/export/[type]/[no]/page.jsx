// app/export/[type]/[no]/page.jsx
"use client";
import { useEffect, useState } from "react";

export default function ExportDoc({ params }) {
  const { type, no } = params; // type: 'invoice' | 'receipt'
  const [doc, setDoc] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    (async () => {
      const s = await fetch("/api/settings").then(r=>r.json()).catch(()=>({}));
      setSettings(s?.data || {});
      // Finde Dokument per Nummer
      const url = type === "invoice" ? `/api/invoices?no=${encodeURIComponent(no)}` : `/api/receipts?no=${encodeURIComponent(no)}`;
      const js = await fetch(url).then(r=>r.json()).catch(()=>({}));
      const data = Array.isArray(js?.data) ? js.data : [];
      setDoc(data.find(d => String(d.invoiceNo || d.receiptNo) === String(no)) || null);
    })();
  }, [type, no]);

  if (!doc || !settings) return <div style={{ padding: 20 }}>Lade…</div>;

  // Sehr vereinfachtes Layout – hier kannst du dein Corporate Design einbringen
  const currency = doc.currency || settings.currencyDefault || "EUR";
  return (
    <main style={{ margin: "0 auto", maxWidth: 820, padding: 24, background: "#fff" }}>
      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{settings.companyName || "Firma"}</div>
          <div style={{ fontSize: 12, opacity: .8 }}>
            {settings.address1} {settings.address2 ? `, ${settings.address2}` : ""}<br/>
            {settings.postalCode} {settings.city}<br/>
            {settings.email}{settings.phone ? ` · ${settings.phone}` : ""}
          </div>
        </div>
        {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: 64 }} /> : null}
      </header>

      <h1 style={{ margin: "12px 0 24px" }}>
        {type === "invoice" ? "Rechnung" : "Beleg"} #{doc.invoiceNo || doc.receiptNo}
      </h1>

      <section style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Bezeichnung</th>
              <th align="right">Menge</th>
              <th align="right">Einzelpreis</th>
              <th align="right">Summe</th>
            </tr>
          </thead>
          <tbody>
            {doc.items?.map((it, i) => {
              const qty = Number(it.quantity || 0);
              const unit = Number(it.unitPriceCents || 0);
              const base = Number(it.extraBaseCents || 0);
              const sum = base + qty * unit;
              return (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td align="right">{qty}</td>
                  <td align="right">{(unit/100).toFixed(2)} {currency}</td>
                  <td align="right">{(sum/100).toFixed(2)} {currency}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <div>Netto: <b>{(doc.netCents/100).toFixed(2)} {currency}</b></div>
          <div>USt: <b>{(doc.taxCents/100).toFixed(2)} {currency}</b></div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Gesamt: {(doc.grossCents/100).toFixed(2)} {currency}</div>
          {settings.kleinunternehmer && (
            <div style={{ fontSize: 12, opacity: .8, marginTop: 6 }}>
              Hinweis gem. § 19 UStG: Es wird keine Umsatzsteuer ausgewiesen.
            </div>
          )}
        </div>
      </section>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => window.print()} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--color-primary,#0aa)", color:"#fff", border:"none" }}>
          Drucken / als PDF speichern
        </button>
      </div>

      <style jsx global>{`
        @media print {
          button { display: none; }
          body { background: #fff !important; }
          @page { size: auto; margin: 12mm; }
        }
      `}</style>
    </main>
  );
}
