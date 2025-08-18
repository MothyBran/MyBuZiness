"use client";

import { useEffect, useMemo, useState } from "react";

/* ============== Utils ============== */
function toCents(input){
  if(input==null) return 0;
  if(typeof input==="number") return Math.round(input*100);
  let s=String(input).trim();
  if(/^\d+$/.test(s)) return parseInt(s,10)*100;
  s=s.replace(/[^\d.,]/g,"");
  if(s.includes(",")&&s.includes(".")){
    const lc=s.lastIndexOf(","), ld=s.lastIndexOf(".");
    const dec=lc>ld?",":"."; const thou=dec===","?".":",";
    s=s.replace(new RegExp("\\"+thou,"g"),"");
    s=s.replace(dec,".");
  } else if(s.includes(",")&&!s.includes(".")){
    s=s.replace(",",".");
  }
  const n=Number.parseFloat(s);
  return Number.isFinite(n)?Math.round(n*100):0;
}
function fromCents(c){
  const n = Number(c||0)/100;
  return n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmt(c, code="EUR"){
  return new Intl.NumberFormat("de-DE",{style:"currency",currency:code}).format((Number(c||0)/100));
}
function Field({ label, children }){
  return <label style={{display:"grid",gap:6}}>
    <span style={{fontSize:12,color:"#6b7280"}}>{label}</span>
    {children}
  </label>;
}

/* ============== Styles ============== */
const input      = { padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, width:"100%" };
const btn       = (bg="#fff", fg="#0aa", b=fg)=>({ padding:"10px 12px", borderRadius:8, background:bg, color:fg, border:`1px solid ${b}`, cursor:"pointer" });
const btnPrimary = btn("var(--color-primary,#0aa)","#fff","transparent");
const btnGhost   = btn("#fff","var(--color-primary,#0aa)","var(--color-primary,#0aa)");
const btnDanger  = btn("#fff","#c00","#c00");
const card       = { background:"#fff", border:"1px solid #eee", borderRadius:14, padding:16 };
const sheet      = { position:"fixed", left:"50%", top:"8%", transform:"translateX(-50%)", width:"min(980px,96vw)", maxHeight:"86vh", overflow:"auto", background:"#fff", borderRadius:14, padding:16, zIndex:1000, boxShadow:"0 10px 40px rgba(0,0,0,.15)" };

export default function InvoicesPage(){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [products,setProducts]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [settings,setSettings]=useState({ currency:"EUR", kleinunternehmer:false });
  const [expandedId,setExpandedId]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [editRow,setEditRow]=useState(null);

  async function load(){
    setLoading(true);
    const [listRes, prodRes, custRes, setRes] = await Promise.all([
      fetch("/api/invoices",{cache:"no-store"}),
      fetch("/api/products",{cache:"no-store"}),
      fetch("/api/customers",{cache:"no-store"}),
      fetch("/api/settings",{cache:"no-store"}),
    ]);
    const list = await listRes.json().catch(()=>({data:[]}));
    const pr   = await prodRes.json().catch(()=>({data:[]}));
    const cs   = await custRes.json().catch(()=>({data:[]}));
    const st   = await setRes.json().catch(()=>({data:{}}));
    setRows(list.data||[]);
    setProducts((pr.data||[]).map(p=>({
      id:p.id, name:p.name, kind:p.kind,
      priceCents:p.priceCents||0,
      hourlyRateCents:p.hourlyRateCents||0,
      travelBaseCents:p.travelBaseCents||0,
      travelPerKmCents:p.travelPerKmCents||0
    })));
    setCustomers(cs.data||[]);
    setSettings({ currency: st?.data?.currency || "EUR", kleinunternehmer: !!st?.data?.kleinunternehmer });
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  function toggleExpand(id){ setExpandedId(prev=>prev===id?null:id); }

  async function removeRow(id){
    if(!confirm("Diese Rechnung wirklich löschen?")) return;
    const res=await fetch(`/api/invoices/${id}`,{method:"DELETE"});
    const js=await res.json().catch(()=>({}));
    if(!js?.ok) return alert(js?.error||"Löschen fehlgeschlagen.");
    if(expandedId===id) setExpandedId(null);
    load();
  }

  return (
    <main>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <h1 style={{margin:0}}>Rechnungen</h1>
        <button style={btnPrimary} onClick={()=>setShowNew(true)}>+ Neue Rechnung</button>
      </div>

      <div style={{...card,marginTop:12}}>
        <div className="table-wrap">
          <table className="table table-fixed">
            <thead>
              <tr>
                <th style={{width:"20%"}}>Nr.</th>
                <th style={{width:"40%"}}>Kunde</th>
                <th className="hide-sm" style={{width:"20%"}}>Datum</th>
                <th style={{width:"20%"}}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>{
                const d = r.issueDate ? new Date(r.issueDate) : null;
                return (
                  <>
                    <tr key={r.id} className="row-clickable" onClick={()=>toggleExpand(r.id)}>
                      <td>{r.invoiceNo}</td>
                      <td className="ellipsis">{r.customerName||"—"}</td>
                      <td className="hide-sm">{d? d.toLocaleDateString():"—"}</td>
                      <td>{fmt(r.grossCents, settings.currency)}</td>
                    </tr>
                    {expandedId===r.id && (
                      <tr key={r.id+"-details"}>
                        <td colSpan={4} style={{background:"#fafafa",padding:12,borderBottom:"1px solid rgba(0,0,0,.06)"}}>
                          <InvoiceDetails row={r} currency={settings.currency} />
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                            <button style={btnGhost} onClick={(e)=>{ e.stopPropagation(); setEditRow(r); }}>⚙️ Bearbeiten</button>
                            <button style={btnDanger} onClick={(e)=>{ e.stopPropagation(); removeRow(r.id); }}>❌ Löschen</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {rows.length===0 && (
                <tr><td colSpan={4} style={{textAlign:"center",color:"#999"}}>{loading?"Lade…":"Keine Rechnungen vorhanden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <InvoiceEditor
          title="Neue Rechnung erstellen"
          products={products}
          customers={customers}
          currency={settings.currency}
          kleinunternehmer={settings.kleinunternehmer}
          initial={null}
          onClose={()=>setShowNew(false)}
          onSaved={()=>{ setShowNew(false); load(); }}
        />
      )}
      {!!editRow && (
        <InvoiceEditor
          title={`Rechnung ${editRow.invoiceNo} bearbeiten`}
          products={products}
          customers={customers}
          currency={settings.currency}
          kleinunternehmer={settings.kleinunternehmer}
          initial={editRow}
          onClose={()=>setEditRow(null)}
          onSaved={()=>{ setEditRow(null); load(); }}
        />
      )}

      <style jsx global>{`
        .table-wrap{overflow-x:auto}
        .table{width:100%; border-collapse:collapse}
        .table th,.table td{border-bottom:1px solid #eee; padding:10px; vertical-align:middle}
        .table-fixed{table-layout:fixed}
        .row-clickable{cursor:pointer}
        .ellipsis{white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
        @media (max-width: 760px){ .hide-sm{display:none} }
      `}</style>
    </main>
  );
}

function InvoiceDetails({ row, currency }){
  const items=row.items||[];
  const net = items.reduce((s,it)=> s + (Number(it.unitPriceCents||0)*Number(it.quantity||0) + Number(it.extraBaseCents||0)), 0);
  const tax = Math.round(net * (Number(row.taxRate||0)/100));
  const gross = net + tax;

  return (
    <div style={{display:"grid",gap:12}}>
      <div className="table-wrap">
        <table className="table table-fixed" style={{minWidth:760}}>
          <thead>
            <tr>
              <th style={{width:"45%"}}>Bezeichnung</th>
              <th style={{width:110}}>Menge</th>
              <th style={{width:170}}>Einzelpreis</th>
              <th style={{width:160}}>Summe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it,idx)=>{
              const sum = Number(it.quantity||0)*Number(it.unitPriceCents||0) + Number(it.extraBaseCents||0);
              return (
                <tr key={idx}>
                  <td className="ellipsis">{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{fmt(it.unitPriceCents, currency)}</td>
                  <td>{fmt(sum, currency)}</td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={4} style={{textAlign:"center",color:"#999"}}>Keine Positionen.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{textAlign:"right"}}>Netto: <b>{fmt(net, currency)}</b> · Steuer: <b>{fmt(tax, currency)}</b> · Brutto: <b>{fmt(gross, currency)}</b></div>
    </div>
  );
}

/* ===== Editor (Neu/Bearbeiten) ===== */
function InvoiceEditor({ title, products, customers, currency, kleinunternehmer, initial, onClose, onSaved }){
  const isEdit = !!initial;
  const [issueDate,setIssueDate]=useState( initial?.issueDate ? new Date(initial.issueDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10) );
  const [dueDate,setDueDate]=useState( initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0,10) : "" );
  const [customerId,setCustomerId]=useState( initial?.customerId || "" );
  const [taxRate,setTaxRate]=useState( initial ? Number(initial.taxRate||0) : (kleinunternehmer?0:19) );
  useEffect(()=>{ if(!isEdit && kleinunternehmer) setTaxRate(0); },[kleinunternehmer, isEdit]);

  const [items,setItems]=useState(
    initial
      ? (initial.items||[]).map(it=>({
          id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()),
          productId: it.productId || "",
          name: it.name || "",
          kind: "",
          quantity: Number(it.quantity||0),
          unitPrice: fromCents(it.unitPriceCents||0),
          extraBaseCents: Number(it.extraBaseCents||0)
        }))
      : [{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", kind:"", quantity:1, unitPrice:"", extraBaseCents:0 }]
  );

  const net = useMemo(()=> items.reduce((s,it)=> s + (toCents(it.unitPrice||0)*Number(it.quantity||0) + Number(it.extraBaseCents||0)), 0), [items]);
  const tax = Math.round(net * (Number(taxRate||0)/100));
  const gross = net + tax;

  function addRow(){ setItems(prev=>[...prev,{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", kind:"", quantity:1, unitPrice:"", extraBaseCents:0 }]); }
  function updRow(id,patch){ setItems(prev=>prev.map(r=>r.id===id? {...r,...patch}:r)); }
  function delRow(id){ setItems(prev=>prev.filter(r=>r.id!==id)); }

  function onPickProduct(rowId, productId){
    const p=products.find(x=>x.id===productId);
    if(!p) return updRow(rowId,{ productId:"", name:"", kind:"", unitPrice:"", extraBaseCents:0 });
    if(p.kind==="product"){
      updRow(rowId,{ productId, name:p.name, kind:p.kind, unitPrice:fromCents(p.priceCents), extraBaseCents:0 });
    } else if(p.kind==="service"){
      if(p.hourlyRateCents>0){
        updRow(rowId,{ productId, name:p.name, kind:p.kind, unitPrice:fromCents(p.hourlyRateCents), extraBaseCents:p.priceCents||0 });
      } else {
        updRow(rowId,{ productId, name:p.name, kind:p.kind, unitPrice:fromCents(p.priceCents), extraBaseCents:0 });
      }
    } else if(p.kind==="travel"){
      updRow(rowId,{ productId, name:p.name, kind:p.kind, unitPrice:fromCents(p.travelPerKmCents), extraBaseCents:p.travelBaseCents||0 });
    }
  }

  async function save(e){
    e.preventDefault();
    if(!customerId) return alert("Bitte Kunde wählen.");
    if(items.length===0) return alert("Mindestens eine Position ist erforderlich.");

    const payload = {
      customerId, issueDate, dueDate: dueDate || null, taxRate: Number(taxRate||0),
      items: items.map(it=>({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice||0),
        extraBaseCents: Number(it.extraBaseCents||0),
      })),
    };

    let url="/api/invoices", method="POST";
    if(isEdit){
      url = `/api/invoices/${initial.id}`;
      method = "PUT";
    }

    const res = await fetch(url,{ method, headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if(!js?.ok) return alert(js?.error||"Speichern fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <div className="surface" style={sheet} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <b>{title}</b>
        <button onClick={onClose} style={btnGhost}>×</button>
      </div>
      <form onSubmit={save} style={{display:"grid",gap:12}}>
        <div style={{display:"grid",gap:12,gridTemplateColumns:"1fr 1fr 1fr"}}>
          <Field label="Rechnungsdatum">
            <input type="date" style={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)} />
          </Field>
          <Field label="Fällig am">
            <input type="date" style={input} value={dueDate} onChange={e=>setDueDate(e.target.value)} />
          </Field>
          <Field label="Kunde *">
            <CustomerPicker value={customerId} onChange={setCustomerId} />
          </Field>
        </div>
        <div>
          <Field label="Steuersatz (%)">
            <input
              style={{...input, background: kleinunternehmer ? "#f9fafb" : "#fff"}}
              value={taxRate}
              onChange={e=>setTaxRate(e.target.value)}
              inputMode="decimal"
              disabled={kleinunternehmer}
              title={kleinunternehmer ? "§19 UStG aktiv – Steuersatz ist 0%" : "Steuersatz in %"}
            />
            {kleinunternehmer && (
              <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>
                Hinweis: Kleinunternehmer-Regelung (§19 UStG) aktiv – Umsatzsteuer = 0 %.
              </div>
            )}
          </Field>
        </div>

        <PositionsTable
          items={items}
          products={products}
          currency={currency}
          onPickProduct={onPickProduct}
          onQty={(id,v)=>updRow(id,{ quantity: Math.max(0, Number(v)) })}
          onChangeUnit={(id,v)=>updRow(id,{ unitPrice: v })}
          onRemove={delRow}
          onAdd={addRow}
        />

        <div style={{display:"flex",justifyContent:"flex-end",gap:16}}>
          <div>Netto: <b>{fmt(net, currency)}</b></div>
          <div>Steuer: <b>{fmt(tax, currency)}</b></div>
          <div>Brutto: <b>{fmt(gross, currency)}</b></div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </div>
  );
}

function CustomerPicker({ value, onChange }){
  const [opts,setOpts]=useState([]);
  useEffect(()=>{ (async()=>{
    const js=await fetch("/api/customers",{cache:"no-store"}).then(r=>r.json()).catch(()=>({data:[]}));
    setOpts(js.data||[]);
  })(); },[]);
  return (
    <select style={input} value={value} onChange={e=>onChange(e.target.value)} required>
      <option value="">– wählen –</option>
      {opts.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

function PositionsTable({ items, products, currency, onPickProduct, onQty, onChangeUnit, onRemove, onAdd }){
  return (
    <div className="table-wrap">
      <table className="table table-fixed" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{width:"48%"}}>Produkt</th>
            <th style={{width:110}}>Menge</th>
            <th style={{width:170}}>Einzelpreis</th>
            <th style={{width:150}}>Summe</th>
            <th style={{width:120,textAlign:"right"}}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r=>{
            const qty=Number(r.quantity||0);
            const upCents=toCents(r.unitPrice||0);
            const sum=qty*upCents + Number(r.extraBaseCents||0);
            return (
              <tr key={r.id}>
                <td>
                  <div style={{display:"grid",gap:6}}>
                    <select value={r.productId} onChange={e=>onPickProduct(r.id, e.target.value)} style={{...input, width:"100%"}}>
                      <option value="">– auswählen –</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.kind==="travel" ? "(Fahrtkosten)" : p.kind==="service" ? "(Dienstleistung)" : ""}
                        </option>
                      ))}
                    </select>
                    {Number(r.extraBaseCents||0) > 0 && (
                      <div style={{ fontSize:12, color:"#6b7280" }}>inkl. Grundpreis: {fmt(r.extraBaseCents, currency)}</div>
                    )}
                  </div>
                </td>
                <td>
                  <input type="number" min={0} step={1} value={r.quantity} onChange={e=>onQty(r.id, e.target.value)} style={input} />
                </td>
                <td>
                  {r.kind==="travel"
                    ? (<input inputMode="decimal" value={r.unitPrice} onChange={e=>onChangeUnit(r.id, e.target.value)} onBlur={e=>onChangeUnit(r.id, fromCents(toCents(e.target.value)))} style={input} />)
                    : (<div style={{padding:"10px 0"}}>{fmt(upCents, currency)}</div>)
                  }
                </td>
                <td>{fmt(sum, currency)}</td>
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
