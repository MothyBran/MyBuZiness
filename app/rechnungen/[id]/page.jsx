"use client";

import { useEffect, useState } from "react";
import { fromCents } from "@/lib/money";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/invoices/${id}`);
    const json = await res.json();
    setData(json.data || null);
    setLoading(false);
  }

  useEffect(() => {
  (async () => {
    await load();
    const st = await fetch(`/api/settings`).then(r => r.json()).catch(() => ({ data: null }));
    setSettings(st.data || null);
  })();
}, [id]);

  if (loading) return <main><p>Lade…</p></main>;
  if (!data) return <main><p>Rechnung nicht gefunden.</p></main>;

  const inv = data.invoice;
  const items = data.items || [];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Rechnung {inv.invoiceNo}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={btnPrimary}>Als PDF drucken</button>
          <Link href="/rechnungen" style={btnGhost}>Zurück zur Liste</Link>
        </div>
      </div>

      <section id="print-area" style={card}>
        {/* Kopf */}
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{settings?.companyName || "Dein Firmenname"}</h2>
          {settings?.addressLine1 && <div>{settings.addressLine1}</div>}
          {settings?.addressLine2 && <div>{settings.addressLine2}</div>}
          {(settings?.email || settings?.phone) && <div>{[settings.email, settings.phone].filter(Boolean).join(" • ")}</div>}
          {(settings?.iban || settings?.vatId) && <div>{[settings.iban && `IBAN: ${settings.iban}`, settings.vatId && `USt-ID: ${settings.vatId}`].filter(Boolean).join(" • ")}</div>}
          {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: 64 }} />}
        </div>

        {/* Kunde */}
        <div style={{ marginBottom: 16 }}>
          <strong>Rechnung an:</strong>
          <div>{inv.customerName}</div>
          {inv.customerEmail && <div>{inv.customerEmail}</div>}
        </div>

        {/* Positionen */}
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Position</th>
                <th style={th}>Menge</th>
                <th style={th}>Einzelpreis</th>
                <th style={th}>Summe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td style={td}>
                    <div><strong>{it.name}</strong></div>
                    {it.description && <div style={{ color: "#666", fontSize: 13 }}>{it.description}</div>}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{it.quantity}</td>
                  <td style={{ ...td, textAlign: "right" }}>{fromCents(it.unitPriceCents, inv.currency)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{fromCents(it.lineTotalCents, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summen */}
        <div style={{ marginTop: 16, display: "grid", gap: 4, justifyContent: "end" }}>
          <div style={{ textAlign: "right" }}>Netto: <strong>{fromCents(inv.netCents, inv.currency)}</strong></div>
          <div style={{ textAlign: "right" }}>Steuer ({inv.taxRate}%): <strong>{fromCents(inv.taxCents, inv.currency)}</strong></div>
          <div style={{ textAlign: "right", fontSize: 18 }}>Brutto: <strong>{fromCents(inv.grossCents, inv.currency)}</strong></div>
        </div>

        {/* Notiz */}
        {inv.note && (
          <div style={{ marginTop: 16 }}>
            <strong>Hinweis:</strong>
            <p>{inv.note}</p>
          </div>
        )}
      </section>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          header, nav, .no-print { display: none !important; }
          #print-area {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}

const card = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 };
const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: "10px 8px", fontSize: 13, color: "#555" };
const td = { borderBottom: "1px solid #f2f2f2", padding: "10px 8px", fontSize: 14 };
const btnPrimary = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" };
const btnGhost = { padding: "8px 10px", borderRadius: 8, border: "1px solid #111", background: "transparent", color: "#111", cursor: "pointer" };
