"use client";
import { useDialog } from "../components/DialogProvider";
// app/belege/page.jsx


import React, { useEffect, useMemo, useState } from "react";
import BarcodeScannerModal from "../components/BarcodeScannerModal";

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
function pad2(n){ return String(n).padStart(2,"0"); }

function toCents(input) {
  if (input == null) return 0;
  if (typeof input === "number") return Math.round(input * 100);
  let s = String(input).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 100;
  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
    const dec = lc > ld ? "," : ".";
    const thou = dec === "," ? "." : ",";
    s = s.replace(new RegExp("\\" + thou, "g"), "");
    s = s.replace(dec, ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function fromCents(c) {
  const n = Number(c || 0) / 100;
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ───────── Page ───────── */
export default function ReceiptsPage(){
  const { confirm: confirmMsg, alert: alertMsg } = useDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({}); // {id:{loading, err, data}}

  // Produkte für Positions-Dropdown
  const [products, setProducts] = useState([]);

  // Settings (Currency + Kleinunternehmer)
  const [settings, setSettings] = useState(null);
  const currency = settings?.currency || "EUR";
  const vatExemptDefault = typeof settings?.kleinunternehmer === "boolean" ? settings.kleinunternehmer : true;
  const vatExempt = vatExemptDefault;

  // Modal Edit/New
  const [isOpen, setIsOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // Search state
  const [q, setQ] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Formularfelder (Edit/New)
  const [receiptNo, setReceiptNo] = useState("");
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");

  const [items, setItems] = useState([
    { id: crypto?.randomUUID?.() || String(Math.random()), productId:"", name:"", quantity:1, unitPriceCents:0, baseCents:0, unitDisplay:"0,00" }
  ]);

  useEffect(()=>{ load(); },[]);
  async function load(){
    setLoading(true); setErr("");
    try{
      const [listRes, prodRes, setRes] = await Promise.all([
        safeGet("/api/receipts?limit=500", []),
        safeGet("/api/products", []),
        safeGet("/api/settings", {})
      ]);
      setRows(unpack(listRes));
      setProducts(unpack(prodRes));
      setSettings(setRes?.data || setRes || null);
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
    if(!await confirmMsg("Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method:"DELETE" }).catch(()=>null);
    if(!res || !res.ok){ await alertMsg("Löschen fehlgeschlagen."); return; }
    setRows(prev => prev.filter(r => r.id !== id));
    setExpandedId(p => p===id ? null : p);
  }

  function onPickProduct(rowId, productId){
    const p = products.find(x => String(x.id)===String(productId));
    if(!p){
      patchItem(rowId, { productId:"", name:"", unitPriceCents:0, baseCents:0, unitDisplay:"0,00" });
      return;
    }
    const kind = p.kind || "product";
    if (kind === "service") {
      const gp = toInt(p.priceCents || 0);
      const hr = toInt(p.hourlyRateCents || 0);
      if (hr > 0) {
        patchItem(rowId, { productId: p.id, name: p.name, baseCents: gp, unitPriceCents: hr, unitDisplay: fromCents(hr) });
      } else {
        patchItem(rowId, { productId: p.id, name: p.name, baseCents: 0, unitPriceCents: gp, unitDisplay: fromCents(gp) });
      }
    } else if (kind === "travel") {
      const base = toInt(p.travelBaseCents || 0);
      const perKm = toInt(p.travelPerKmCents || 0);
      patchItem(rowId, { productId: p.id, name: p.name, baseCents: base, unitPriceCents: perKm, unitDisplay: fromCents(perKm) });
    } else {
      const up = toInt(p.priceCents || 0);
      patchItem(rowId, { productId: p.id, name: p.name, baseCents: 0, unitPriceCents: up, unitDisplay: fromCents(up) });
    }
  }

  function openEdit(row){
    setEditRow(row);
    setReceiptNo(row.receiptNo || "");
    setDate(row.date ? String(row.date).slice(0,10) : new Date().toISOString().slice(0,10));
    setDiscount(String((toInt(row.discountCents||0)/100).toFixed(2)).replace(".", ","));
    setNote(row.note || "");

    const det = details[row.id]?.data;
    const src = Array.isArray(det?.items) ? det.items : [];
    setItems(
      src.length
        ? src.map(it => ({
            id: crypto?.randomUUID?.() || String(Math.random()),
            productId: it.productId || "",
            name: it.name || "",
            quantity: toInt(it.quantity||1),
            unitPriceCents: toInt(it.unitPriceCents||0),
            baseCents: toInt(it.baseCents || 0) || Math.max(0, toInt(it.lineTotalCents || 0) - (toInt(it.quantity||1)*toInt(it.unitPriceCents||0))),
            unitDisplay: fromCents(toInt(it.unitPriceCents||0))
          }))
        : [{ id: crypto?.randomUUID?.() || String(Math.random()), productId:"", name:"", quantity:1, unitPriceCents:0, baseCents:0, unitDisplay:"0,00" }]
    );
    setIsOpen(true);
  }
  async function openNew(){
    setEditRow(null);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = pad2(now.getMonth()+1);

    // Auto-fetch next receipt No.
    let nextNum = "001";
    try {
      const res = await fetch("/api/receipts/nextNo");
      if (res.ok) {
        const js = await res.json();
        if (js.nextNo) nextNum = String(js.nextNo).padStart(3, "0");
      }
    } catch(e) {}

    setReceiptNo(`BN-${yy}${mm}-${nextNum}`);
    setDate(now.toISOString().slice(0,10));
    setDiscount("0");
    setNote(settings?.receiptNoteDefault || "");
    setItems([{ id: crypto?.randomUUID?.() || String(Math.random()), productId:"", name:"", quantity:1, unitPriceCents:0, baseCents:0, unitDisplay:"0,00" }]);
    setIsOpen(true);
  }

  const totals = useMemo(()=>{
    const disc = Math.max(0, toCents(discount||"0"));
    // Beachte: unitPriceCents ist ggf. String oder Number in Cents
    const netRaw = items.reduce((s,r)=> s + (toInt(r.quantity||0) * toInt(r.unitPriceCents||0)) + toInt(r.baseCents||0), 0);
    const netAfter = Math.max(0, netRaw - disc);
    const tax = vatExempt ? 0 : Math.round(netAfter * 0.19);
    const gross = netAfter + tax;
    return { netRaw, disc, netAfter, tax, gross };
  },[items, discount, vatExempt]);

  function patchItem(id, patch){
    setItems(prev => prev.map(r => r.id===id ? { ...r, ...patch } : r));
  }
  function addRow(){ setItems(prev => [...prev, { id: crypto?.randomUUID?.() || String(Math.random()), productId:"", name:"", quantity:1, unitPriceCents:0, baseCents:0, unitDisplay:"0,00" }]); }
  function removeLast(){ setItems(prev => prev.length<=1 ? prev : prev.slice(0,-1)); }

  function onChangeUnitDisplay(id, v) {
    patchItem(id, { unitDisplay: v, unitPriceCents: toCents(v) });
  }

  const filteredRows = useMemo(() => {
    if (!q) return rows;
    const lowerQ = q.toLowerCase();
    return rows.filter((r) => {
      const rn = (r.receiptNo || "").toLowerCase();
      const dt = fmtDEDate(r.date).toLowerCase();
      const num = money(r.grossCents, r.currency || currency).toLowerCase();
      return rn.includes(lowerQ) || dt.includes(lowerQ) || num.includes(lowerQ);
    });
  }, [rows, q, currency]);

  async function onSave(e){
    e?.preventDefault?.();
    const clean = items
      .map(it => ({
        productId: it.productId || null,
        name: (it.name||"").trim() || "Position",
        quantity: toInt(it.quantity||0),
        unitPriceCents: toInt(it.unitPriceCents||0),
        baseCents: toInt(it.baseCents||0),
      }))
      .filter(it => it.quantity>0);

    if(clean.length===0){ await alertMsg("Bitte mindestens eine Position erfassen."); return; }

    const payload = {
      receiptNo: (receiptNo || "").trim() || undefined,
      date: date || new Date().toISOString().slice(0,10),
      currency: currency || "EUR",
      vatExempt: !!vatExempt,
      discountCents: toInt(totals.disc || 0),
      note: (note || "").trim(),
      items: clean
    };

    let ok = false;
    let errMessage = "Speichern fehlgeschlagen.";
    try {
      let res;
      if (editRow) {
        res = await fetch(`/api/receipts/${editRow.id}`, {
          method:"PUT",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/receipts`, {
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify(payload)
        });
      }
      if (res && res.ok) {
        const js = await res.json().catch(()=>({}));
        if (js.ok) {
          ok = true;
        } else {
          errMessage = js.error || errMessage;
        }
      } else if (res) {
        const js = await res.json().catch(()=>({}));
        errMessage = js?.error || errMessage;
      }
    } catch(e) {
       errMessage = e.message || errMessage;
    }
    if(!ok){ await alertMsg(errMessage); return; }
    setIsOpen(false);
    await load();
  }

  return (
    <main className="container">
      {/* Kopf */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom:4 }}>Belege</h1>
          <div className="subtle">Eingangsrechnungen & Quittungen</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen (Nr/Datum/Betrag)…"
            style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--panel)", color: "var(--text)", width: "240px" }}
          />
          <button onClick={() => setShowScanner(true)} className="btn-ghost" title="Barcode scannen">
            📷 Scanner
          </button>
          <button className="btn" onClick={openNew}>+ Neuer Beleg</button>
        </div>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(data) => {
            setQ(data);
            setShowScanner(false);
          }}
        />
      )}

      {err && <div className="surface" style={{ color:"var(--color-danger, #b91c1c)", fontWeight:600, marginBottom: 16 }}>Fehler beim Laden: {err}</div>}

      {/* Tabelle – NUR diese Card bekommt horizontales Scrolling */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width: "auto" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "120px", textAlign: "right" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ paddingRight: "8px" }}>Nr.</th>
                <th style={{ paddingRight: "8px" }}>Datum</th>
                <th style={{ textAlign:"right" }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="muted">Lade…</td></tr>}
              {!loading && filteredRows.length===0 && <tr><td colSpan={3} className="muted">Keine Belege vorhanden.</td></tr>}

              {!loading && filteredRows.map(r=>{
                const isOpen = expandedId===r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="row-clickable" onClick={()=>toggleExpand(r.id)}>
                      <td className="ellipsis nowrap" style={{ paddingRight: "8px" }}>#{r.receiptNo || "—"}</td>
                      <td className="nowrap" style={{ paddingRight: "8px" }}>{fmtDEDate(r.date)}</td>
                      <td className="nowrap" style={{ textAlign:"right", fontWeight:700 }}>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={3} className="details-cell">
                          <div className="details-content-wrapper">
                            <div className="detail-head">
                              <div>
                                <div className="muted">Beleg</div>
                                <div className="h5">#{r.receiptNo || "—"}</div>
                                {!!r.note && <div className="muted"><strong>{r.note}</strong></div>}
                              </div>
                              <div className="actions">
                                <a className="btn-ghost" href={`/belege/${r.id}/druck`} target="_blank" rel="noopener">🖨️ Druckansicht</a>
                                <button className="btn-ghost" onClick={(e)=>{ e.stopPropagation(); openEdit(r); }}>✏️ Bearbeiten</button>
                                <button className="btn-ghost danger" onClick={(e)=>{ e.stopPropagation(); onDelete(r.id); }}>❌ Löschen</button>
                              </div>
                            </div>

                            {details[r.id]?.loading && <div className="muted" style={{padding:"6px 0"}}>Details laden…</div>}
                            {details[r.id]?.err && !details[r.id].loading && <div style={{ color:"#b91c1c" }}>Fehler: {details[r.id].err}</div>}

                            {!!details[r.id]?.data?.items?.length && (
                              <div className="table-wrap positions">
                                <table className="table table-fixed inner-table" style={{ minWidth:500 }}>
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
                                      const base= toInt(it.baseCents||0);
                                      const line= toInt(it.lineTotalCents ?? ((qty*unit)+base));
                                      return (
                                        <tr key={i}>
                                          <td className="ellipsis">
                                            {it.name || "—"}
                                            {base > 0 && <div style={{ fontSize:11, opacity:0.7 }}>inkl. Grundpreis: {money(base, currency)}</div>}
                                          </td>
                                          <td>{qty}</td>
                                          <td>{money(unit, currency)}</td>
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
              {/* Kopf-Felder in *extra schmaler* Spalte, damit Notiz NICHT bis zum Card-Rand läuft */}
              <div className="surface section">
                <div className="form-narrow form-narrow--tight">
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
                    <div className="cell" />
                  </div>

                  <div className="row">
                    <div className="cell w-note">
                      <label className="lbl">Notiz (optional)</label>
                      <textarea className="inp" rows={3} value={note} onChange={(e)=>setNote(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Positionen */}
              <div className="surface section positions">
                <div className="table-wrap">
                  <table className="table table-fixed">
                    <thead>
                      <tr>
                        <th style={{ width:"52%" }}>Produkt/Dienstleistung</th>
                        <th style={{ width:"12%" }}>Menge</th>
                        <th style={{ width:"18%" }}>Einzelpreis</th>
                        <th style={{ width:"18%" }}>Summe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(r=>{
                        const qty  = toInt(r.quantity||0);
                        const unit = toInt(r.unitPriceCents||0);
                        const base = toInt(r.baseCents||0);
                        const line = (qty * unit) + base;
                        return (
                          <tr key={r.id}>
                            <td>
                              <select
                                className="inp"
                                value={r.productId}
                                onChange={(e)=> onPickProduct(r.id, e.target.value) }
                                style={{ width:"100%" }}
                              >
                                <option value="">— Produkt/Dienstleistung wählen —</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                              {base > 0 && <div style={{ fontSize:11, marginTop:4, opacity:0.7 }}>inkl. Grundpreis: {money(base, currency)}</div>}
                            </td>
                            <td>
                              <select
                                className="inp"
                                value={String(qty)}
                                onChange={(e)=>patchItem(r.id,{ quantity: toInt(e.target.value) })}
                              >
                                {Array.from({length:20}).map((_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
                              </select>
                            </td>
                            <td>
                              <input
                                className="inp"
                                type="text"
                                inputMode="decimal"
                                value={r.unitDisplay}
                                onChange={(e)=>onChangeUnitDisplay(r.id, e.target.value)}
                                onBlur={(e)=>onChangeUnitDisplay(r.id, fromCents(toCents(e.target.value)))}
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
        .card{ background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px }
        .ivx-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280 }
        .h5{ font-size:16px; font-weight:800 }
        .row-clickable{ cursor:pointer }
        .ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

        .hide-sm{ }
        @media (max-width: 760px){ .hide-sm{ display:none } }

        .card.table-card .table-wrap{ overflow-x:auto }
        .table{ width:100%; border-collapse:collapse; min-width:400px; background-color: var(--panel-2); }
        .table thead { background-color: transparent; }
        .table tbody { background-color: var(--panel); }
        .table th { background-color: transparent; border-bottom:1px solid var(--border); padding:10px; vertical-align:middle; text-align: left; }
        .table td { border-bottom:1px solid var(--border); padding:10px; vertical-align:middle; }
        .table-fixed{ table-layout:fixed }

        @media (max-width: 760px) {
          .table th, .table td { padding: 10px 8px; font-size: 13px; }
        }

        /* Zwingt die Detail-Zelle, die Elterntabelle NICHT aufzudehnen, sodass diese exakt ins Layout passt */
        .details-cell { background:var(--panel-2); max-width: 0; width: 100%; box-sizing: border-box; padding: 0 !important; }
        .details-content-wrapper { display: grid; padding: 10px; }
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
          background:var(--panel); border:1px solid var(--border); border-radius:14px;
          max-height: calc(100vh - 48px);
          overflow-y: auto; overflow-x: hidden;
        }
        .ivx-modal-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; background:var(--panel); z-index: 1;
        }
        .ivx-modal-actions{
          display:flex; justify-content:flex-end; gap:8px; padding: 12px 16px;
          position: sticky; bottom: 0; background:var(--panel); border-top: 1px solid var(--border);
        }

        .surface.section{ padding: 12px 16px; }

        /* Kopf-Formular bewusst *extra* schmal halten */
        .form-narrow{ max-width:560px; }
        .form-narrow--tight{ max-width: 520px; }     /* <— noch enger: verhindert, dass Notiz bis an den Rand geht */
        .row{ display:flex; flex-wrap:wrap; gap:12px; }
        .cell{ display:block; flex: 1 1 auto; }
        .w-no    { flex: 0 1 220px; max-width: 260px; }
        .w-date  { flex: 0 1 180px; max-width: 220px; }
        .w-money { flex: 0 1 200px; max-width: 240px; }
        .w-note  { flex: 1 1 100%; max-width: 520px; }  /* <— Notiz *fix* auf die schmale Spalte begrenzt */

        .lbl{ display:block; font-size:12px; color:#6b7280; margin-bottom:6px }
        .inp{ width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:12px; background:var(--panel); box-shadow:0 1px 1px rgba(0,0,0,.03) inset; }

        .positions .table-wrap{ overflow-x:auto }
        .positions .table{ min-width:720px }

        /* Scoped to page so we don't accidentally style Header/Nav buttons */
        main .btn{ padding:10px 12px; border-radius:12px; background:var(--color-primary,#0aa); color:#fff; border:1px solid transparent; cursor:pointer }
        main .btn-ghost{ padding:10px 12px; border-radius:12px; background:transparent; color:var(--color-primary,#0aa); border:1px solid var(--color-primary,#0aa); cursor:pointer }

        /* Fix Header buttons that get caught in global selectors */
        .hero .header-btn { background: var(--panel-2) !important; color: var(--text) !important; border: 1px solid var(--border) !important; }

        @media (max-width: 720px){
          .w-no{ max-width:220px } .w-date{ max-width:200px } .w-money{ max-width:220px } .w-note{ max-width:520px }
        }
      `}</style>
    </main>
  );
}
