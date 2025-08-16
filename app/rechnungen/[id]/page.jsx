"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fromCents } from "@/lib/money";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [invRes, stRes] = await Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()).catch(() => ({ data: null })),
      fetch(`/api/settings`).then(r => r.json()).catch(() => ({ data: null })),
    ]);
    setData(invRes.data || null);
    setSettings(stRes.data || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <main><p>Lade…</p></main>;
  if (!data)    return <main><p>Rechnung nicht gefunden.</p></main>;

  const inv   = data.invoice;
  const items = data.items || [];
  const s     = settings || {};

  // Logo-Quelle: DB-Logo-Endpunkt bevorzugt, sonst logoUrl (falls vorhanden)
  const logoUrl = s?.showLogo ? (s?.logoUrl ? s.logoUrl : "/api/settings/logo") : "";

  // §19-Hinweis: zeige, wenn Settings §19 aktiv ODER die Rechnung keine Steuer hat
  const showKleinunternehmerHint = !!s?.kleinunternehmer || (Number(inv.taxCents || 0) === 0);

  return (
    <main>
      {/* Seitenkopf / Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Rechnung {inv.invoiceNo}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={btnPrimary}>Als PDF drucken</button>
          <Link href="/rechnungen" style={btnGhost}>Zurück zur Liste</Link>
        </div>
      </div>

      {/* Druckbereich */}
      <section id="print-area" style={card}>

        {/* Firmenkopf */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {s?.showLogo && !!logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ height: 54, objectFit: "contain", maxWidth: 180 }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "var(--color-primary)" }}>
                {s?.companyName || "Dein Firmenname"}
              </h2>
              {(s?.addressLine1 || s?.addressLine2) && (
                <div style={{ color: "#555" }}>
                  {[s.addressLine1, s.addressLine2].filter(Boolean).join(" · ")}
                </div>
              )}
              {(s?.email || s?.phone) && (
                <div style={{ color: "#555" }}>
                  {[s.email, s.phone].filter(Boolean).join(" · ")}
                </div>
              )}
              {(s?.iban || s?.vatId) && (
                <div style={{ color: "#555" }}>
                  {[s.iban && `IBAN: ${s.iban}`, s.vatId && `USt-ID: ${s.vatId}`]
                    .filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>

          {/* Rechnungskopf rechts */}
          <div style={{ textAlign: "right" }}>
            <div><strong>Rechnungsnr.:</strong> {inv.invoiceNo}</div>
            <div><strong>Datum:</strong> {new Date(inv.issueDate).toLocaleDateString()}</div>
            {inv.dueDate && <div><strong>Fällig bis:</strong> {new Date(inv.dueDate).toLocaleDateString()}</div>}
            <div><strong>Status:</strong> {inv.status}</div>
          </div>
        </div>

        {/* Kunde */}
        <div style={{ margin: "8px 0 12px 0" }}>
          <strong>Rechnung an:</strong>
          <div>{inv.customerName}</div>
          {inv.customerEmail && <div style={{ color: "#555" }}>{inv.customerEmail}</div>}
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
          <div style={{ textAlign: "right" }}>
            Netto: <strong>{fromCents(inv.netCents, inv.currency)}</strong>
          </div>
          {Number(inv.taxCents || 0) > 0 && (
            <div style={{ textAlign: "right" }}>
              Steuer ({Number(inv.taxRate || 0)}%): <strong>{fromCents(inv.taxCents, inv.currency)}</strong>
            </div>
          )}
          <div style={{ textAlign: "right", fontSize: 18 }}>
            Brutto: <strong>{fromCents(inv.grossCents, inv.currency)}</strong>
          </div>
        </div>

        {/* Fußzeile */}
        <div style={{ marginTop: 24, fontSize: 13, color: "#555" }}>
          {showKleinunternehmerHint && (
            <p>
              <em>Hinweis: Kein Ausweis der Umsatzsteuer gemäß §19 UStG (Kleinunternehmerregelung).</em>
            </p>
          )}
          {inv.note && <p>{inv.note}</p>}
        </div>
      </section>

      {/* Druck-Styles */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          #print-area {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          a { color: #000 !important; text-decoration: none !important; }
        }
      `}</style>
    </main>
  );
}

/* Styles (nutzen Theme-Variablen) */
const card = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: "var(--radius)",
  padding: 16,
  marginTop: 12
};
const th = {
  textAlign: "left",
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  fontSize: 13,
  color: "#555"
};
const td = {
  borderBottom: "1px solid #f2f2f2",
  padding: "10px 8px",
  fontSize: 14
};
const btnPrimary = {
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-primary)",
  background: "var(--color-primary)",
  color: "#fff",
  cursor: "pointer"
};
const btnGhost = {
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-primary)",
  background: "transparent",
  color: "var(--color-primary)",
  cursor: "pointer"
};
