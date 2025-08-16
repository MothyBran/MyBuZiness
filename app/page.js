"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fromCents } from "@/lib/money";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    (async () => {
      try {
        const [cs, iv, rc, st] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/invoices", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/receipts", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/settings", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: { currencyDefault: "EUR" } }))
        ]);
        setCustomers(cs.data || []);
        setInvoices(iv.data || []);
        setReceipts(rc.data || []);
        setCurrency(st?.data?.currencyDefault || "EUR");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date();
  const ym = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const currentYM = ym(today);

  const invoicesThisMonth = useMemo(() => invoices.filter(i => ym(new Date(i.issueDate)) === currentYM), [invoices, currentYM]);
  const receiptsThisMonth = useMemo(() => receipts.filter(r => ym(new Date(r.date)) === currentYM), [receipts, currentYM]);

  const turnoverInvoicesMonth = useMemo(() => invoicesThisMonth.reduce((s,i)=>s+Number(i.grossCents||0),0), [invoicesThisMonth]);
  const turnoverReceiptsMonth = useMemo(() => receiptsThisMonth.reduce((s,r)=>s+Number(r.grossCents||0),0), [receiptsThisMonth]);
  const turnoverMonth = turnoverInvoicesMonth + turnoverReceiptsMonth;

  return (
    <main>
      <h1 style={{ marginBottom: 8 }}>Übersicht</h1>
      <p style={{ color:"#666", marginTop: 0 }}>
        Kurzer Überblick über Kunden, Rechnungen und Belege. Erfassung erfolgt in den jeweiligen Modulen.
      </p>

      <div style={grid3}>
        <Card title="Kunden">
          <div style={kpi}>{customers.length}</div>
          <div style={kpiNote}>Gesamt</div>
        </Card>

        <Card title="Umsatz (aktueller Monat)">
          <div style={kpi}>{fromCents(turnoverMonth, currency)}</div>
          <div style={kpiNote}>
            {fromCents(turnoverInvoicesMonth, currency)} Rechnungen · {fromCents(turnoverReceiptsMonth, currency)} Belege
          </div>
        </Card>

        <Card title="Offene Rechnungen">
          <div style={kpi}>{invoices.filter(i => i.status === "open").length}</div>
          <div style={kpiNote}>Status offen</div>
        </Card>
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <strong>Schnelle Navigation</strong>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
          <Link href="/kunden" style={btnGhost}>Kunden</Link>
          <Link href="/produkte" style={btnGhost}>Produkte/Dienstleistungen</Link>
          <Link href="/rechnungen" style={btnGhost}>Rechnungen</Link>
          <Link href="/belege" style={btnGhost}>Belege</Link>
          <Link href="/einstellungen" style={btnGhost}>Einstellungen</Link>
        </div>
      </div>

      <div style={{ display:"grid", gap:16, gridTemplateColumns:"1fr 1fr", marginTop:16 }}>
        <Card title="Zuletzt erstellte Rechnungen">
          <List tableHeaders={["Nr.", "Kunde", "Datum", "Brutto"]}>
            {invoices.slice(0,10).map(r => (
              <tr key={r.id}>
                <td style={td}>{r.invoiceNo}</td>
                <td style={td}>{r.customerName}</td>
                <td style={td}>{new Date(r.issueDate).toLocaleDateString()}</td>
                <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
              </tr>
            ))}
            {invoices.length===0 && <EmptyRow cols={4} text="Keine Rechnungen vorhanden." />}
          </List>
        </Card>

        <Card title="Zuletzt erfasste Belege">
          <List tableHeaders={["Nr.", "Datum", "Betrag"]}>
            {receipts.slice(0,10).map(r => (
              <tr key={r.id}>
                <td style={td}>{r.receiptNo}</td>
                <td style={td}>{new Date(r.date).toLocaleDateString()}</td>
                <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
              </tr>
            ))}
            {receipts.length===0 && <EmptyRow cols={3} text="Keine Belege vorhanden." />}
          </List>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }) {
  return (
    <section style={card}>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>{title}</div>
      {children}
    </section>
  );
}
function List({ tableHeaders, children }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>{tableHeaders.map((h,i)=><th key={i} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function EmptyRow({ cols, text }) {
  return <tr><td colSpan={cols} style={{ ...td, textAlign:"center", color:"#999" }}>{text}</td></tr>;
}

const grid3 = { display:"grid", gap:16, gridTemplateColumns:"repeat(3, 1fr)" };
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const kpi = { fontSize:28, fontWeight:800, color:"var(--color-primary)" };
const kpiNote = { color:"#666" };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"8px", fontSize:14 };
const btnGhost = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", textDecoration:"none", display:"inline-block" };
