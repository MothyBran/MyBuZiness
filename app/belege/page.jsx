"use client";
import { useEffect, useState } from "react";
import { LIST_API } from "@/lib/listApi";

function fmt(c, code="EUR"){
  return new Intl.NumberFormat("de-DE",{style:"currency",currency:code}).format((Number(c||0)/100));
}

export default function ReceiptsPage(){
  const [rows,setRows]=useState([]); 
  const [currency,setCurrency]=useState("EUR");
  const [expanded,setExpanded]=useState(null);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const [list, settings] = await Promise.all([
      LIST_API("/api/receipts"),
      fetch("/api/settings",{cache:"no-store"}).then(r=>r.json()).catch(()=>({data:{}}))
    ]);
    setRows(list);
    setCurrency(settings?.data?.currency || "EUR");
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  async function remove(id){
    if(!confirm("Diesen Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method:"DELETE" });
    const js = await res.json().catch(()=>({}));
    if(!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    if(expanded===id) setExpanded(null);
    load();
  }

  return (
    <main>
      <h1>Belege</h1>
      <div className="card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <thead>
              <tr>
                <th style={{width:"30%"}}>Nr.</th>
                <th className="hide-sm" style={{width:"30%"}}>Datum</th>
                <th style={{width:"40%"}}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>{
                const d=r.date? new Date(r.date):null;
                return (
                  <>
                    <tr key={r.id} className="row-clickable" onClick={()=>setExpanded(prev=>prev===r.id?null:r.id)}>
                      <td>{r.receiptNo}</td>
                      <td className="hide-sm">{d? d.toLocaleDateString():"—"}</td>
                      <td>{fmt(r.grossCents, currency)}</td>
                    </tr>
                    {expanded===r.id && (
                      <tr key={r.id+"-d"}>
                        <td colSpan={3} style={{background:"#fafafa",padding:12,borderBottom:"1px solid rgba(0,0,0,.06)"}}>
                          <ReceiptDetails row={r} currency={currency} />
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                            <button className="btn-ghost" onClick={(e)=>{ e.stopPropagation(); alert("Bearbeiten-Dialog – falls gewünscht, reiche ich dir die PUT-Route + Modal nach."); }}>⚙️ Bearbeiten</button>
                            <button className="btn-danger" onClick={(e)=>{ e.stopPropagation(); remove(r.id); }}>❌ Löschen</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {rows.length===0 && <tr><td colSpan={3} style={{textAlign:"center",color:"#999"}}>{loading?"Lade…":"Keine Belege vorhanden."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px}
        .table-wrap{overflow-x:auto}
        .table{width:100%;border-collapse:collapse}
        .table th,.table td{border-bottom:1px solid #eee;padding:10px;vertical-align:middle}
        .table-fixed{table-layout:fixed}
        .row-clickable{cursor:pointer}
        .ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .btn-ghost{padding:10px 12px;border-radius:8px;background:#fff;color:var(--color-primary,#0aa);border:1px solid var(--color-primary,#0aa);cursor:pointer}
        .btn-danger{padding:10px 12px;border-radius:8px;background:#fff;color:#c00;border:1px solid #c00;cursor:pointer}
        @media (max-width:760px){ .hide-sm{display:none} }
      `}</style>
    </main>
  );
}

function ReceiptDetails({ row, currency }){
  const items=row.items||[];
  const net = items.reduce((s,it)=> s + (Number(it.unitPriceCents||0)*Number(it.quantity||0) + Number(it.extraBaseCents||0)), 0);
  const tax = Number(row.vatExempt) ? 0 : Math.round(net * 0.19);
  const gross = net + tax - Number(row.discountCents||0);

  return (
    <div style={{display:"grid",gap:12}}>
      <div className="table-wrap">
        <table className="table table-fixed" style={{minWidth:720}}>
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
      <div style={{textAlign:"right"}}>Netto: <b>{fmt(net, currency)}</b> · Steuer: <b>{fmt(tax, currency)}</b> · Rabatt: <b>{fmt(row.discountCents||0, currency)}</b> · Brutto: <b>{fmt(gross, currency)}</b></div>
    </div>
  );
}
