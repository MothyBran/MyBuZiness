"use client";

import { useEffect, useMemo, useState } from "react";

/* ───────── Helpers ───────── */
const toInt = (v) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDEDate(input){
  const d = input ? new Date(input) : null;
  return d && !isNaN(d) ? d.toLocaleDateString("de-DE") : "—";
}

/** Belegnummer-Formatter: BN-jjmm-000 */
function formatReceiptNo(nextDigits, dateStr){
  const d = dateStr ? new Date(dateStr) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = pad2(d.getMonth()+1);
  const seq = String(Number(nextDigits || 1) % 1000).padStart(3, "0");
  return `BN-${yy}${mm}-${seq}`;
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

/* ───────── Seite ───────── */
export default function ReceiptsPage(){
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [currency, setCurrency] = useState("EUR");
  const [vatExemptDefault, setVatExemptDefault] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal-State
  const [isOpen, setIsOpen] = useState(false);
  const [editRow, setEditRow] = useState(null); // null = Neuer Beleg

  // Formularfelder im Modal
  const [receiptNo, setReceiptNo] = useState("");
  const [formDate, setFormDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("0");
  const [customerId, setCustomerId] = useState(""); // optional!
  const [items, setItems] = useState([makeEmptyItem()]);

  function makeEmptyItem(){ return { id: crypto?.randomUUID?.() || String(Math.random()), productId:"", name:"", quantity:1, unitPriceCents:0, baseCents:0, kind:"product" }; }

  useEffect(()=>{ load(); },[]);
  async function load(){
    setLoading(true);
    try{
      const [listRes, prodRes, custRes, setRes] = await Promise.all([
        safeGet("/api/receipts", { ok:true, data:[] }),
        safeGet("/api/products", { ok:true, data:[] }),
        safeGet("/api/customers", { ok:true, data:[] }),
        safeGet("/api/settings", { ok:true, data:{} }),
      ]);

      setRows(Array.isArray(listRes?.data) ? listRes.data : []);
      setProducts(
        Array.isArray(prodRes?.data)
          ? prodRes.data.map(p=>({
              id: p.id, name: p.name || "-",
              kind: p.kind || "product",
              priceCents: toInt(p.priceCents || 0),
              hourlyRateCents: toInt(p.hourlyRateCents || 0),
              travelBaseCents: toInt(p.travelBaseCents || 0),
              travelPerKmCents: toInt(p.travelPerKmCents || 0),
            }))
          : []
      );
      setCustomers(Array.isArray(custRes?.data) ? custRes.data : []);
      setCurrency(setRes?.data?.currency || "EUR");
      setVatExemptDefault(typeof setRes?.data?.kleinunternehmer === "boolean" ? setRes.data.kleinunternehmer : true);
    }finally{
      setLoading(false);
    }
  }

  function toggleExpand(id){ setExpandedId(prev => prev===id ? null : id); }

  async function openNew(){
    setEditRow(null);
    setFormDate(new Date().toISOString().slice(0,10));
    setDiscount("0");
    setCustomerId("");
    setItems([makeEmptyItem()]);
    // nächste Nummer holen & in BN-jjmm-000 umwandeln
    const js = await safeGet("/api/receipts/nextNo", { ok:true, nextNo:"1" });
    setReceiptNo(formatReceiptNo(js?.nextNo || "1", new Date().toISOString().slice(0,10)));
    setIsOpen(true);
  }

  function openEdit(row){
    setEditRow(row);
    setReceiptNo(row.receiptNo || "");
    setFormDate(row.date ? String(row.date).slice(0,10) : new Date().toISOString().slice(0,10));
    setDiscount("0");
    setCustomerId(String(row.customerId || "")); // optional – wird ggf. vom Backend ignoriert, falls Spalte fehlt
    const its = Array.isArray(row.items) ? row.items : [];
    setItems(
      its.length
        ? its.map(it=>({
            id: crypto?.randomUUID?.() || String(Math.random()),
            productId: it.productId || "",
            name: it.name || "",
            quantity: toInt(it.quantity || 1),
            unitPriceCents: toInt(it.unitPriceCents || 0),
            baseCents: 0,
            kind: "product",
          }))
        : [makeEmptyItem()]
    );
    setIsOpen(true);
  }

  function closeModal(){ setIsOpen(false); }

  // Wenn Datum im NEU-Modal geändert wird und die Nummer im BN-Format ist, Monat neu einsetzen
  useEffect(()=>{
    if(!isOpen || editRow) return;
    if(/^BN-\d{4}-\d{3}$/.test(receiptNo)){
      // seq behalten, nur Präfix updaten
      const seq = receiptNo.slice(-3);
      setReceiptNo(formatReceiptNo(seq, formDate));
    }
  },[formDate, isOpen, editRow]); // eslint-disable-line

  function patchItem(id, patch){
    setItems(prev => prev.map(r => r.id===id ? { ...r, ...patch } : r));
  }
  function onPickProduct(id, productId){
    const p = products.find(x=>String(x.id)===String(productId));
    if(!p){ patchItem(id, { productId:"", name:"", unitPriceCents:0, baseCents:0, kind:"product" }); return; }
    let unit=0, base=0, kind=p.kind||"product";
    if(kind==="service"){
      const hr = toInt(p.hourlyRateCents||0);
      const gp = toInt(p.priceCents||0);
      if(hr>0){ base = gp; unit = hr; } else { base = 0; unit = gp; }
    }else if(kind==="travel"){
      base = toInt(p.travelBaseCents||0);
      unit = toInt(p.travelPerKmCents||0);
    }else{
      base = 0; unit = toInt(p.priceCents||0);
    }
    patchItem(id, { productId:p.id, name:p.name, unitPriceCents:unit, baseCents:base, kind });
  }
  function addRow(){ setItems(prev => [...prev, makeEmptyItem()]); }
  function removeLastRow(){ setItems(prev => prev.length<=1 ? prev : prev.slice(0,-1)); }

  const totals = useMemo(()=>{
    const net = items.reduce((s,r)=> s + toInt(r.baseCents||0) + toInt(r.quantity||0)*toInt(r.unitPriceCents||0), 0);
    const discountCents = Math.max(0, Math.round(parseFloat(String(discount||"0").replace(",", ".")) * 100) || 0);
    const netAfter = Math.max(0, net - discountCents);
    const tax = vatExemptDefault ? 0 : Math.round(netAfter * 0.19);
    const gross = netAfter + tax;
    return { net, discountCents, netAfter, tax, gross };
  },[items, discount, vatExemptDefault]);

  async function saveReceipt(e){
    e?.preventDefault?.();
    // Clean Items
    const clean = items
      .map(it => ({
        productId: it.productId || null,
        name: (it.name||"").trim() || "Position",
        quantity: toInt(it.quantity||0),
        unitPriceCents: toInt(it.unitPriceCents||0),
      }))
      .filter(it => it.quantity>0);

    if(clean.length===0){ alert("Bitte mindestens eine Position anlegen."); return; }

    const payload = {
      receiptNo: (receiptNo||"").trim() || undefined, // wenn leer -> Backend generiert gemäß Settings
      date: formDate || null,
      discountCents: totals.discountCents,
      currency,
      vatExempt: !!vatExemptDefault,
      customerId: customerId || null, // optional – Backend darf ignorieren, wenn Spalte fehlt
      items: clean,
    };

    if(editRow){
      // Hinweis: Dein Backend hat aktuell GET/DELETE – wenn PUT/PATCH fehlt, Info anzeigen
      const res = await fetch(`/api/receipts/${editRow.id}`, {
        method: "PUT",
        headers: { "content-type":"application/json" },
        body: JSON.stringify(payload),
      }).catch(()=>null);
      if(!res || !res.ok){
        alert("Bearbeiten nicht möglich (PUT /api/receipts/[id] fehlt eventuell).");
        return;
      }
    }else{
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "content-type":"application/json" },
        body: JSON.stringify(payload),
      }).catch(()=>null);
      if(!res || !res.ok){ alert("Speichern fehlgeschlagen."); return; }
    }
    setIsOpen(false);
    await load();
  }

  async function deleteReceipt(id){
    if(!confirm("Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method:"DELETE" }).catch(()=>null);
    if(!res || !res.ok){ alert("Löschen fehlgeschlagen."); return; }
    if(expandedId===id) setExpandedId(null);
    await load();
  }

  return (
    <main className="ivx-page">
      {/* Kopf */}
      <div className="card">
        <div className="ivx-head">
          <h1 className="page-title" style={{ margin:0 }}>Belege</h1>
          <button className="btn" onClick={openNew}>+ Neuer Beleg</button>
        </div>
      </div>

      {/* Tabelle – NUR diese Card ist horizontal scrollbar */}
      <div className="card table-card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width:"40%" }} />
              <col style={{ width:"30%" }} />
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
                  <>
                    <tr key={r.id} className="row-clickable" onClick={()=>toggleExpand(r.id)}>
                      <td className="ellipsis">#{r.receiptNo || "—"}</td>
                      <td>{fmtDEDate(r.date)}</td>
                      <td style={{ textAlign:"right", fontWeight:700 }}>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpen && (
                      <tr key={r.id+"-detail"}>
                        <td colSpan={3} className="details-cell">
                          <div className="detail-head">
                            <div>
                              <div className="muted">Beleg</div>
                              <div className="h5">#{r.receiptNo || "—"}</div>
                              {r.customerName && <div className="muted">Kunde: <strong>{r.customerName}</strong></div>}
                            </div>
                            <div className="actions">
                              <button className="btn-ghost" onClick={(e)=>{ e.stopPropagation(); openEdit(r); }}>✏️ Bearbeiten</button>
                              <button className="btn-ghost danger" onClick={(e)=>{ e.stopPropagation(); deleteReceipt(r.id); }}>❌ Löschen</button>
                            </div>
                          </div>

                          {/* Positionsliste */}
                          <div className="table-wrap positions">
                            <table className="table table-fixed" style={{ minWidth: 720 }}>
                              <thead>
                                <tr>
                                  <th style={{ width:"50%" }}>Bezeichnung</th>
                                  <th style={{ width:"10%" }}>Menge</th>
                                  <th style={{ width:"20%" }}>Einzelpreis</th>
                                  <th style={{ width:"20%" }}>Summe</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(!r.items || r.items.length===0) && (
                                  <tr><td colSpan={4} className="muted">Keine Positionen.</td></tr>
                                )}
                                {Array.isArray(r.items) && r.items.map((it,idx)=>{
                                  const qty = toInt(it.quantity||0);
                                  const unit= toInt(it.unitPriceCents||0);
                                  const line= toInt(it.lineTotalCents || (qty*unit));
                                  return (
                                    <tr key={idx}>
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

                          <div className="totals">
                            Netto: {money(r.netCents, r.currency || currency)} · USt: {money(r.taxCents, r.currency || currency)} · Gesamt: {money(r.grossCents, r.currency || currency)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Neu / Bearbeiten */}
      {isOpen && (
        <div
          role="dialog" aria-modal="true"
          className="ivx-modal"
          onClick={(e)=>{ if(e.target===e.currentTarget) closeModal(); }}
        >
          <div className="ivx-modal-box" onClick={(e)=>e.stopPropagation()}>
            <div className="ivx-modal-head">
              <h2>{editRow ? "Beleg bearbeiten" : "Neuer Beleg"}</h2>
              <button className="btn-ghost" onClick={closeModal}>Schließen</button>
            </div>

            {/* Kopf-Felder – 2 Reihen à 2 Felder + Kunde (optional) */}
            <div className="surface section">
              <div className="head-rows">
                <div className="row">
                  <div className="cell w-no">
                    <label className="lbl">Beleg-Nr.</label>
                    <input type="text" value={receiptNo} onChange={(e)=>setReceiptNo(e.target.value)} className="inp" />
                  </div>
                  <div className="cell w-date">
                    <label className="lbl">Datum</label>
                    <input type="date" value={formDate} onChange={(e)=>setFormDate(e.target.value)} className="inp" />
                  </div>
                </div>
                <div className="row">
                  <div className="cell w-money">
                    <label className="lbl">Rabatt gesamt (€, optional)</label>
                    <input type="text" inputMode="decimal" placeholder="0,00" value={discount} onChange={(e)=>setDiscount(e.target.value)} className="inp" />
                  </div>
                  <div className="cell w-date">
                    <label className="lbl">Kunde (optional)</label>
                    <select className="inp" value={customerId} onChange={(e)=>setCustomerId(e.target.value)}>
                      <option value="">— wählen —</option>
                      {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Positionen – nur diese Card darf horizontal scrollen */}
            <div className="surface section positions">
              <div className="table-wrap">
                <table className="table table-fixed">
                  <thead>
                    <tr>
                      <th style={{ width:"50%" }}>Produkt/Dienstleistung</th>
                      <th style={{ width:"16%" }}>Menge</th>
                      <th style={{ width:"17%" }}>Einzelpreis</th>
                      <th style={{ width:"17%" }}>Summe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r)=>{
                      const sum = toInt(r.baseCents||0) + toInt(r.quantity||0)*toInt(r.unitPriceCents||0);
                      return (
                        <tr key={r.id}>
                          <td>
                            <select value={r.productId} onChange={(e)=>onPickProduct(r.id, e.target.value)} className="inp" style={{ width:"100%" }}>
                              <option value="">— Produkt wählen —</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select
                              value={String(r.quantity ?? 1)}
                              onChange={(e)=>patchItem(r.id, { quantity: toInt(e.target.value) })}
                              className="inp"
                            >
                              {Array.from({length:20}).map((_,i)=>{
                                const v = i+1;
                                return <option key={v} value={v}>{v}</option>;
                              })}
                            </select>
                          </td>
                          <td style={{ textAlign:"right", fontWeight:600 }}>{money(r.unitPriceCents, currency)}</td>
                          <td style={{ textAlign:"right", fontWeight:700 }}>{money(sum, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button className="btn-ghost" onClick={addRow}>+ Position</button>
                <button className="btn-ghost" onClick={removeLastRow} disabled={items.length<=1}>– Entfernen</button>
              </div>
            </div>

            {/* Summen */}
            <div className="surface section">
              <div className="totals-grid">
                <div />
                <div className="totals-box">
                  <div>Zwischensumme: <strong>{money(totals.net, currency)}</strong></div>
                  <div>Rabatt: <strong>- {money(totals.discountCents, currency)}</strong></div>
                  <div>Netto: <strong>{money(totals.netAfter, currency)}</strong></div>
                  <div>USt {vatExemptDefault ? "(befreit §19)" : "19%"}: <strong>{money(totals.tax, currency)}</strong></div>
                  <div style={{ fontSize:18, fontWeight:800, marginTop:6 }}>
                    Gesamt: {money(totals.gross, currency)}
                  </div>
                </div>
              </div>
            </div>

            <div className="ivx-modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Abbrechen</button>
              <button className="btn" onClick={saveReceipt}>{editRow ? "Speichern" : "Anlegen"}</button>
            </div>
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

        .table{ width:100%; border-collapse:collapse; min-width: 560px }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }

        .card.table-card .table-wrap{ overflow-x:auto }
        .details-cell{ background:#fafafa }
        .detail-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px }
        .actions{ display:flex; gap:8px; flex-wrap:wrap }
        .actions .danger{ color:#c00; border-color:#c00 }

        .totals{ text-align:right; padding:6px 8px 10px; font-weight:800 }

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
          overflow-y: auto;           /* vertikal scrollen */
          overflow-x: hidden;         /* kein horizontales Scrolling fürs Fenster */
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

        /* Kopf-Felder: wie im Rechnungsmodul – kompakt & ohne Überlappungen */
        .head-rows{ display:flex; flex-direction:column; gap:10px; }
        .row{ display:flex; flex-wrap:wrap; gap:12px; }
        .cell{ display:block; flex: 1 1 auto; }
        .lbl{ display:block; font-size:12px; color:#6b7280; margin-bottom:6px }
        .inp{ width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:12px; background:#fff; box-shadow:0 1px 1px rgba(0,0,0,.03) inset; }

        /* feste Max-Breiten (überlappen nicht, wrappen sauber) */
        .w-no    { flex: 0 1 220px; max-width: 260px; }
        .w-date  { flex: 0 1 180px; max-width: 220px; }
        .w-money { flex: 0 1 200px; max-width: 240px; }

        /* Positions-Card: H-Scroll nur hier */
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
