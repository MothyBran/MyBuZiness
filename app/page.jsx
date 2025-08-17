"use client";

import { useEffect, useMemo, useState } from "react";

function currency(cents, cur = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: cur }).format((cents || 0) / 100);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [currencyCode, setCurrencyCode] = useState("EUR");

  useEffect(() => {
    (async () => {
      try {
        const [cs, iv, rc, st] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/invoices",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/receipts",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/settings",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: { currencyDefault: "EUR" } })),
        ]);
        setCustomers(cs.data || []);
        setInvoices(iv.data || []);
        setReceipts(rc.data || []);
        setCurrencyCode(st?.data?.currencyDefault || "EUR");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ym = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const nowYM = ym(new Date());

  const invThisMonth = useMemo(() => invoices.filter(i => ym(new Date(i.issueDate)) === nowYM), [invoices]);
  const rcpThisMonth = useMemo(() => receipts.filter(r => ym(new Date(r.date)) === nowYM), [receipts]);

  const invSum = invThisMonth.reduce((s,i)=>s + Number(i.grossCents||0), 0);
  const rcpSum = rcpThisMonth.reduce((s,r)=>s + Number(r.grossCents||0), 0);
  const total = invSum + rcpSum;

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      {/* KPIs */}
      <section className="grid-3">
        <Card title="Kunden" value={loading ? "—" : customers.length} foot="Gesamt" />
        <Card
          title="Umsatz (aktueller Monat)"
          value={loading ? "—" : currency(total, currencyCode)}
          foot={`${currency(invSum, currencyCode)} Rechnungen · ${currency(rcpSum, currencyCode)} Belege`}
        />
        <Card title="Offene Rechnungen" value={loading ? "—" : invoices.filter(i => i.status === "open").length} foot="Status „offen“" />
      </section>

      {/* Listen */}
      <section className="grid-2" style={{ marginTop: 16 }}>
        <Panel title="Zuletzt erstellte Rechnungen">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Kunde</th>
                  <th className="hide-sm">Datum</th>
                  <th>Brutto</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : invoices).slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td className="ellipsis">{r.invoiceNo}</td>
                    <td className="ellipsis">{r.customerName}</td>
                    <td className="hide-sm">{new Date(r.issueDate).toLocaleDateString()}</td>
                    <td>{currency(r.grossCents, r.currency || currencyCode)}</td>
                  </tr>
                ))}
                {!loading && invoices.length === 0 && (
                  <tr><td colSpan={4} style={{ color:"#666" }}>Keine Rechnungen vorhanden.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Zuletzt erfasste Belege">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th className="hide-sm">Datum</th>
                  <th>Betrag</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : receipts).slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td className="ellipsis">{r.receiptNo}</td>
                    <td className="hide-sm">{new Date(r.date).toLocaleDateString()}</td>
                    <td>{currency(r.grossCents, r.currency || currencyCode)}</td>
                  </tr>
                ))}
                {!loading && receipts.length === 0 && (
                  <tr><td colSpan={3} style={{ color:"#666" }}>Keine Belege vorhanden.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}

/* kleine lokale UI-Helfer */
function Card({ title, value, foot }) {
  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--color-primary)" }}>{value}</div>
      {foot && <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>{foot}</div>}
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div className="surface" style={{ padding: 14 }}>
      <div style={{ fontWeight: 800, margin: "2px 2px 12px" }}>{title}</div>
      {children}
    </div>
  );
}
