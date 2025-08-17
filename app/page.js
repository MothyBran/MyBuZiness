"use client";

import { useEffect, useMemo, useState } from "react";
import { fromCents } from "@/lib/money";
import { Section, StatCard, Panel, Table, Muted } from "@/app/components/UI";

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
          fetch("/api/invoices",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/receipts",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/settings",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: { currencyDefault: "EUR" } })),
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

  const turnoverInvoicesMonth = invoicesThisMonth.reduce((s,i)=>s+Number(i.grossCents||0),0);
  const turnoverReceiptsMonth = receiptsThisMonth.reduce((s,r)=>s+Number(r.grossCents||0),0);
  const turnoverMonth = turnoverInvoicesMonth + turnoverReceiptsMonth;

  return (
    <>
      <div className="hero">
        <Section>
          <h1 className="page-title">Übersicht</h1>
          <p className="subtle">Schlanke Kennzahlen und die neuesten Bewegungen. Erfassung erfolgt in den jeweiligen Modulen.</p>
        </Section>
      </div>

      <Section>
        <div className="grid-3">
          <StatCard title="Kunden" value={loading ? "—" : customers.length} foot={<Muted>Gesamt</Muted>} />
          <StatCard title="Umsatz (aktueller Monat)" value={loading ? "—" : fromCents(turnoverMonth, currency)} foot={<Muted>{fromCents(turnoverInvoicesMonth, currency)} Rechnungen · {fromCents(turnoverReceiptsMonth, currency)} Belege</Muted>} />
          <StatCard title="Offene Rechnungen" value={loading ? "—" : invoices.filter(i => i.status === "open").length} foot={<Muted>Status „offen“</Muted>} />
        </div>
      </Section>

      <Section>
        <div className="grid-2">
          <Panel title="Zuletzt erstellte Rechnungen">
            <Table head={["Nr.", "Kunde", "Datum", "Brutto"]} hideOnSmall={[2]}>
              {(loading ? [] : invoices).slice(0, 10).map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.invoiceNo}</td>
                  <td className="ellipsis">{r.customerName}</td>
                  <td className="hide-sm">{new Date(r.issueDate).toLocaleDateString()}</td>
                  <td>{fromCents(r.grossCents, r.currency)}</td>
                </tr>
              ))}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={4}><Muted>Keine Rechnungen vorhanden.</Muted></td></tr>
              )}
            </Table>
          </Panel>

          <Panel title="Zuletzt erfasste Belege">
            <Table head={["Nr.", "Datum", "Betrag"]} hideOnSmall={[1]}>
              {(loading ? [] : receipts).slice(0, 10).map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.receiptNo}</td>
                  <td className="hide-sm">{new Date(r.date).toLocaleDateString()}</td>
                  <td>{fromCents(r.grossCents, r.currency)}</td>
                </tr>
              ))}
              {!loading && receipts.length === 0 && (
                <tr><td colSpan={3}><Muted>Keine Belege vorhanden.</Muted></td></tr>
              )}
            </Table>
          </Panel>
        </div>
      </Section>
    </>
  );
}
