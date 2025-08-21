// app/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

async function safeGet(url, fallback) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return fallback;
    const js = await r.json().catch(() => fallback);
    return js ?? fallback;
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const [stats, setStats] = useState({
    today: 0,
    last7: 0,
    last30: 0,
    customers: 0,
    products: 0,
    invoices: 0,
    receipts: 0,
  });
  const [latestReceipts, setLatestReceipts] = useState([]);
  const [latestInvoices, setLatestInvoices] = useState([]);
  const [nextAppointments, setNextAppointments] = useState([]);

  useEffect(() => {
    (async () => {
      // Dashboard-API (falls vorhanden)
      const dash = await safeGet("/api/dashboard", { ok: true, data: {} });
      const d = dash?.data || {};

      // Einzel-APIs defensiv laden (500 -> leere Daten)
      const receipts = await safeGet("/api/receipts?limit=5", { ok: true, data: [] });
      const invoices = await safeGet("/api/invoices?limit=5", { ok: true, data: [] });
      const appts = await safeGet("/api/appointments?upcoming=3", []); // akzeptiert Array

      // Produkte/Kunden-Zahl ggf. separat ermitteln (falls /api/dashboard sie nicht liefert)
      const customers = await safeGet("/api/customers?count=1", { ok: true, data: [] });
      const products = await safeGet("/api/products?count=1", { ok: true, data: [] });

      setStats({
        today: Number(d.today || 0),
        last7: Number(d.last7 || 0),
        last30: Number(d.last30 || 0),
        customers: Number(d.customers ?? (Array.isArray(customers?.data) ? customers.data.length : 0)),
        products: Number(d.products ?? (Array.isArray(products?.data) ? products.data.length : 0)),
        invoices: Number(d.invoices || 0),
        receipts: Number(d.receipts || 0),
      });

      setLatestReceipts(Array.isArray(receipts?.data) ? receipts.data : []);
      setLatestInvoices(Array.isArray(invoices?.data) ? invoices.data : []);
      setNextAppointments(Array.isArray(appts) ? appts : Array.isArray(appts?.data) ? appts.data : []);
    })();
  }, []);

  return (
    <div className="container" style={{ padding: 12 }}>
      {/* Header */}
      <div
        className="surface"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/termine" className="btn-ghost" prefetch={false}>Termine</Link>
          <Link href="/kunden" className="btn-ghost" prefetch={false}>Kunden</Link>
          <Link href="/produkte" className="btn-ghost" prefetch={false}>Produkte</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        className="surface"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Kpi title="Heute" value={stats.today} />
        <Kpi title="Letzte 7 Tage" value={stats.last7} />
        <Kpi title="Letzte 30 Tage" value={stats.last30} />
        <Kpi title="Kunden" value={stats.customers} />
        <Kpi title="Produkte" value={stats.products} />
        <Kpi title="Rechnungen" value={stats.invoices} />
        <Kpi title="Belege" value={stats.receipts} />
      </div>

      {/* Drei Spalten – mobil automatisch untereinander */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        {/* Neuste Belege */}
        <div className="surface">
          <SectionTitle>Neueste Belege</SectionTitle>
          <List
            items={latestReceipts}
            empty="Keine Belege vorhanden."
            mapItem={(r) => ({
              icon: "🧾",
              title: r.no || r.number || "(ohne Nummer)",
              meta: [r.date?.slice(0, 10), r.vendor || r.title].filter(Boolean).join(" · "),
              href: r.no ? `/belege?no=${encodeURIComponent(r.no)}` : "/belege",
            })}
          />
        </div>

        {/* Neuste Rechnungen */}
        <div className="surface">
          <SectionTitle>Neueste Rechnungen</SectionTitle>
          <List
            items={latestInvoices}
            empty="Keine Rechnungen vorhanden."
            mapItem={(r) => ({
              icon: "📄",
              title: r.no || r.number || "(ohne Nummer)",
              meta: [r.date?.slice(0, 10), r.customerName].filter(Boolean).join(" · "),
              href: r.no ? `/rechnungen?no=${encodeURIComponent(r.no)}` : "/rechnungen",
            })}
          />
        </div>

        {/* Nächste 3 Termine */}
        <div className="surface">
          <SectionTitle>Nächste Termine</SectionTitle>
          <List
            items={nextAppointments}
            empty="Keine anstehenden Einträge."
            mapItem={(e) => ({
              icon: e.kind === "order" ? "🗂️" : "📅",
              title: e.title || "(ohne Titel)",
              meta: `${formatDateDE(e.date)} · ${e.startAt?.slice(0, 5)}${e.endAt ? `–${e.endAt.slice(0, 5)}` : ""}${e.customerName ? ` · ${e.customerName}` : ""}`,
              href: e.id ? `/termine/eintrag/${e.id}` : "/termine",
            })}
          />
        </div>
      </div>
    </div>
  );
}

/* ========== Helpers ========== */
function Kpi({ title, value }) {
  return (
    <div className="surface" style={{ padding: 12, display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{title}</div>
      <div style={{ fontWeight: 800, fontSize: 22 }}>{value ?? 0}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="section-title" style={{ marginBottom: 8 }}>{children}</div>;
}

function List({ items, empty, mapItem }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div style={{ color: "#6b7280" }}>{empty}</div>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((it, idx) => {
        const m = mapItem(it, idx);
        return (
          <Link
            key={idx}
            href={m.href || "#"}
            prefetch={false}
            className="surface"
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: 10,
              alignItems: "center",
              padding: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)",
                background: "#F3F4F6",
                fontSize: 16,
              }}
            >
              {m.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="ellipsis" style={{ fontWeight: 700 }}>{m.title}</div>
              <div className="ellipsis" style={{ fontSize: 13, color: "#374151", opacity: 0.85 }}>{m.meta}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatDateDE(input) {
  const d = toDate(input);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function toDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y, m, d] = input.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const t = new Date(input || Date.now());
  return isNaN(t) ? new Date() : t;
}
