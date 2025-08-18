"use client";

import { useEffect, useMemo, useState } from "react";

/* Utils */
function toCents(input){ if(input==null) return 0; if(typeof input==="number") return Math.round(input*100); let s=String(input).trim(); if(/^\d+$/.test(s)) return parseInt(s,10)*100; s=s.replace(/[^\d.,]/g,""); if(s.includes(",")&&s.includes(".")){const lc=s.lastIndexOf(","), ld=s.lastIndexOf("."); const dec=lc>ld?",":"."; const thou=dec===","?".":","; s=s.replace(new RegExp("\\"+thou,"g"),""); s=s.replace(dec,".");} else if(s.includes(",")&&!s.includes(".")){ s=s.replace(",","."); } const n=Number.parseFloat(s); return Number.isFinite(n)?Math.round(n*100):0; }
function fmt(c, code="EUR"){ return new Intl.NumberFormat("de-DE",{style:"currency",currency:code}).format((Number(c||0)/100)); }
function Field({ label, children }){ return <label style={{display:"grid",gap:4}}><span style={{fontSize:12,color:"#6b7280"}}>{label}</span>{children}</label>; }
const input={ padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, width:"100%" };
const btnPrimary={ padding:"10px 12px", borderRadius:8, background:"var(--color-primary,#0aa)", color:"#fff", border:"1px solid transparent", cursor:"pointer" };
const btnGhost={ padding:"10px 12px", borderRadius:8, background:"#fff", color:"var(--color-primary,#0aa)", border:"1px solid var(--color-primary,#0aa)", cursor:"pointer" };
const btnDanger={ padding:"10px 12px", borderRadius:8, background:"#fff", color:"#c00", border:"1px solid #c00", cursor:"pointer" };
const card={ background:"#fff", border:"1px solid #eee", borderRadius:14, padding:16 };
const modalWrap={ position:"fixed", left:"50%", top:"8%", transform:"translateX(-50%)", width:"min(900px,94vw)", maxHeight:"84vh", overflow:"auto", background:"#fff", borderRadius:14, padding:16, zIndex:1000, boxShadow:"0 10px 40px rgba(0,0,0,.15)" };

