"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [totals, setTotals] = useState({ today: 0, last7: 0, last30: 0 });
  const [counts, setCounts] = useState({ customers: 0, products: 0, invoices: 0, receipts: 0 });
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Currency kommt aus Settings in /api/dashboard
  const [currency, setCurrency] = useState("EUR");

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

        // falls Settings im Backend ergänzt wurden
        if (js.data.settings?.currencyDefault) {
          setCurrency(js.data.settings.currencyDefault);
        }
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
      {/* Umsätze */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Heute" value={totals.today} currency={currency} />
        <StatCard title="Letzte 7 Tage" value={totals.last7} currency={currency} />
        <StatCard title="Letzte 30 Tage" value={totals.last30} currency={currency} />
      </section>

      {/* Zähler */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CountCard title="Kunden" value={counts.customers} />
        <CountCard title="Produkte" value={counts.products} />
        <CountCard title="Rechnungen" value={counts.invoices} />
        <CountCard title="Belege" value={counts.receipts} />
      </section>

      {/* Neueste Belege */}
      <section>
        <h2 className="font-bold text-lg mb-2">Neueste Belege</h2>
        <div className="bg-white shadow rounded p-2">
          {recentReceipts.length === 0 && (
            <div className="text-sm text-gray-500">Keine Belege vorhanden.</div>
          )}
          {recentReceipts.map(r => (
            <div
              key={r.id}
              className="flex justify-between border-b last:border-b-0 py-1 text-sm"
            >
              <span>#{r.receiptNo}</span>
              <span>
                {(r.grossCents / 100).toFixed(2)} {r.currency || currency}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Neueste Rechnungen */}
      <section>
        <h2 className="font-bold text-lg mb-2">Neueste Rechnungen</h2>
        <div className="bg-white shadow rounded p-2">
          {recentInvoices.length === 0 && (
            <div className="text-sm text-gray-500">Keine Rechnungen vorhanden.</div>
          )}
          {recentInvoices.map(inv => (
            <div
              key={inv.id}
              className="flex justify-between border-b last:border-b-0 py-1 text-sm"
            >
              <span>#{inv.invoiceNo} — {inv.customerName || "Unbekannt"}</span>
              <span>
                {(inv.grossCents / 100).toFixed(2)} {inv.currency || currency}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, currency }) {
  return (
    <div className="bg-white shadow rounded p-4 text-center">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-bold">
        {(value / 100).toFixed(2)} {currency}
      </div>
    </div>
  );
}

function CountCard({ title, value }) {
  return (
    <div className="bg-white shadow rounded p-4 text-center">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
