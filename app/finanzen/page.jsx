// app/finanzen/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function cents(v) { return (Number(v||0)/100).toFixed(2) + " €"; }

export default function FinancesPage() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    kind: "expense",
    amount: "",
    date: new Date().toISOString().slice(0,10),
    category: "",
    note: "",
  });

  async function loadSummary() {
    const r = await fetch("/api/finances/summary", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setSummary(j);
  }

  async function loadRows() {
    setLoading(true);
    const r = await fetch("/api/finances/transactions?from=" + encodeURIComponent(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10)));
    const j = await r.json();
    if (j.ok) setRows(j.rows);
    setLoading(false);
  }

  useEffect(() => { loadSummary(); loadRows(); }, []);

  async function saveQuick(e) {
    e.preventDefault();
    const amount_cents = Math.round(parseFloat((form.amount+"").replace(",", ".")) * 100);
    if (!Number.isFinite(amount_cents)) return alert("Betrag ungültig.");
    const body = {
      kind: form.kind,
      amount_cents,
      booked_on: form.date,
      category: form.category || null,
      note: form.note || null,
    };
    const r = await fetch("/api/finances/transactions", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok) return alert(j.error || "Fehler beim Speichern.");
    setForm({ kind:"expense", amount:"", date:new Date().toISOString().slice(0,10), category:"", note:"" });
    await Promise.all([loadSummary(), loadRows()]);
  }

  async function del(id) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    const r = await fetch(`/api/finances/transactions/${id}`, { method:"DELETE" });
    const j = await r.json();
    if (!j.ok) return alert(j.error || "Fehler beim Löschen.");
    await Promise.all([loadSummary(), loadRows()]);
  }

  const totals = useMemo(() => {
    const inc = rows.filter(r=>r.kind==='income').reduce((a,b)=>a+Number(b.amount_cents||0),0);
    const exp = rows.filter(r=>r.kind==='expense').reduce((a,b)=>a+Number(b.amount_cents||0),0);
    return { inc, exp, net: inc - exp };
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Finanzen</h1>

      {/* Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary ? (
          <>
            <SummaryCard title="Heute" data={summary.today} />
            <SummaryCard title="Letzte 7 Tage" data={summary.last_7_days} />
            <SummaryCard title="Letzte 30 Tage" data={summary.last_30_days} />
            <SummaryCard title="Monat (MTD)" data={summary.month_to_date} />
          </>
        ) : (
          <div className="opacity-60">Lade Zusammenfassung…</div>
        )}
      </section>

      {/* Offene Posten */}
      {summary?.open_cents?.total ? (
        <div className="p-3 rounded border bg-yellow-50 text-yellow-900">
          Offene Posten: {cents(summary.open_cents.total)} (Rechnungen: {cents(summary.open_cents.invoices)}, Belege: {cents(summary.open_cents.receipts)})
        </div>
      ) : null}

      {/* Quick Add */}
      <section className="p-4 border rounded-lg bg-white space-y-3">
        <h2 className="font-medium">Schnellerfassung</h2>
        <form onSubmit={saveQuick} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select value={form.kind} onChange={e=>setForm(f=>({...f, kind:e.target.value}))} className="border rounded px-3 py-2">
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
            <option value="transfer">Umbuchung</option>
          </select>
          <input value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} type="text" inputMode="decimal" placeholder="Betrag (z.B. 19,99)" className="border rounded px-3 py-2" />
          <input value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} type="date" className="border rounded px-3 py-2" />
          <input value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))} type="text" placeholder="Kategorie" className="border rounded px-3 py-2" />
          <input value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} type="text" placeholder="Notiz" className="border rounded px-3 py-2 md:col-span-2" />
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2">Speichern</button>
        </form>
      </section>

      {/* Export & Capture */}
      <section className="flex flex-wrap items-center gap-3">
        <a href="/api/export/invoices" className="px-4 py-2 rounded border bg-white hover:bg-gray-50">Rechnungen als CSV</a>
        <a href="/api/export/receipts" className="px-4 py-2 rounded border bg-white hover:bg-gray-50">Belege als CSV</a>
        <DocumentCapture />
      </section>

      {/* Liste */}
      <section className="p-0 border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <div className="font-medium">Buchungen</div>
          <div className="text-sm opacity-70">
            Summe: <b>{cents(totals.net)}</b> &middot; Einnahmen: {cents(totals.inc)} &middot; Ausgaben: {cents(totals.exp)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Datum</Th><Th>Art</Th><Th>Betrag</Th><Th>Kategorie</Th><Th>Notiz</Th><Th>Bezug</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={7}>Lade…</td></tr>
              ) : rows.length ? rows.map(r=>(
                <tr key={r.id} className="border-t">
                  <Td>{r.booked_on}</Td>
                  <Td>{r.kind}</Td>
                  <Td className={r.kind==='expense' ? 'text-red-600' : r.kind==='income' ? 'text-emerald-700':'text-gray-700'}>
                    {cents(r.amount_cents)}
                  </Td>
                  <Td>{r.category || "-"}</Td>
                  <Td className="max-w-[360px] truncate">{r.note || "-"}</Td>
                  <Td>
                    {r.related_invoice_id ? <Link className="underline" href={`/invoices/${r.related_invoice_id}`}>Rechnung</Link> : null}
                    {r.related_receipt_id ? <Link className="underline ml-2" href={`/receipts/${r.related_receipt_id}`}>Beleg</Link> : null}
                    {!r.related_invoice_id && !r.related_receipt_id ? "-" : null}
                  </Td>
                  <Td>
                    <button onClick={()=>del(r.id)} className="px-2 py-1 text-red-700 hover:bg-red-50 rounded">Löschen</button>
                  </Td>
                </tr>
              )) : (
                <tr><td className="p-3" colSpan={7}>Keine Einträge.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, data }) {
  const inc = (data?.income_cents ?? 0);
  const exp = (data?.expense_cents ?? 0);
  const net = (data?.net_cents ?? 0);
  return (
    <div className="p-4 rounded-lg border bg-white">
      <div className="text-sm opacity-70">{title}</div>
      <div className="mt-2 text-xs opacity-70">Einnahmen</div>
      <div className="text-lg font-semibold">{(inc/100).toFixed(2)} €</div>
      <div className="mt-2 text-xs opacity-70">Ausgaben</div>
      <div className="text-lg font-semibold">{(exp/100).toFixed(2)} €</div>
      <div className="mt-2 text-xs opacity-70">Saldo</div>
      <div className={`text-lg font-semibold ${net>=0?'text-emerald-700':'text-red-700'}`}>{(net/100).toFixed(2)} €</div>
    </div>
  );
}

function Th({ children }) { return <th className="text-left px-3 py-2 font-medium">{children}</th>; }
function Td({ children, className }) { return <td className={`px-3 py-2 ${className||""}`}>{children}</td>; }

function DocumentCapture() {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");

  async function upload() {
    if (!file) return alert("Bitte Datei auswählen oder per Kamera aufnehmen.");
    const fd = new FormData();
    fd.append("file", file);
    if (note) fd.append("note", note);
    const r = await fetch("/api/uploads", { method:"POST", body: fd });
    const j = await r.json();
    if (!j.ok) return alert(j.error || "Upload fehlgeschlagen.");
    alert("Upload gespeichert.");
    setFile(null); setNote("");
  }

  return (
    <div className="flex items-center gap-2 p-2 border rounded bg-white">
      <input
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={(e)=> setFile(e.target.files?.[0] || null)}
        className="max-w-[220px]"
      />
      <input
        type="text"
        placeholder="Notiz (optional)"
        value={note}
        onChange={(e)=>setNote(e.target.value)}
        className="border rounded px-2 py-1"
      />
      <button onClick={upload} className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white">
        Dokument erfassen
      </button>
    </div>
  );
}
