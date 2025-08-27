// app/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* -------- Utils -------- */
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
function toDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y, m, d] = input.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const t = new Date(input || Date.now());
  return isNaN(t) ? new Date() : t;
}
function formatDateDE(input) {
  const d = toDate(input);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
/** Cent -> formatiert mit Währungssymbol (z. B. €) */
function moneyFromCents(cents, currency = "EUR") {
  const eur = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(eur);
  } catch {
    // Fallback, falls unbekannte Currency
    return `${eur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
}

/* -------- Page -------- */
export default function HomePage() {
  const [stats, setStats] = useState({
    today: 0, last7: 0, last30: 0,
    customers: 0, products: 0, invoices: 0, receipts: 0,
  });
  const [currency, setCurrency] = useState("EUR");

  const [latestReceipts, setLatestReceipts] = useState([]);
  const [latestInvoices, setLatestInvoices] = useState([]);
  const [nextAppointments, setNextAppointments] = useState([]);

  useEffect(() => {
    (async () => {
      // Settings (Währung)
      const settings = await safeGet("/api/settings", { ok: true, data: {} });
      const cfg = settings?.data || settings || {};
      setCurrency(cfg.currency || "EUR");

      // Dashboard-API (wenn vorhanden)
      const dash = await safeGet("/api/dashboard", { ok: true, data: {} });
      const d = dash?.data || {};

      // Fallbacks (wenn einzelne Endpunkte existieren)
      const receipts = await safeGet("/api/receipts?limit=5", { ok: true, data: [] });
      const invoices = await safeGet("/api/invoices?limit=5", { ok: true, data: [] });
      const appts    = await safeGet("/api/appointments?upcoming=3", []); // akzeptiert Array

      // Counts: erst aus Dashboard, sonst Fallback zählen
      const customers = await safeGet("/api/customers?count=1", { ok: true, data: [] });
      const products  = await safeGet("/api/products?count=1", { ok: true, data: [] });

      const totals = d.totals || {};
      const counts = d.counts || {};

      // Annahme: totals.* kommen in CENTS (wie im restlichen System)
      setStats({
        today: Number(totals.today || 0),
        last7: Number(totals.last7 || 0),
        last30: Number(totals.last30 || 0),
        customers: Number(counts.customers ?? (Array.isArray(customers?.data) ? customers.data.length : 0)),
        products: Number(counts.products ?? (Array.isArray(products?.data) ? products.data.length : 0)),
        invoices: Number(counts.invoices || 0),
        receipts: Number(counts.receipts || 0),
      });

      // Neueste aus Dashboard bevorzugen (hat garantierte Feldnamen),
      // sonst Fallback aus Einzel-APIs
      setLatestReceipts(
        Array.isArray(d.recentReceipts) && d.recentReceipts.length
          ? d.recentReceipts
          : (Array.isArray(receipts?.data) ? receipts.data : [])
      );
      setLatestInvoices(
        Array.isArray(d.recentInvoices) && d.recentInvoices.length
          ? d.recentInvoices
          : (Array.isArray(invoices?.data) ? invoices.data : [])
      );

      setNextAppointments(
        Array.isArray(appts) ? appts :
        Array.isArray(appts?.data) ? appts.data : []
      );
    })();
  }, []);

  return (
    <>
      {/* Header – Schnellzugriffe entfernt */}
      <div
        className="surface"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
      </div>

      {/* KPIs */}
      <div
        className="surface"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Kpi title="Heute" value={moneyFromCents(stats.today, currency)} />
        <Kpi title="Letzte 7 Tage" value={moneyFromCents(stats.last7, currency)} />
        <Kpi title="Letzte 30 Tage" value={moneyFromCents(stats.last30, currency)} />
        <Kpi title="Kunden" value={stats.customers ?? 0} />
        <Kpi title="Produkte" value={stats.products ?? 0} />
        <Kpi title="Rechnungen" value={stats.invoices ?? 0} />
        <Kpi title="Belege" value={stats.receipts ?? 0} />
      </div>

      {/* Drei Spalten – mobil untereinander */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        {/* Neueste Belege */}
        <div className="surface">
          <SectionTitle>Neueste Belege</SectionTitle>
          <List
            items={latestReceipts}
            empty="Keine Belege vorhanden."
            mapItem={(r) => {
              // Beleg-Nummer verlässlich lesen
              const no =
                r.receiptNo ?? r.no ?? r.number ?? r.title ?? "(ohne Nummer)";
              const dateStr =
                r.date ? formatDateDE(r.date)
                : r.createdAt ? formatDateDE(r.createdAt)
                : "";
              const vendor =
                r.vendor ?? r.supplier ?? r.supplierName ?? r.title ?? "";
              const href =
                r.receiptNo ? `/belege?no=${encodeURIComponent(r.receiptNo)}`
                : r.no ? `/belege?no=${encodeURIComponent(r.no)}`
                : "/belege";
              return {
                icon: "🧾",
                title: no,
                meta: [dateStr, vendor].filter(Boolean).join(" · "),
                href,
              };
            }}
          />
        </div>

        {/* Neueste Rechnungen */}
        <div className="surface">
          <SectionTitle>Neueste Rechnungen</SectionTitle>
          <List
            items={latestInvoices}
            empty="Keine Rechnungen vorhanden."
            mapItem={(r) => {
              // Rechnungsnummer verlässlich lesen
              const no =
                r.invoiceNo ?? r.no ?? r.number ?? "(ohne Nummer)";
              const dateStr =
                r.issueDate ? formatDateDE(r.issueDate)
                : r.date ? formatDateDE(r.date)
                : r.createdAt ? formatDateDE(r.createdAt)
                : "";
              const href =
                r.invoiceNo ? `/rechnungen?no=${encodeURIComponent(r.invoiceNo)}`
                : r.no ? `/rechnungen?no=${encodeURIComponent(r.no)}`
                : "/rechnungen";
              return {
                icon: "📄",
                title: no,
                meta: [dateStr, r.customerName].filter(Boolean).join(" · "),
                href,
              };
            }}
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
    </>
  );
}

/* ========== Subcomponents ========== */
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
            onClick={() => document.dispatchEvent(new Event("app:nav"))}
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
