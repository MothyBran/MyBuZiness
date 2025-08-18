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
      } catch (e) {
        console.error("Dashboard error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-4">⏳ Lade Dashboard…</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* CSS Variablen global setzen */}
      {settings && (
        <style>{`
          :root {
            --color-primary: ${settings.primaryColor || "#0aa"};
            --color-secondary: ${settings.secondaryColor || "#0f766e"};
            --font-family: ${settings.fontFamily || "Inter, sans-serif"};
            --font-color: ${settings.fontColor || "#111111"};
          }
          body {
            font-family: var(--font-family);
            color: var(--font-color);
          }
        `}</style>
      )}

      {/* Umsatz-Karten */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardTitle>Heute</CardTitle>
          <CardValue>{formatMoney(totals.today, currency)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Letzte 7 Tage</CardTitle>
          <CardValue>{formatMoney(totals.last7, currency)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Letzte 30 Tage</CardTitle>
          <CardValue>{formatMoney(totals.last30, currency)}</CardValue>
        </Card>
      </section>

      {/* Zähler */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardTitle>Kunden</CardTitle><CardValue>{counts.customers}</CardValue></Card>
        <Card><CardTitle>Produkte</CardTitle><CardValue>{counts.products}</CardValue></Card>
        <Card><CardTitle>Rechnungen</CardTitle><CardValue>{counts.invoices}</CardValue></Card>
        <Card><CardTitle>Belege</CardTitle><CardValue>{counts.receipts}</CardValue></Card>
      </section>

      {/* Neueste Belege */}
      <Card>
        <CardTitle>Neueste Belege</CardTitle>
        <div className="divide-y">
          {recentReceipts.length === 0 && (
            <div className="text-sm text-gray-500 py-2">Keine Belege vorhanden.</div>
          )}
          {recentReceipts.map(r => (
            <div key={r.id} className="flex justify-between py-2 text-sm">
              <span className="font-medium">#{r.receiptNo}</span>
              <span>{formatMoney(r.grossCents, r.currency || currency)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Neueste Rechnungen */}
      <Card>
        <CardTitle>Neueste Rechnungen</CardTitle>
        <div className="divide-y">
          {recentInvoices.length === 0 && (
            <div className="text-sm text-gray-500 py-2">Keine Rechnungen vorhanden.</div>
          )}
          {recentInvoices.map(inv => (
            <div key={inv.id} className="flex justify-between py-2 text-sm">
              <span className="font-medium">
                #{inv.invoiceNo} — {inv.customerName || "Unbekannt"}
              </span>
              <span>{formatMoney(inv.grossCents, inv.currency || currency)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function formatMoney(cents, currency = "EUR") {
  return `${(Number(cents || 0) / 100).toFixed(2)} ${currency}`;
}

/* --- UI Komponenten --- */
function Card({ children }) {
  return (
    <div className="bg-white shadow-md rounded-xl p-4 hover:shadow-lg transition">
      {children}
    </div>
  );
}

function CardTitle({ children }) {
  return (
    <div className="text-sm text-gray-500 mb-1">{children}</div>
  );
}

function CardValue({ children }) {
  return (
    <div className="text-xl font-bold text-gray-900">{children}</div>
  );
}
