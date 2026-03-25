"use client";
import { useDialog } from "../components/DialogProvider";
// app/finanzen/page.jsx


import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function centsToEUR(c){ return (Number(c||0)/100).toFixed(2).replace(".", ",") + " €"; }
function toISODate(d=new Date()){ const x=new Date(d); x.setHours(12,0,0,0); return x.toISOString().slice(0,10); }
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;

import { Calendar, Wallet, Receipt, FileText, ArrowUpRight, ArrowDownRight, Activity, Download } from "lucide-react";
import TaxSection from "./components/TaxSection";

export default function FinanzenPage(){
  const { confirm: confirmMsg, alert: alertMsg } = useDialog();
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState([]);

  // Detail View State
  const [expandedRowId, setExpandedRowId] = useState(null);

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

  const [capFile, setCapFile] = useState(null);

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
    if (!Number.isFinite(grossCents) || grossCents<=0) return await alertMsg("Betrag (brutto) ungültig.");

    let documentId = null;
    if (capFile) {
      const fd = new FormData();
      fd.append("file", capFile);
      if (form.note) fd.append("note", form.note);
      const up = await fetch("/api/uploads", { method: "POST", body: fd }).then(r => r.json()).catch(() => ({ ok: false }));
      if (!up.ok) return await alertMsg(up.error || "Upload fehlgeschlagen.");
      documentId = up.file?.id || null;
    }

    const payload = {
      kind: form.kind,
      grossCents,
      vatRate: form.vatRate==="" ? null : Number(form.vatRate),
      bookedOn: form.bookedOn,
      categoryCode: form.categoryCode || null,
      note: form.note || null,
      paymentMethod: form.paymentMethod || null,
      documentId: documentId,
    };
    const r = await fetch("/api/finances/transactions", {
      method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload)
    });
    const j = await r.json();
    if(!j.ok) return await alertMsg(j.error || "Speichern fehlgeschlagen.");
    setForm({ kind:"expense", gross:"", vatRate:"19", bookedOn:toISODate(), categoryCode:"", note:"", paymentMethod:"bank" });
    setCapFile(null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
    await Promise.all([loadSummary(), loadRows()]);
  }

  async function removeRow(id){
    if(!await confirmMsg("Eintrag wirklich löschen?")) return;
    const r = await fetch(`/api/finances/transactions/${id}`, { method:"DELETE" });
    const j = await r.json(); if(!j.ok) return await alertMsg(j.error || "Löschen fehlgeschlagen.");
    if (expandedRowId === id) setExpandedRowId(null);
    await Promise.all([loadSummary(), loadRows()]);
  }

  function toggleRow(id) {
    setExpandedRowId(prev => prev === id ? null : id);
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
      <div style={{display:"grid", gap: 20, gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", marginBottom: 24}}>
        <StatBox title="Heute" data={summary?.periods?.today} icon={<Activity size={18} />} />
        <StatBox title="Letzte 7 Tage" data={summary?.periods?.last7} icon={<Activity size={18} />} />
        <StatBox title="Letzte 30 Tage" data={summary?.periods?.last30} icon={<Activity size={18} />} />
      </div>

      {/* Selected Period Stats */}
      <div className="surface" style={{marginBottom: 24}}>
        <div style={{fontWeight: 600, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
          <Calendar size={18} className="subtle" />
          Auswertung: {new Date(0, parseInt(filterMonth)-1).toLocaleString('de', {month: 'long'})} {filterYear}
        </div>
        <div style={{display:"grid", gap: 20, gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}>
          <MiniStat title="Einnahmen" value={centsToEUR(summary?.periods?.selected?.incomeCents)} icon={<ArrowUpRight size={18} color="#065f46" />} color="#065f46" />
          <MiniStat title="Ausgaben" value={centsToEUR(summary?.periods?.selected?.expenseCents)} icon={<ArrowDownRight size={18} color="#b91c1c" />} color="#b91c1c" />
          <MiniStat title="Belege" value={summary?.periods?.selected?.receiptsCount || 0} icon={<Receipt size={18} className="subtle" />} />
          <MiniStat title="Rechnungen" value={summary?.periods?.selected?.invoicesCount || 0} icon={<FileText size={18} className="subtle" />} />
          <MiniStat title="Arbeitstage" value={summary?.periods?.selected?.workDaysCount || 0} icon={<Wallet size={18} className="subtle" />} />
        </div>
      </div>

      <div style={{display:"grid", gap: 20, gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", marginBottom: 24}}>
        {/* USt-Auswertung (Gewählter Monat) */}
        <div className="surface" style={{borderStyle:"dashed"}}>
          <div style={{fontWeight:800, marginBottom:10}}>Umsatzsteuer ({String(filterMonth).padStart(2,'0')}/{filterYear})</div>
          {summary?.settings?.kleinunternehmer ? (
            <div className="subtle">Kleinunternehmerregelung aktiv – keine USt/VSt.</div>
          ) : (
            <div style={{display:"grid", gap:10}}>
              <div>Umsatz 19%: {centsToEUR(summary?.ust?.mtd?.u19_net)} · Steuer: {centsToEUR(summary?.ust?.mtd?.u19_vat)}</div>
              <div>Umsatz 7%: {centsToEUR(summary?.ust?.mtd?.u07_net)} · Steuer: {centsToEUR(summary?.ust?.mtd?.u07_vat)}</div>
              <div>Vorsteuer 19%: {centsToEUR(summary?.ust?.mtd?.v19_vat)} · Vorsteuer 7%: {centsToEUR(summary?.ust?.mtd?.v07_vat)}</div>
              <div style={{fontWeight:700, paddingTop: 4}}>Zahllast (≈): {centsToEUR(summary?.ust?.mtd?.zahllast)}</div>
            </div>
          )}
        </div>

        {/* EÜR Kurz */}
        <div className="surface" style={{borderStyle:"dashed"}}>
          <div style={{fontWeight:800, marginBottom:10}}>EÜR (Jahr {filterYear})</div>
          <div style={{display: "grid", gap: 10}}>
            <div>Einnahmen (netto): {centsToEUR(summary?.euer?.year?.incomeNet)}</div>
            <div>Ausgaben (netto): {centsToEUR(summary?.euer?.year?.expenseNet)}</div>
            <div style={{fontWeight:700, paddingTop: 4}}>Gewinn/Verlust: {centsToEUR((summary?.euer?.year?.incomeNet||0)-(summary?.euer?.year?.expenseNet||0))}</div>
          </div>
        </div>
      </div>

      {/* Steuern & Vorauszahlungen Section */}
      <TaxSection year={filterYear} isKleinunternehmer={summary?.settings?.kleinunternehmer} />

      {/* Aktionen / Exporte */}
      <div className="surface" style={{marginBottom: 24}}>
        <div style={{fontWeight: 600, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8}}>
          <Download size={18} className="subtle" />
          Exporte & Aktionen
        </div>
        <div style={{display:"grid", gap: 12, gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"}}>
          <a className="btn-ghost" href="/api/export/invoices" style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8}}><Download size={16} /> Rechnungen CSV</a>
          <a className="btn-primary" href={`/api/export/finances/transactions?year=${filterYear}`} style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding:"10px 12px", borderRadius:8, background:"var(--color-primary,#0aa)", color:"#fff", border:"1px solid transparent", cursor:"pointer", textDecoration: "none"}}><Download size={16} /> Transaktionen CSV ({filterYear})</a>
          <Link className="btn-ghost" href={`/finanzen/bericht/${filterYear}`} target="_blank" style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8}}><FileText size={16} /> Umsatzbericht PDF ({filterYear})</Link>
          <a className="btn-ghost" href={`/api/export/finances/ustva?month=${filterYear}-${String(filterMonth).padStart(2,'0')}`} style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8}}><Download size={16} /> USt-VA CSV ({filterYear}-{String(filterMonth).padStart(2,'0')})</a>
          <a className="btn-ghost" href={`/api/export/finances/euer?year=${filterYear}`} style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8}}><Download size={16} /> EÜR CSV ({filterYear})</a>
          <Link className="btn-ghost" href="/rechnungen" style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8}}><FileText size={16} /> Zu Rechnungen →</Link>
          <Link className="btn-ghost" href="/belege" style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 8}}><Receipt size={16} /> Zu Belegen →</Link>
        </div>
      </div>

      {/* Schnellerfassung */}
      <div className="surface" style={{display:"grid", gap:16}}>
        <div className="section-title">Schnellerfassung</div>
        <form onSubmit={saveQuick} style={{display:"grid", gap: 16, gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
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
          {!summary?.settings?.kleinunternehmer && (
            <label className="field">
              <span className="label">MwSt-Satz</span>
              <select className="select" value={form.vatRate} onChange={e=>setForm(f=>({...f, vatRate:e.target.value}))}>
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0% / steuerfrei</option>
                <option value="">(keine Angabe)</option>
              </select>
            </label>
          )}
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
            <span className="label">Beleg (optional)</span>
            <input type="file" className="input" accept="image/*,application/pdf" capture="environment"
                 onChange={e=>setCapFile(e.target.files?.[0]||null)} />
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

      {/* Tabelle */}
      <div className="surface" style={{padding:0, overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", padding:"16px 20px", background:"var(--panel, #f8fafc)", borderBottom:"1px solid var(--border, rgba(0,0,0,.06))"}}>
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
                {!summary?.settings?.kleinunternehmer && <th style={th}>MwSt</th>}
                <th style={th}>Netto</th>
                {!summary?.settings?.kleinunternehmer && <th style={th}>USt/VSt</th>}
                <th style={th}>Brutto</th>
                <th style={th}>Zahlungsart</th>
                <th style={th}>Bezug</th>
                <th style={{...th, textAlign:"right"}}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={td} colSpan={summary?.settings?.kleinunternehmer ? 8 : 10}>Lade…</td></tr>
              ) : rows.length ? rows.map(r=>(
                <React.Fragment key={r.id}>
                  <tr style={{cursor: "pointer", background: expandedRowId === r.id ? "var(--panel, #f8fafc)" : "transparent"}} onClick={() => toggleRow(r.id)}>
                    <td style={td}>{r.bookedOn}</td>
                    <td style={td}>{r.kind}</td>
                    <td style={td}>{r.categoryName || r.categoryCode || "-"}</td>
                    {!summary?.settings?.kleinunternehmer && <td style={td}>{(r.vatRate==null || Number.isNaN(Number(r.vatRate)))? "—" : `${Number(r.vatRate)}%`}</td>}
                    <td style={td}>{centsToEUR(r.netCents)}</td>
                    {!summary?.settings?.kleinunternehmer && <td style={td}>{centsToEUR(r.vatCents)}</td>}
                    <td style={td}><b>{centsToEUR(r.grossCents)}</b></td>
                    <td style={td}>{r.paymentMethod || "-"}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {r.invoiceId && <Link href="/rechnungen" className="btn-xxs">Rechnung</Link>}{" "}
                      {r.receiptId && <Link href="/belege" className="btn-xxs">Beleg</Link>}{" "}
                      {r.documentId && <span className="btn-xxs" style={{cursor: "pointer", textDecoration: "underline"}} onClick={()=>openDoc(r.documentId)} title="Dokument ansehen">Dokument</span>}
                    </td>
                    <td style={{...td, textAlign:"right"}} onClick={e => e.stopPropagation()}>
                      <button className="btn-xxs btn-danger" onClick={()=>removeRow(r.id)}>Löschen</button>
                    </td>
                  </tr>
                  {expandedRowId === r.id && (
                    <tr style={{background: "var(--panel, #f8fafc)"}}>
                      <td colSpan={summary?.settings?.kleinunternehmer ? 8 : 10} style={{padding: "16px 20px", borderBottom: "1px solid var(--border, #f2f2f2)"}}>
                        <div style={{display: "flex", gap: 24, flexWrap: "wrap"}}>
                          <div style={{flex: "1 1 300px"}}>
                            <div style={{fontWeight: 600, marginBottom: 8}}>Details</div>
                            <div style={{display: "grid", gap: 4, fontSize: 14}}>
                              <div><span className="subtle">Notiz:</span> {r.note || "-"}</div>
                              <div><span className="subtle">Erstellt am:</span> {new Date(r.createdAt).toLocaleString('de-DE')}</div>
                              {r.invoiceId && <div><span className="subtle">Rechnung ID:</span> {r.invoiceId}</div>}
                              {r.receiptId && <div><span className="subtle">Beleg ID:</span> {r.receiptId}</div>}
                            </div>
                          </div>
                          {r.documentId && (
                            <div style={{flex: "1 1 300px"}}>
                              <div style={{fontWeight: 600, marginBottom: 8}}>Beleg Vorschau</div>
                              <div
                                style={{
                                  border: "1px solid var(--border, #e5e7eb)",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  maxWidth: "100%",
                                  maxHeight: "300px",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  background: "#fff",
                                  position: "relative"
                                }}
                                onClick={() => openDoc(r.documentId)}
                                title="Klicken, um in voller Größe zu öffnen"
                              >
                                <iframe
                                  src={`/api/uploads/${r.documentId}#toolbar=0&navpanes=0&scrollbar=0`}
                                  style={{width: "100%", height: "300px", border: "none", pointerEvents: "none"}}
                                  title="Dokument Vorschau"
                                />
                                {/* Overlay to catch clicks on iframe */}
                                <div style={{position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10}} />
                              </div>
                              <div style={{marginTop: 8, textAlign: "right"}}>
                                <button className="btn-xxs" onClick={() => openDoc(r.documentId)}>In neuem Tab öffnen / Herunterladen</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr><td style={td} colSpan={summary?.settings?.kleinunternehmer ? 8 : 10}>Keine Einträge.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function openDoc(id){
  window.open(`/api/uploads/${id}`, '_blank');
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
