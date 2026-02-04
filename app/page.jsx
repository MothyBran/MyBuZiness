// app/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Page, PageHeader, Card, PageGrid, Col, Icon } from "./components/UI";

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
      // Settings
      const settings = await safeGet("/api/settings", { ok: true, data: {} });
      const cfg = settings?.data || settings || {};
      setCurrency(cfg.currency || "EUR");

      // Dashboard
      const dash = await safeGet("/api/dashboard", { ok: true, data: {} });
      const d = dash?.data || {};

      // Fallbacks
      const receipts = await safeGet("/api/receipts?limit=5", { ok: true, data: [] });
      const invoices = await safeGet("/api/invoices?limit=5", { ok: true, data: [] });
      const appts    = await safeGet("/api/appointments?upcoming=3", []);

      // Counts
      const customers = await safeGet("/api/customers?count=1", { ok: true, data: [] });
      const products  = await safeGet("/api/products?count=1", { ok: true, data: [] });

      const totals = d.totals || {};
      const counts = d.counts || {};

      setStats({
        today: Number(totals.today || 0),
        last7: Number(totals.last7 || 0),
        last30: Number(totals.last30 || 0),
        customers: Number(counts.customers ?? (Array.isArray(customers?.data) ? customers.data.length : 0)),
        products: Number(counts.products ?? (Array.isArray(products?.data) ? products.data.length : 0)),
        invoices: Number(counts.invoices || 0),
        receipts: Number(counts.receipts || 0),
      });

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
    <Page>
      <PageHeader title="Dashboard" />

      <div className="kpi-grid mb-6">
        <KpiCard title="Heute" value={moneyFromCents(stats.today, currency)} icon="euro" tone="brand" />
        <KpiCard title="Letzte 7 Tage" value={moneyFromCents(stats.last7, currency)} />
        <KpiCard title="Letzte 30 Tage" value={moneyFromCents(stats.last30, currency)} />
        <KpiCard title="Kunden" value={stats.customers} icon="user" />
        <KpiCard title="Produkte" value={stats.products} icon="box" />
        <KpiCard title="Rechnungen" value={stats.invoices} icon="file-text" />
        <KpiCard title="Belege" value={stats.receipts} icon="receipt" />
      </div>

      <PageGrid>
        {/* Neueste Belege */}
        <Col span={4} className="col-span-12 md:col-span-6 lg:col-span-4">
          <Card title="Neueste Belege">
            <List
              items={latestReceipts}
              empty="Keine Belege vorhanden."
              mapItem={(r) => {
                const no = r.receiptNo ?? r.no ?? r.number ?? r.title ?? "(ohne Nummer)";
                const dateStr = r.date ? formatDateDE(r.date) : r.createdAt ? formatDateDE(r.createdAt) : "";
                const vendor = r.vendor ?? r.supplier ?? r.supplierName ?? r.title ?? "";
                const href = r.receiptNo ? `/belege?no=${encodeURIComponent(r.receiptNo)}`
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
          </Card>
        </Col>

        {/* Neueste Rechnungen */}
        <Col span={4} className="col-span-12 md:col-span-6 lg:col-span-4">
          <Card title="Neueste Rechnungen">
            <List
              items={latestInvoices}
              empty="Keine Rechnungen vorhanden."
              mapItem={(r) => {
                const no = r.invoiceNo ?? r.no ?? r.number ?? "(ohne Nummer)";
                const dateStr = r.issueDate ? formatDateDE(r.issueDate) : r.date ? formatDateDE(r.date) : r.createdAt ? formatDateDE(r.createdAt) : "";
                const href = r.invoiceNo ? `/rechnungen?no=${encodeURIComponent(r.invoiceNo)}`
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
          </Card>
        </Col>

        {/* Nächste Termine */}
        <Col span={4} className="col-span-12 md:col-span-12 lg:col-span-4">
          <Card title="Nächste Termine">
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
          </Card>
        </Col>
      </PageGrid>

      <style jsx>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .mb-6 { margin-bottom: 1.5rem; }
      `}</style>
    </Page>
  );
}

/* ========== Subcomponents ========== */
function KpiCard({ title, value, tone, icon }) {
  return (
    <div className="card" style={{ padding: "1.25rem", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="kpi-title">{title}</div>
          <div className="kpi-value" style={{ color: tone === "brand" ? "var(--brand)" : "inherit" }}>
            {value ?? 0}
          </div>
        </div>
        {icon && (
          <div className="kpi-icon">
             {/* Using a simple placeholder if UI.Icon is not available or mapped */}
             <Icon name={icon} />
          </div>
        )}
      </div>
      <style jsx>{`
        .kpi-title { font-size: 0.875rem; color: var(--muted); margin-bottom: 0.25rem; font-weight: 500; }
        .kpi-value { font-size: 1.5rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
        .kpi-icon { color: var(--brand); opacity: 0.15; transform: scale(1.5); transform-origin: top right; }
      `}</style>
    </div>
  );
}

function List({ items, empty, mapItem }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div style={{ padding: "1rem", color: "var(--muted)", fontStyle: "italic" }}>{empty}</div>;
  }
  return (
    <div className="list">
      {items.map((it, idx) => {
        const m = mapItem(it, idx);
        return (
          <Link
            key={idx}
            href={m.href || "#"}
            prefetch={false}
            onClick={() => document.dispatchEvent(new Event("app:nav"))}
            className="list-item"
          >
            <div className="list-icon">
              {m.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ellipsis" style={{ fontWeight: 600, fontSize: "0.93rem" }}>{m.title}</div>
              <div className="ellipsis" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{m.meta}</div>
            </div>
          </Link>
        );
      })}
      <style jsx>{`
        .list { display: flex; flex-direction: column; }
        .list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          text-decoration: none;
          color: inherit;
          transition: background 0.1s;
        }
        .list-item:last-child { border-bottom: none; }
        .list-item:hover {
            background-color: var(--panel-2);
            margin-left: -1.25rem; margin-right: -1.25rem;
            padding-left: 1.25rem; padding-right: 1.25rem;
        }

        .list-icon {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--panel-2);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          color: var(--text-weak);
        }
      `}</style>
    </div>
  );
}
