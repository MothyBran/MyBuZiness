// app/finanzen/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function centsToEUR(c){ return (Number(c||0)/100).toFixed(2).replace(".", ",") + " €"; }
function toISODate(d=new Date()){ const x=new Date(d); x.setHours(12,0,0,0); return x.toISOString().slice(0,10); }
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;

export default function FinanzenPage(){
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState([]);

  // Schnellerfassung (brutto + MwSt-Satz)
  const [form, setForm] = useState({
    kind: "expense",
    gross: "",
    vatRate: "19",
    bookedOn: toISODate(),
    categoryCode: "",
    note: "",
    paymentMethod: "bank",
  });

  // Beleg+Ausgabe in einem Rutsch erfassen
  const [capFile, setCapFile] = useState(null);
  const [capNote, setCapNote] = useState("");

  async function loadSummary(){
    const r = await fetch("/api/finanzen/summary", { cache: "no-store" });
    const j = await r.json(); if (j.ok) setSummary(j);
  }
  async function loadRows(){
    setLoading(true);
    const r = await fetch(`/api/finanzen/transactions?year=${THIS_YEAR}&limit=1000`, { cache:"no-store" });
    const j = await r.json(); if (j.ok) setRows(j.rows || []);
    setLoading(false);
  }
  async function loadCats(){
    const r = await fetch("/api/finanzen/categories", { cache:"no-store" });
    const j = await r.json(); setCats(j.data || []);
  }

  useEffect(()=>{ loadSummary(); loadRows(); loadCats(); }, []);

  async function saveQuick(e){
    e.preventDefault();
    const grossCents = Math.round(parseFloat(String(form.gross).replace(",", ".")) * 100);
    if (!Number.isFinite(grossCents) || grossCents<=0) return alert("Betrag (brutto) ungültig.");
    const payload = {
      kind: form.kind,
      grossCents,
      vatRate: form.vatRate==="" ? null : Number(form.vatRate),
      bookedOn: form.bookedOn,
      categoryCode: form.categoryCode || null,
      note: form.note || null,
      paymentMethod: form.paymentMethod || null,
    };
    const r = await fetch("/api/finanzen/transactions", {
      method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload)
    });
    const j = await r.json();
    if(!j.ok) return alert(j.error || "Speichern fehlgeschlagen.");
    setForm({ kind:"expense", gross:"", vatRate:"19", bookedOn:toISODate(), categoryCode:"", note:"", paymentMethod:"bank" });
    await Promise.all([loadSummary(), loadRows()]);
  }

  async function removeRow(id){
    if(!confirm("Eintrag wirklich löschen?")) return;
    const r = await fetch(`/api/finanzen/transactions/${id}`, { method:"DELETE" });
    const j = await r.json(); if(!j.ok) return alert(j.error || "Löschen fehlgeschlagen.");
    await Promise.all([loadSummary(), loadRows()]);
  }

  // Dokument + Ausgabe (1 Schritt)
  async function captureExpense(){
    if(!capFile) return alert("Bitte Beleg auswählen / scannen.");
    const fd = new FormData(); fd.append("file", capFile); if(capNote) fd.append("note", capNote);
    const up = await fetch("/api/uploads", { method:"POST", body: fd }).then(r=>r.json()).catch(()=>({ok:false}));
    if(!up.ok) return alert(up.error || "Upload fehlgeschlagen.");
    // kleine Ausgabe mit 19% aus Upload erzeugen (anpassbar)
    const gross = prompt("Betrag (brutto) für diesen Beleg eingeben (z. B. 12,99):", "");
    if(!gross) return;
    const grossCents = Math.round(parseFloat(String(gross).replace(",", ".")) * 100);
    if(!Number.isFinite(grossCents) || grossCents<=0) return alert("Betrag ungültig.");
    const tx = await fetch("/api/finanzen/transactions", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        kind:"expense",
        grossCents,
        vatRate: 19,
        bookedOn: toISODate(),
        categoryCode: cats.find(c=>c.type==="expense")?.code || null,
        note: capNote || (capFile?.name || "Dokument"),
        documentId: up.file?.id || null,
        paymentMethod: "bank"
      })
    }).then(r=>r.json()).catch(()=>({ok:false}));
    if(!tx.ok) return alert(tx.error || "Speichern fehlgeschlagen.");
    setCapFile(null); setCapNote("");
    await Promise.all([loadSummary(), loadRows()]);
    alert("Beleg erfasst und Ausgabe gespeichert.");
  }

  const totals = useMemo(()=>{
    const inc = rows.filter(r=>r.kind==='income').reduce((a,b)=>a+Number(b.grossCents||0),0);
    const exp = rows.filter(r=>r.kind==='expense').reduce((a,b)=>a+Number(b.grossCents||0),0);
    return { inc, exp, net: inc-exp };
  },[rows]);

  return (
    <div className="container">
      <h1 className="page-title" style={{marginBottom:4}}>Finanzen</h1>
      <div className="subtle">EÜR & USt-Auswertung · Export · Belegscan</div>

      {/* Summary-Kacheln */}
      <div className="grid-gap-16" style={{display:"grid", gridTemplateColumns:"1fr", gap:12}}>
        <div className="surface" style={{display:"grid", gap:12}}>
          <div className="grid-gap-16" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12}}>
            <StatBox title="Heute" data={summary?.periods?.today} />
            <StatBox title="Letzte 7 Tage" data={summary?.periods?.last7} />
            <StatBox title="Letzte 30 Tage" data={summary?.periods?.last30} />
            <StatBox title="Monat (MTD)" data={summary?.periods?.mtd} />
          </div>

          {/* USt-Auswertung (aktueller Monat) */}
          <div className="surface" style={{borderStyle:"dashed"}}>
            <div style={{fontWeight:800, marginBottom:6}}>Umsatzsteuer (Monat {THIS_MONTH})</div>
            {summary?.settings?.kleinunternehmer ? (
              <div className="subtle">Kleinunternehmerregelung aktiv – keine USt/VSt.</div>
            ) : (
              <div style={{display:"grid", gap:6}}>
                <div>Umsatz 19%: {centsToEUR(summary?.ust?.mtd?.u19_net)} · Steuer: {centsToEUR(summary?.ust?.mtd?.u19_vat)}</div>
                <div>Umsatz 7%: {centsToEUR(summary?.ust?.mtd?.u07_net)} · Steuer: {centsToEUR(summary?.ust?.mtd?.u07_vat)}</div>
                <div>Vorsteuer 19%: {centsToEUR(summary?.ust?.mtd?.v19_vat)} · Vorsteuer 7%: {centsToEUR(summary?.ust?.mtd?.v07_vat)}</div>
                <div style={{fontWeight:700}}>Zahllast (≈): {centsToEUR(summary?.ust?.mtd?.zahllast)}</div>
              </div>
            )}
          </div>

          {/* EÜR Kurz */}
          <div className="surface" style={{borderStyle:"dashed"}}>
            <div style={{fontWeight:800, marginBottom:6}}>EÜR (Jahr {THIS_YEAR})</div>
            <div>Einnahmen (netto): {centsToEUR(summary?.euer?.year?.incomeNet)}</div>
            <div>Ausgaben (netto): {centsToEUR(summary?.euer?.year?.expenseNet)}</div>
            <div style={{fontWeight:700}}>Gewinn/Verlust: {centsToEUR((summary?.euer?.year?.incomeNet||0)-(summary?.euer?.year?.expenseNet||0))}</div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="surface" style={{display:"flex", flexWrap:"wrap", gap:8, alignItems:"center"}}>
        <a className="btn-ghost" href="/api/export/invoices">Rechnungen CSV</a>
        <a className="btn-ghost" href="/api/export/receipts">Belege CSV</a>
        <a className="btn" href={`/api/export/finanzen/transactions?year=${THIS_YEAR}`}>Transaktionen CSV ({THIS_YEAR})</a>
        <a className="btn-ghost" href={`/api/export/finanzen/ustva?month=${THIS_MONTH}`}>USt-VA CSV ({THIS_MONTH})</a>
        <a className="btn-ghost" href={`/api/export/finanzen/euer?year=${THIS_YEAR}`}>EÜR CSV ({THIS_YEAR})</a>
        <Link className="btn-ghost" href="/rechnungen">Zu Rechnungen →</Link>
        <Link className="btn-ghost" href="/belege">Zu Belegen →</Link>
      </div>

      {/* Schnellerfassung */}
      <div className="surface" style={{display:"grid", gap:10}}>
        <div className="section-title">Schnellerfassung</div>
        <form onSubmit={saveQuick} className="grid-gap-16" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
          <label className="field">
            <span className="label">Art</span>
            <select className="select" value={form.kind} onChange={e=>setForm(f=>({...f, kind:e.target.value}))}>
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
              <option value="transfer">Umbuchung</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Betrag (brutto)</span>
            <input className="input" inputMode="decimal" placeholder="z. B. 19,99"
                   value={form.gross} onChange={e=>setForm(f=>({...f, gross:e.target.value}))}/>
          </label>
          <label className="field">
            <span className="label">MwSt-Satz</span>
            <select className="select" value={form.vatRate} onChange={e=>setForm(f=>({...f, vatRate:e.target.value}))}>
              <option value="19">19%</option>
              <option value="7">7%</option>
              <option value="0">0% / steuerfrei</option>
              <option value="">(keine Angabe)</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Datum</span>
            <input className="input" type="date" value={form.bookedOn} onChange={e=>setForm(f=>({...f, bookedOn:e.target.value}))}/>
          </label>
          <label className="field">
            <span className="label">Kategorie</span>
            <select className="select" value={form.categoryCode} onChange={e=>setForm(f=>({...f, categoryCode:e.target.value}))}>
              <option value="">—</option>
              {cats.filter(c=>c.type===form.kind || (form.kind!=="income" && c.type==="expense")).map(c=>
                <option key={c.code} value={c.code}>{c.name}</option>
              )}
            </select>
          </label>
          <label className="field">
            <span className="label">Zahlungsart</span>
            <select className="select" value={form.paymentMethod} onChange={e=>setForm(f=>({...f, paymentMethod:e.target.value}))}>
              <option value="bank">Bank</option>
              <option value="cash">Kasse</option>
              <option value="card">Karte</option>
              <option value="paypal">PayPal</option>
              <option value="other">Sonstiges</option>
            </select>
          </label>
          <label className="field" style={{gridColumn:"1 / -1"}}>
            <span className="label">Notiz</span>
            <input className="input" value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))}/>
          </label>
          <div style={{display:"flex", alignItems:"end"}}>
            <button className="btn" type="submit">Speichern</button>
          </div>
        </form>
      </div>

      {/* Beleg-Scan (Dokument + Ausgabe) */}
      <div className="surface" style={{display:"grid", gap:10}}>
        <div className="section-title">Beleg erfassen (Kamera/Upload)</div>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <input type="file" accept="image/*,application/pdf" capture="environment"
                 onChange={e=>setCapFile(e.target.files?.[0]||null)} />
          <input className="input" placeholder="Notiz (optional)" value={capNote} onChange={e=>setCapNote(e.target.value)}
                 style={{maxWidth:320}} />
          <button className="btn" onClick={captureExpense}>Dokument + Ausgabe speichern</button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="surface" style={{padding:0, overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", padding:"10px 12px", background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,.06)"}}>
          <div className="section-title" style={{margin:0}}>Transaktionen (Jahr {THIS_YEAR})</div>
          <div className="subtle">Saldo: <b>{centsToEUR(totals.net)}</b> · Einnahmen {centsToEUR(totals.inc)} · Ausgaben {centsToEUR(totals.exp)}</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="table" style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={th}>Datum</th>
                <th style={th}>Art</th>
                <th style={th}>Kategorie</th>
                <th style={th}>MwSt</th>
                <th style={th}>Netto</th>
                <th style={th}>USt/VSt</th>
                <th style={th}>Brutto</th>
                <th style={th}>Zahlungsart</th>
                <th style={th}>Bezug</th>
                <th style={{...th, textAlign:"right"}}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={td} colSpan={10}>Lade…</td></tr>
              ) : rows.length ? rows.map(r=>(
                <tr key={r.id}>
                  <td style={td}>{r.bookedOn}</td>
                  <td style={td}>{r.kind}</td>
                  <td style={td}>{r.categoryName || r.categoryCode || "-"}</td>
                  <td style={td}>{(r.vatRate==null || Number.isNaN(Number(r.vatRate)))? "—" : `${Number(r.vatRate)}%`}</td>
                  <td style={td}>{centsToEUR(r.netCents)}</td>
                  <td style={td}>{centsToEUR(r.vatCents)}</td>
                  <td style={td}><b>{centsToEUR(r.grossCents)}</b></td>
                  <td style={td}>{r.paymentMethod || "-"}</td>
                  <td style={td}>
                    {r.invoiceId && <Link href="/rechnungen" className="btn-xxs">Rechnung</Link>}{" "}
                    {r.receiptId && <Link href="/belege" className="btn-xxs">Beleg</Link>}{" "}
                    {r.documentId && <span className="btn-xxs" onClick={()=>openDoc(r.documentId)} title="Dokument ansehen">Dokument</span>}
                  </td>
                  <td style={{...td, textAlign:"right"}}>
                    <button className="btn-xxs btn-danger" onClick={()=>removeRow(r.id)}>Löschen</button>
                  </td>
                </tr>
              )) : (
                <tr><td style={td} colSpan={10}>Keine Einträge.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function openDoc(id){
  // minimalistischer Download/Preview-Endpunkt (optional nachrüsten)
  window.location.href = `/api/uploads/${id}`;
}

function StatBox({ title, data }){
  const net = (data?.incomeCents||0) - (data?.expenseCents||0);
  return (
    <div className="surface">
      <div className="subtle">{title}</div>
      <div style={{marginTop:4, fontSize:13}}>Einnahmen</div>
      <div style={{fontWeight:800, fontSize:18}}>{centsToEUR(data?.incomeCents||0)}</div>
      <div style={{marginTop:8, fontSize:13}}>Ausgaben</div>
      <div style={{fontWeight:800, fontSize:18}}>{centsToEUR(data?.expenseCents||0)}</div>
      <div style={{marginTop:8, fontSize:13}}>Saldo</div>
      <div style={{fontWeight:800, fontSize:18, color: net>=0? "#065f46":"#b91c1c"}}>{centsToEUR(net)}</div>
    </div>
  );
}

const th = { textAlign:"left", padding:"10px 10px", borderBottom:"1px solid #eee", fontSize:13, color:"#374151" };
const td = { padding:"10px 10px", borderBottom:"1px solid #f2f2f2", fontSize:14 };
