// app/belege/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ───────── Helpers ───────── */
const toInt = (v) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
function fmtDEDate(input){
  if (!input) return "—";
  const d = new Date(input);
  return isNaN(d) ? "—" : d.toLocaleDateString("de-DE");
}
async function safeGet(url, fallback){
  try{
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) return fallback;
    const js = await r.json().catch(()=>fallback);
    return js ?? fallback;
  }catch{
    return fallback;
  }
}
function unpack(resp){
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.rows)) return resp.rows;
  if (Array.isArray(resp?.data?.rows)) return resp.data.rows;
  return [];
}

/* ───────── Page ───────── */
export default function ReceiptsPage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({}); // {id:{loading, err, data}}

  // Modal Edit/New
  const [isOpen, setIsOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // Formularfelder (Edit/New)
  const [receiptNo, setReceiptNo] = useState("");
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [vatExempt, setVatExempt] = useState(true);
  const [items, setItems] = useState([{ id: crypto?.randomUUID?.() || String(Math.random()), name:"", quantity:1, unitPriceCents:0 }]);

  const currency = "EUR"; // Fallback/Anzeige – ggf. aus /api/settings laden, wenn gewünscht

  useEffect(()=>{ load(); },[]);
  async function load(){
    setLoading(true); setErr("");
    try{
      const listRes = await safeGet("/api/receipts?limit=500", []);
      const list = unpack(listRes);
      setRows(Array.isArray(list) ? list : []);
    }catch(e){ setErr(String(e?.message||e)); setRows([]); }
    finally{ setLoading(false); }
  }

  function toggleExpand(id){
    setExpandedId(p => p===id ? null : id);
    if (!id) return;
    if (details[id]) return;
    setDetails(prev => ({ ...prev, [id]: { loading:true, err:"", data:null } }));
    loadDetail(id);
  }
  async function loadDetail(id){
    try{
      const js = await safeGet(`/api/receipts/${id}`, { ok:false });
      const data = js?.data || (js?.ok ? null : null);
      setDetails(prev => ({ ...prev, [id]: { loading:false, err:"", data } }));
    }catch(e){
      setDetails(prev => ({ ...prev, [id]: { loading:false, err:String(e?.message||e), data:null } }));
    }
  }

  async function onDelete(id){
    if(!confirm("Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method:"DELETE" }).catch(()=>null);
    if(!res || !res.ok){ alert("Löschen fehlgeschlagen."); return; }
    setRows(prev => prev.filter(r => r.id !== id));
    setExpandedId(p => p===id ? null : p);
  }

  function openEdit(row){
    setEditRow(row);
    setReceiptNo(row.receiptNo || "");
    setDate(row.date ? String(row.date).slice(0,10) : new Date().toISOString().slice(0,10));
    setDiscount(String((toInt(row.discountCents||0)/100).toFixed(2)).replace(".", ","));
    setNote(row.note || "");
    setVatExempt(!!row.vatExempt);
    // Details (Positionen) laden, falls noch nicht vorhanden:
    const det = details[row.id]?.data;
    const src = Array.isArray(det?.items) ? det.items : [];
    setItems(
      src.length
        ? src.map(it => ({
            id: crypto?.randomUUID?.() || String(Math.random()),
            name: it.name || "",
            quantity: toInt(it.quantity||1),
            unitPriceCents: toInt(it.unitPriceCents||0),
          }))
        : [{ id: crypto?.randomUUID?.() || String(Math.random()), name:"", quantity:1, unitPriceCents:0 }]
    );
    setIsOpen(true);
  }
  function openNew(){
    setEditRow(null);
    const yy = String(new Date().getFullYear()).slice(-2);
    const mm = String(new Date().getMonth()+1).padStart(2,"0");
    setReceiptNo(`BN-${yy}${mm}-001`);
    setDate(new Date().toISOString().slice(0,10));
    setDiscount("0");
    setNote("");
    setVatExempt(true);
    setItems([{ id: crypto?.randomUUID?.() || String(Math.random()), name:"", quantity:1, unitPriceCents:0 }]);
    setIsOpen(true);
  }

  const totals = useMemo(()=>{
    const disc = Math.max(0, Math.round(parseFloat(String(discount||"0").replace(",", ".")) * 100) || 0);
    const netRaw = items.reduce((s,r)=> s + toInt(r.quantity||0)*toInt(r.unitPriceCents||0), 0);
    const netAfter = Math.max(0, netRaw - disc);
    const tax = vatExempt ? 0 : Math.round(netAfter * 0.19);
    const gross = netAfter + tax;
    return { netRaw, disc, netAfter, tax, gross };
  },[items, discount, vatExempt]);

  function patchItem(id, patch){
    setItems(prev => prev.map(r => r.id===id ? { ...r, ...patch } : r));
  }
  function addRow(){ setItems(prev => [...prev, { id: crypto?.randomUUID?.() || String(Math.random()), name:"", quantity:1, unitPriceCents:0 }]); }
  function removeLast(){ setItems(prev => prev.length<=1 ? prev : prev.slice(0,-1)); }

  async function onSave(e){
    e?.preventDefault?.();
    const clean = items
      .map(it => ({
        name: (it.name||"").trim() || "Position",
        quantity: toInt(it.quantity||0),
        unitPriceCents: toInt(it.unitPriceCents||0),
      }))
      .filter(it => it.quantity>0);

    if(clean.length===0){ alert("Bitte mindestens eine Position erfassen."); return; }

    const payload = {
      receiptNo: receiptNo || undefined,
      date,
      currency,
      vatExempt: !!vatExempt,
      discountCents: totals.disc,
      note,
      items: clean
    };

    let ok = false;
    if (editRow) {
      const res = await fetch(`/api/receipts/${editRow.id}`, {
        method:"PUT",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify(payload)
      }).catch(()=>null);
      ok = !!(res && res.ok);
    } else {
      const res = await fetch(`/api/receipts`, {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify(payload)
      }).catch(()=>null);
      ok = !!(res && res.ok);
    }
    if(!ok){ alert("Speichern fehlgeschlagen."); return; }
    setIsOpen(false);
    await load();
  }

  return (
    <main className="ivx-page">
      <div className="card">
        <div className="ivx-head">
          <h1 className="page-title" style={{ margin:0 }}>Belege</h1>
          <button className="btn" onClick={openNew}>+ Neuer Beleg</button>
        </div>
      </div>

      {err && <div className="card" style={{ color:"#b91c1c", fontWeight:600 }}>Fehler beim Laden: {err}</div>}

      {/* Nur diese Card ist horizontal scrollbar */}
      <div className="card table-card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width:"42%" }} />
              <col style={{ width:"28%" }} />
              <col style={{ width:"30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Datum</th>
                <th style={{ textAlign:"right" }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="muted">Lade…</td></tr>}
              {!loading && rows.length===0 && <tr><td colSpan={3} className="muted">Keine Belege vorhanden.</td></tr>}

              {!loading && rows.map(r=>{
                const isOpen = expandedId===r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="row-clickable" onClick={()=>toggleExpand(r.id)}>
                      <td className="ellipsis">#{r.receiptNo || "—"}</td>
                      <td>{fmtDEDate(r.date)}</td>
                      <td style={{ textAlign:"right", fontWeight:700 }}>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={3} className="details-cell">
                          <div className="detail-head">
                            <div>
                              <div className="muted">Beleg</div>
                              <div className="h5">#{r.receiptNo || "—"}</div>
                              {!!r.note && <div className="muted">Notiz: <strong>{r.note}</strong></div>}
                            </div>
                            <div className="actions">
                              {/* 🔽 Druckansicht sichtbar */}
                              <a className="btn-ghost" href={`/belege/${r.id}/druck`} target="_blank" rel="noopener">🖨️ Druckansicht</a>
                              <button className="btn-ghost" onClick={(e)=>{ e.stopPropagation(); openEdit(r); }}>✏️ Bearbeiten</button>
                              <button className="btn-ghost danger" onClick={(e)=>{ e.stopPropagation(); onDelete(r.id); }}>❌ Löschen</button>
                            </div>
                          </div>

                          {/* (optionale) Items aus Details */}
                          {details[r.id]?.loading && <div className="muted" style={{padding:"6px 0"}}>Details laden…</div>}
                          {details[r.id]?.err && !details[r.id].loading && <div style={{ color:"#b91c1c" }}>Fehler: {details[r.id].err}</div>}

                          {!!details[r.id]?.data?.items?.length && (
                            <div className="table-wrap positions">
                              <table className="table table-fixed" style={{ minWidth:720 }}>
                                <thead>
                                  <tr>
                                    <th style={{ width:"50%" }}>Bezeichnung</th>
                                    <th style={{ width:"10%" }}>Menge</th>
                                    <th style={{ width:"20%" }}>Einzelpreis</th>
                                    <th style={{ width:"20%" }}>Summe</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details[r.id].data.items.map((it,i)=>{
                                    const qty = toInt(it.quantity||0);
                                    const unit= toInt(it.unitPriceCents||0);
                                    const line= toInt(it.lineTotalCents ?? (qty*unit));
                                    return (
                                      <tr key={i}>
                                        <td className="ellipsis">{it.name || "—"}</td>
                                        <td>{qty}</td>
                                        <td>{money(unit, r.currency || currency)}</td>
                                        <td>{money(line, r.currency || currency)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="totals">
                            Netto: {money(r.netCents, r.currency || currency)} · USt: {money(r.taxCents, r.currency || currency)} · Gesamt: {money(r.grossCents, r.currency || currency)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Neu/Bearbeiten */}
      {isOpen && (
        <div className="ivx-modal" role="dialog" aria-modal="true" onClick={(e)=>{ if(e.target===e.currentTarget) setIsOpen(false); }}>
          <div className="ivx-modal-box" onClick={(e)=>e.stopPropagation()}>
            <div className="ivx-modal-head">
              <h2 style={{margin:0}}>{editRow ? "Beleg bearbeiten" : "Neuer Beleg"}</h2>
              <button className="btn-ghost" onClick={()=>setIsOpen(false)}>Schließen</button>
            </div>

            <form onSubmit={onSave}>
              <div className="surface section">
                <div className="row">
                  <div className="cell w-no">
                    <label className="lbl">Beleg-Nr.</label>
                    <input className="inp" type="text" value={receiptNo} onChange={(e)=>setReceiptNo(e.target.value)} />
                  </div>
                  <div className="cell w-date">
                    <label className="lbl">Datum</label>
                    <input className="inp" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
                  </div>
                </div>
                <div className="row">
                  <div className="cell w-money">
                    <label className="lbl">Rabatt gesamt (€)</label>
                    <input className="inp" type="text" inputMode="decimal" placeholder="0,00" value={discount} onChange={(e)=>setDiscount(e.target.value)} />
                  </div>
                  <div className="cell w-date" style={{ display:"flex", alignItems:"flex-end" }}>
                    <label className="lbl" style={{display:"block"}}>USt befreit (§19)</label>
                    <label style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="checkbox" checked={vatExempt} onChange={(e)=>setVatExempt(e.target.checked)} />
                      <span>Ja</span>
                    </label>
                  </div>
                </div>
                <div className="row">
                  <div className="cell" style={{ maxWidth:560 }}>
                    <label className="lbl">Notiz (optional)</label>
                    <textarea className="inp" rows={3} value={note} onChange={(e)=>setNote(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Positionen */}
              <div className="surface section positions">
                <div className="table-wrap">
                  <table className="table table-fixed">
                    <thead>
                      <tr>
                        <th style={{ width:"52%" }}>Bezeichnung</th>
                        <th style={{ width:"12%" }}>Menge</th>
                        <th style={{ width:"18%" }}>Einzelpreis</th>
                        <th style={{ width:"18%" }}>Summe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(r=>{
                        const qty  = toInt(r.quantity||0);
                        const unit = toInt(r.unitPriceCents||0);
                        const line = qty * unit;
                        return (
                          <tr key={r.id}>
                            <td><input className="inp" type="text" value={r.name} onChange={(e)=>patchItem(r.id,{ name:e.target.value })} /></td>
                            <td>
                              <select className="inp" value={String(qty)} onChange={(e)=>patchItem(r.id,{ quantity: toInt(e.target.value) })}>
                                {Array.from({length:20}).map((_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
                              </select>
                            </td>
                            <td>
                              <input className="inp" type="number" inputMode="numeric"
                                value={Math.round(unit)}
                                onChange={(e)=>patchItem(r.id,{ unitPriceCents: toInt(e.target.value) })}
                                style={{ textAlign:"right" }}
                              />
                            </td>
                            <td style={{ textAlign:"right", fontWeight:700 }}>{money(line, currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button className="btn-ghost" type="button" onClick={addRow}>+ Position</button>
                  <button className="btn-ghost" type="button" onClick={removeLast} disabled={items.length<=1}>– Entfernen</button>
                </div>
              </div>

              {/* Summen */}
              <div className="surface section">
                <div className="totals-grid">
                  <div />
                  <div className="totals-box">
                    <div>Zwischensumme: <strong>{money(totals.netRaw, currency)}</strong></div>
                    <div>Rabatt: <strong>- {money(totals.disc, currency)}</strong></div>
                    <div>Netto: <strong>{money(totals.netAfter, currency)}</strong></div>
                    <div>USt {vatExempt ? "(befreit §19)" : "19%"}: <strong>{money(totals.tax, currency)}</strong></div>
                    <div style={{ fontSize:18, fontWeight:800, marginTop:6 }}>
                      Gesamt: {money(totals.gross, currency)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ivx-modal-actions">
                <button className="btn-ghost" type="button" onClick={()=>setIsOpen(false)}>Abbrechen</button>
                <button className="btn" type="submit">{editRow ? "Speichern" : "Anlegen"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ivx-page{ overflow-x:hidden; }
        .card{ background:#fff;border:1px solid #eee;border-radius:14px;padding:16px }
        .ivx-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280 }
        .h5{ font-size:16px; font-weight:800 }
        .row-clickable{ cursor:pointer }
        .ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

        .card.table-card .table-wrap{ overflow-x:auto }
        .table{ width:100%; border-collapse:collapse; min-width:560px }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }

        .details-cell{ background:#fafafa }
        .detail-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0 6px }
        .actions{ display:flex; gap:8px; flex-wrap:wrap }
        .actions .danger{ color:#c00; border-color:#c00 }
        .totals{ text-align:right; padding:8px 0 6px; font-weight:800 }

        /* Modal */
        .ivx-modal{
          position: fixed; inset: 0; background: rgba(0,0,0,.4);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 16px; z-index: 50;
        }
        .ivx-modal-box{
          width: min(980px, 100%);
          margin-top: 24px;
          background:#fff; border:1px solid #eee; border-radius:14px;
          max-height: calc(100vh - 48px);
          overflow-y: auto; overflow-x: hidden;
        }
        .ivx-modal-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 16px; border-bottom: 1px solid #eee;
          position: sticky; top: 0; background:#fff; z-index: 1;
        }
        .ivx-modal-actions{
          display:flex; justify-content:flex-end; gap:8px; padding: 12px 16px;
          position: sticky; bottom: 0; background:#fff; border-top: 1px solid #eee;
        }

        .surface.section{ padding: 12px 16px; }
        .row{ display:flex; flex-wrap:wrap; gap:12px; }
        .cell{ display:block; flex: 1 1 auto; }
        .lbl{ display:block; font-size:12px; color:#6b7280; margin-bottom:6px }
        .inp{ width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:12px; background:#fff; box-shadow:0 1px 1px rgba(0,0,0,.03) inset; }

        .w-no    { flex: 0 1 220px; max-width: 260px; }
        .w-date  { flex: 0 1 180px; max-width: 220px; }
        .w-money { flex: 0 1 200px; max-width: 240px; }

        .positions .table-wrap{ overflow-x:auto }
        .positions .table{ min-width:720px }

        .btn{ padding:10px 12px; border-radius:12px; background:var(--color-primary,#0aa); color:#fff; border:1px solid transparent; cursor:pointer }
        .btn-ghost{ padding:10px 12px; border-radius:12px; background:#fff; color:var(--color-primary,#0aa); border:1px solid var(--color-primary,#0aa); cursor:pointer }

        @media (max-width: 720px){
          .w-no{ max-width:220px } .w-date{ max-width:200px } .w-money{ max-width:220px }
        }
      `}</style>
    </main>
  );
}
