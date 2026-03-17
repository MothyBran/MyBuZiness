// app/finanzen/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function centsToEUR(c){ return (Number(c||0)/100).toFixed(2).replace(".", ",") + " €"; }
function toISODate(d=new Date()){ const x=new Date(d); x.setHours(12,0,0,0); return x.toISOString().slice(0,10); }
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;

import { Calendar, Wallet, Receipt, FileText, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

export default function FinanzenPage(){
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState([]);

  // Filter state
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

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
    const r = await fetch(`/api/finances/summary?month=${filterMonth}&year=${filterYear}`, { cache: "no-store" });
    const j = await r.json(); if (j.ok) setSummary(j);
  }
  async function loadRows(){
    setLoading(true);
    // Erzeuge Bounds für den Filter
    const fYear = parseInt(filterYear, 10);
    const fMonth = parseInt(filterMonth, 10);
    const start = new Date(fYear, fMonth - 1, 1).toISOString().slice(0, 10);
    const end = new Date(fYear, fMonth, 1).toISOString().slice(0, 10);

    const r = await fetch(`/api/finances/transactions?from=${start}&to=${end}&limit=1000`, { cache:"no-store" });
    const j = await r.json(); if (j.ok) setRows(j.rows || []);
    setLoading(false);
  }
  async function loadCats(){
    const r = await fetch("/api/finances/categories", { cache:"no-store" });
    const j = await r.json(); setCats(j.data || []);
  }

  useEffect(()=>{ loadSummary(); loadRows(); }, [filterMonth, filterYear]);
  useEffect(()=>{ loadCats(); }, []);

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
    const r = await fetch("/api/finances/transactions", {
      method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload)
    });
    const j = await r.json();
    if(!j.ok) return alert(j.error || "Speichern fehlgeschlagen.");
    setForm({ kind:"expense", gross:"", vatRate:"19", bookedOn:toISODate(), categoryCode:"", note:"", paymentMethod:"bank" });
    await Promise.all([loadSummary(), loadRows()]);
  }

  async function removeRow(id){
    if(!confirm("Eintrag wirklich löschen?")) return;
    const r = await fetch(`/api/finances/transactions/${id}`, { method:"DELETE" });
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
    const tx = await fetch("/api/finances/transactions", {
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
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12}}>
        <div>
          <h1 className="page-title" style={{marginBottom:4}}>Finanzen</h1>
          <div className="subtle">EÜR & USt-Auswertung · Export · Belegscan</div>
        </div>

        {/* Filter Dropdowns */}
        <div style={{display: "flex", gap: 8, alignItems: "center"}}>
          <select className="select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={String(i+1)}>{new Date(0, i).toLocaleString('de', {month: 'long'})}</option>
            ))}
          </select>
          <select className="select" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            {Array.from({length: 5}, (_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={String(y)}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Summary-Kacheln Top */}
      <div className="grid-gap-16" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", marginBottom: 24}}>
        <StatBox title="Heute" data={summary?.periods?.today} icon={<Activity size={18} />} />
        <StatBox title="Letzte 7 Tage" data={summary?.periods?.last7} icon={<Activity size={18} />} />
        <StatBox title="Letzte 30 Tage" data={summary?.periods?.last30} icon={<Activity size={18} />} />
      </div>

      {/* Selected Period Stats */}
      <div className="surface" style={{marginBottom: 24}}>
        <div style={{fontWeight: 600, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8}}>
          <Calendar size={18} className="subtle" />
          Auswertung: {new Date(0, parseInt(filterMonth)-1).toLocaleString('de', {month: 'long'})} {filterYear}
        </div>
        <div className="grid-gap-16" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}>
          <MiniStat title="Einnahmen" value={centsToEUR(summary?.periods?.selected?.incomeCents)} icon={<ArrowUpRight size={18} color="#065f46" />} color="#065f46" />
          <MiniStat title="Ausgaben" value={centsToEUR(summary?.periods?.selected?.expenseCents)} icon={<ArrowDownRight size={18} color="#b91c1c" />} color="#b91c1c" />
          <MiniStat title="Belege" value={summary?.periods?.selected?.receiptsCount || 0} icon={<Receipt size={18} className="subtle" />} />
          <MiniStat title="Rechnungen" value={summary?.periods?.selected?.invoicesCount || 0} icon={<FileText size={18} className="subtle" />} />
          <MiniStat title="Arbeitstage" value={summary?.periods?.selected?.workDaysCount || 0} icon={<Wallet size={18} className="subtle" />} />
        </div>
      </div>

      <div className="grid-gap-16" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", marginBottom: 24}}>
        {/* USt-Auswertung (Gewählter Monat) */}
        <div className="surface" style={{borderStyle:"dashed"}}>
          <div style={{fontWeight:800, marginBottom:6}}>Umsatzsteuer ({String(filterMonth).padStart(2,'0')}/{filterYear})</div>
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
          <div style={{fontWeight:800, marginBottom:6}}>EÜR (Jahr {filterYear})</div>
          <div>Einnahmen (netto): {centsToEUR(summary?.euer?.year?.incomeNet)}</div>
          <div>Ausgaben (netto): {centsToEUR(summary?.euer?.year?.expenseNet)}</div>
          <div style={{fontWeight:700}}>Gewinn/Verlust: {centsToEUR((summary?.euer?.year?.incomeNet||0)-(summary?.euer?.year?.expenseNet||0))}</div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="surface" style={{display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom: 24}}>
        <a className="btn-ghost" href="/api/export/invoices">Rechnungen CSV</a>
        <a className="btn-ghost" href="/api/export/receipts">Belege CSV</a>
        <a className="btn" href={`/api/export/finances/transactions?year=${filterYear}`}>Transaktionen CSV ({filterYear})</a>
        <a className="btn-ghost" href={`/api/export/finances/ustva?month=${filterYear}-${String(filterMonth).padStart(2,'0')}`}>USt-VA CSV ({filterYear}-{String(filterMonth).padStart(2,'0')})</a>
        <a className="btn-ghost" href={`/api/export/finances/euer?year=${filterYear}`}>EÜR CSV ({filterYear})</a>
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", padding:"10px 12px", background:"var(--panel, #f8fafc)", borderBottom:"1px solid var(--border, rgba(0,0,0,.06))"}}>
          <div className="section-title" style={{margin:0}}>Transaktionen ({String(filterMonth).padStart(2,'0')}/{filterYear})</div>
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

function StatBox({ title, data, icon }){
  const net = (data?.incomeCents||0) - (data?.expenseCents||0);
  return (
    <div className="surface" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted, #6b7280)', fontWeight: 500}}>
        {icon} {title}
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <div style={{fontSize: 12, color: 'var(--muted, #6b7280)'}}>Einnahmen</div>
          <div style={{fontWeight: 700, fontSize: 16}}>{centsToEUR(data?.incomeCents||0)}</div>
        </div>
        <div style={{textAlign: 'right'}}>
          <div style={{fontSize: 12, color: 'var(--muted, #6b7280)'}}>Ausgaben</div>
          <div style={{fontWeight: 700, fontSize: 16}}>{centsToEUR(data?.expenseCents||0)}</div>
        </div>
      </div>
      <div style={{paddingTop: 12, borderTop: '1px dashed var(--border, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: 13, fontWeight: 500}}>Saldo</span>
        <span style={{fontWeight: 800, fontSize: 16, color: net>=0? "#065f46":"#b91c1c"}}>{centsToEUR(net)}</span>
      </div>
    </div>
  );
}

function MiniStat({ title, value, icon, color }) {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--panel, #f9fafb)', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'var(--background, #fff)', border: '1px solid var(--border, #e5e7eb)'}}>
        {icon}
      </div>
      <div>
        <div style={{fontSize: 12, color: 'var(--muted, #6b7280)'}}>{title}</div>
        <div style={{fontWeight: 700, fontSize: 16, color: color || 'inherit'}}>{value}</div>
      </div>
    </div>
  );
}

const th = { textAlign:"left", padding:"10px 10px", borderBottom:"1px solid var(--border, #eee)", fontSize:13, color:"var(--muted, #374151)" };
const td = { padding:"10px 10px", borderBottom:"1px solid var(--border, #f2f2f2)", fontSize:14 };
