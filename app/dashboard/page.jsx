"use client";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher);

  if (isLoading) return <p>Lade Dashboard …</p>;
  if (error || !data?.ok) return <p>Fehler beim Laden: {error?.message || data?.error}</p>;

  const d = data;

  return (
    <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>Dashboard</h1>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <Card title="Rechnungen" value={`${d.totals.invoices.count} Stück`} sub={`${(d.totals.invoices.sum/100).toFixed(2)} €`} />
        <Card title="Quittungen" value={`${d.totals.receipts.count} Stück`} sub={`${(d.totals.receipts.sum/100).toFixed(2)} €`} />
        <Card title="Offene Rechnungen" value={`${d.totals.openInvoices.count}`} sub={`${(d.totals.openInvoices.sum/100).toFixed(2)} € offen`} />
        <Card title="Kunden" value={d.customers} />
        <Card title="Bevorstehende Termine" value={d.upcomingAppointments} />
      </div>

      <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Monatsübersicht</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Monat</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Umsatz (EUR)</th>
          </tr>
        </thead>
        <tbody>
          {d.monthly.map((m) => (
            <tr key={m.ym}>
              <td style={{ padding: "0.5rem" }}>{m.ym}</td>
              <td style={{ padding: "0.5rem", textAlign: "right" }}>{(m.suminv/100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function Card({ title, value, sub }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <h3 style={{ margin: 0, fontSize: "1rem", color: "#555" }}>{title}</h3>
      <p style={{ margin: "0.5rem 0 0", fontSize: "1.4rem" }}>{value}</p>
      {sub && <p style={{ margin: "0.2rem 0 0", fontSize: "0.9rem", color: "#777" }}>{sub}</p>}
    </div>
  );
}