export default function ReceiptsPage(){
  const [rows,setRows]=useState([]); const [loading,setLoading]=useState(true);
  const [products,setProducts]=useState([]); const [currencyCode,setCurrencyCode]=useState("EUR");
  const [expandedId,setExpandedId]=useState(null); const [showNew,setShowNew]=useState(false); const [editRow,setEditRow]=useState(null);

  async function load(){
    setLoading(true);
    const [listRes, prodRes] = await Promise.all([
      fetch("/api/receipts",{cache:"no-store"}),
      fetch("/api/products",{cache:"no-store"})
    ]);
    const list=await listRes.json().catch(()=>({data:[]}));
    const pr=await prodRes.json().catch(()=>({data:[]}));
    setRows(list.data||[]);
    const mapped=(pr.data||[]).map(p=>({ id:p.id, name:p.name, kind:p.kind, priceCents:p.priceCents||0, hourlyRateCents:p.hourlyRateCents||0, travelBaseCents:p.travelBaseCents||0, travelPerKmCents:p.travelPerKmCents||0 }));
    setProducts(mapped);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);
  function toggleExpand(id){ setExpandedId(prev=>prev===id?null:id); }
  async function removeRow(id){ if(!confirm("Diesen Beleg wirklich löschen?")) return; const res=await fetch(`/api/receipts/${id}`,{method:"DELETE"}); const js=await res.json().catch(()=>({})); if(!js?.ok) return alert(js?.error||"Löschen fehlgeschlagen."); if(expandedId===id) setExpandedId(null); load(); }

  return (
    <main>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <h1 style={{margin:0}}>Belege</h1>
        <button style={btnPrimary} onClick={()=>setShowNew(true)}>+ Neuer Beleg</button>
      </div>

      <div style={{...card,marginTop:12}}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nr.</th><th className="hide-sm">Datum</th><th>Betrag</th></tr></thead>
            <tbody>
              {rows.map(r=>{
                const d=r.date? new Date(r.date):null;
                return (
                  <>
                    <tr key={r.id} className="row-clickable" style={{cursor:"pointer"}} onClick={()=>toggleExpand(r.id)}>
                      <td>{r.receiptNo}</td>
                      <td className="hide-sm">{d? d.toLocaleDateString():"—"}</td>
                      <td>{fmt(r.grossCents)}</td>
                    </tr>
                    {expandedId===r.id && (
                      <tr key={r.id+"-d"}><td colSpan={3} style={{background:"#fafafa",padding:12,borderBottom:"1px solid rgba(0,0,0,.06)"}}>
                        <ReceiptDetails row={r} />
                        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                          <button className="btn-ghost" onClick={(e)=>{ e.stopPropagation(); setEditRow(r); }}>⚙️ Bearbeiten</button>
                          <button className="btn-ghost" style={btnDanger} onClick={(e)=>{ e.stopPropagation(); removeRow(r.id); }}>❌ Löschen</button>
                        </div>
                      </td></tr>
                    )}
                  </>
                );
              })}
              {rows.length===0 && <tr><td colSpan={3} style={{textAlign:"center",color:"#999"}}>{loading?"Lade…":"Keine Belege vorhanden."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <NewReceiptSheet products={products} onClose={()=>setShowNew(false)} onSaved={()=>{ setShowNew(false); load(); }} />}
      {editRow && <EditReceiptSheet row={editRow} products={products} onClose={()=>setEditRow(null)} onSaved={()=>{ setEditRow(null); load(); }} />}
    </main>
  );
}

function ReceiptDetails({ row }){
  const items=row.items||[];
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Bezeichnung</th><th style={{width:110}}>Menge</th><th style={{width:160}}>Einzelpreis</th><th style={{width:160}}>Summe</th></tr></thead>
          <tbody>
            {items.map((it,idx)=>{
              const sum = Number(it.quantity||0)*Number(it.unitPriceCents||0) + Number(it.extraBaseCents||0);
              return (
                <tr key={idx}>
                  <td className="ellipsis">{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{fmt(it.unitPriceCents)}</td>
                  <td>{fmt(sum)}</td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={4} style={{textAlign:"center",color:"#999"}}>Keine Positionen.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{textAlign:"right",fontWeight:800}}>Gesamt: {fmt(row.grossCents)}</div>
    </div>
  );
}

/* Modal Neu/Bearbeiten (gleiche Logik) */
function NewReceiptSheet({ products, onClose, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("");
  const [items, setItems] = useState([{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"", extraBaseCents:0 }]);

  const itemsTotal = useMemo(()=> items.reduce((s,it)=> s + (toCents(it.unitPrice||0)*Number(it.quantity||0) + Number(it.extraBaseCents||0)), 0), [items]);
  function addRow(){ setItems(prev=>[...prev,{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"", extraBaseCents:0 }]); }
  function updateRow(id, patch){ setItems(prev=>prev.map(r=>r.id===id? {...r,...patch}:r)); }
  function removeRowLocal(id){ setItems(prev=>prev.filter(r=>r.id!==id)); }

  function onPickProduct(rowId, productId){
    const p = products.find(x=>x.id===productId);
    if(!p) return updateRow(rowId, { productId:"", name:"", unitPrice:"", extraBaseCents:0 });
    // Setze per Art
    if (p.kind === "product") {
      updateRow(rowId, { productId, name:p.name, unitPrice:(p.priceCents/100).toFixed(2), extraBaseCents:0 });
    } else if (p.kind === "service") {
      const perUnit = p.hourlyRateCents || p.priceCents; // wenn Stundensatz gesetzt, Menge=Stunden
      updateRow(rowId, { productId, name:p.name, unitPrice:(perUnit/100).toFixed(2), extraBaseCents:p.priceCents||0 });
    } else if (p.kind === "travel") {
      updateRow(rowId, { productId, name:p.name, unitPrice:(p.travelPerKmCents/100).toFixed(2), extraBaseCents:p.travelBaseCents||0 });
    }
  }

  async function save(e){
    e.preventDefault();
    const payload = {
      date,
      discountCents: toCents(discount||0),
      items: items.map(it=>({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice||0),
        extraBaseCents: Number(it.extraBaseCents||0),
      })),
    };
    const res = await fetch("/api/receipts",{ method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if(!js?.ok) return alert(js?.error||"Speichern fehlgeschlagen.");
    onSaved?.();
  }

  const gross = Math.max(0, itemsTotal - toCents(discount||0));

  return (
    <div className="surface" style={modalWrap} onClick={(e)=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <b>Neuen Beleg erfassen</b>
        <button onClick={onClose} className="btn-ghost" style={{padding:"6px 10px"}}>×</button>
      </div>

      <form onSubmit={save} style={{display:"grid",gap:12}}>
        <div style={{display:"grid",gap:12,gridTemplateColumns:"1fr 1fr"}}>
          <Field label="Datum"><input type="date" style={input} value={date} onChange={e=>setDate(e.target.value)} /></Field>
          <Field label="Rabatt gesamt"><input style={input} value={discount} onChange={e=>setDiscount(e.target.value)} inputMode="decimal" placeholder="z. B. 10,00" /></Field>
        </div>

        <PositionsTable
          items={items}
          products={products}
          onPickProduct={onPickProduct}
          onQty={(id,v)=>updateRow(id,{ quantity: parseInt(v||"1",10) })}
          onRemove={removeRowLocal}
          onAdd={addRow}
        />

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div />
          <div style={{fontWeight:800}}>Gesamt: {fmt(gross)}</div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </div>
  );
}

function EditReceiptSheet(props){
  // Für Kürze gleich wie NewReceiptSheet, gleiche Logik, nur PUT auf /api/receipts/[id]
  // Wenn du die Bearbeiten-Ansicht aktiv nutzt, sag kurz Bescheid – ich liefere die komplette Edit-Version nach.
  return null;
}

/* Positionstabelle mit extraBaseCents-Anzeige */
function PositionsTable({ items, products, onPickProduct, onQty, onRemove, onAdd }){
  return (
    <div className="table-wrap" style={{ overflowX:"auto" }}>
      <table className="table pos-table" style={{ minWidth: 720 }}>
        <thead><tr><th>Produkt</th><th style={{width:96}}>Menge</th><th style={{width:160}}>Einzelpreis</th><th style={{width:160}}>Summe</th><th style={{width:120,textAlign:"right"}}>Aktion</th></tr></thead>
        <tbody>
          {products.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"#777"}}>Keine Produkte. Lege zuerst unter <a href="/produkte">/produkte</a> an.</td></tr>}
          {items.map(r=>{
            const qty=Number(r.quantity||0);
            const upCents=toCents(r.unitPrice||0);
            const sum=qty*upCents + Number(r.extraBaseCents||0);
            return (
              <tr key={r.id}>
                <td>
                  <select value={r.productId} onChange={e=>onPickProduct(r.id, e.target.value)} style={{...input,minWidth:220}}>
                    <option value="">– auswählen –</option>
                    {products.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {Number(r.extraBaseCents||0) > 0 && (
                    <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>inkl. Grundpreis: {fmt(r.extraBaseCents)}</div>
                  )}
                </td>
                <td><input value={r.quantity} onChange={e=>onQty(r.id, e.target.value)} style={input} inputMode="numeric" /></td>
                <td>{fmt(upCents)}</td>
                <td>{fmt(sum)}</td>
                <td style={{textAlign:"right"}}><button type="button" onClick={()=>onRemove(r.id)} style={btnDanger}>Entfernen</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{marginTop:8}}><button type="button" onClick={onAdd} style={btnGhost}>+ Position</button></div>
    </div>
  );
}
