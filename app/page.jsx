"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [totals, setTotals] = useState({ today: 0, last7: 0, last30: 0 });
  const [counts, setCounts] = useState({ customers: 0, products: 0, invoices: 0, receipts: 0 });
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [currency, setCurrency] = useState("EUR");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const js = await res.json();
        if (!js.ok) throw new Error(js.error || "Fehler beim Laden");

        setTotals(js.data.totals || {});
        setCounts(js.data.counts || {});
        setRecentReceipts(js.data.recentReceipts || []);
        setRecentInvoices(js.data.recentInvoices || []);
        setCurrency(js.data.settings?.currencyDefault || "EUR");
        setSettings(js.data.settings || null);

        // Design-Variablen aus Settings setzen
        if (js.data.settings) {
          const s = js.data.settings;
          const root = document.documentElement;
          if (s.primaryColor)   root.style.setProperty("--color-primary", s.primaryColor);
          if (s.secondaryColor) root.style.setProperty("--color-secondary", s.secondaryColor);
          if (s.fontFamily)     root.style.setProperty("--font-family", s.fontFamily);
          if (s.fontColor)      root.style.setProperty("--color-text", s.fontColor);
        }
      } catch (e) {
        console.error("Dashboard error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div>⏳ Lade Dashboard…</div>;
  }

  return (
    <div className="grid-gap-16">
      {/* Umsatz-Karten */}
      <section className="grid-gap-16 grid-1-3">
        <Card><div className="card-title">Heute</div><div className="card-value">{money(totals.today, currency)}</div></Card>
        <Card><div className="card-title">Letzte 7 Tage</div><div className="card-value">{money(totals.last7, currency)}</div></Card>
        <Card><div className="card-title">Letzte 30 Tage</div><div className="card-value">{money(totals.last30, currency)}</div></Card>
      </section>

      {/* Zähler */}
      <section className="grid-gap-16 grid-2-4">
        <Card><div className="card-title">Kunden</div><div className="card-value">{counts.customers}</div></Card>
        <Card><div className="card-title">Produkte</div><div className="card-value">{counts.products}</div></Card>
        <Card><div className="card-title">Rechnungen</div><div className="card-value">{counts.invoices}</div></Card>
        <Card><div className="card-title">Belege</div><div className="card-value">{counts.receipts}</div></Card>
      </section>

      {/* Neueste Belege */}
      <Card>
        <div className="card-title">Neueste Belege</div>
        <div className="list-divider">
          {recentReceipts.length === 0 && (
            <div className="subtle" style={{ padding: "8px 0" }}>Keine Belege vorhanden.</div>
          )}
          {recentReceipts.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>#{r.receiptNo}</span>
              <span>{money(r.grossCents, r.currency || currency)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Neueste Rechnungen */}
      <Card>
        <div className="card-title">Neueste Rechnungen</div>
        <div className="list-divider">
          {recentInvoices.length === 0 && (
            <div className="subtle" style={{ padding: "8px 0" }}>Keine Rechnungen vorhanden.</div>
          )}
          {recentInvoices.map(inv => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>#{inv.invoiceNo} — {inv.customerName || "Unbekannt"}</span>
              <span>{money(inv.grossCents, inv.currency || currency)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
