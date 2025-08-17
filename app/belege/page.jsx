"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";

/* kleine Helper lokal, um keine Fremd-Imports zu brauchen */
function toCents(input) {
  if (input === null || input === undefined) return 0;
  const s = String(input).replace(/\./g, "").replace(/,/g, ".");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
function currency(cents, cur = "EUR") {
  const n = (Number(cents || 0) / 100);
  return new Intl.NumberFormat("de-DE", { style:"currency", currency: cur }).format(n);
}

export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(q ? `/api/receipts?q=${encodeURIComponent(q)}` : "/api/receipts", { cache: "no-store" });
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Belege</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Notiz)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Beleg</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Beleg-Nr.</th>
                <th className="hide-sm">Datum</th>
                <th className="hide-sm">USt</th>
                <th>Betrag</th>
                <th style={{ textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.receiptNo}</td>
                  <td className="hide-sm">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="hide-sm">{Number(r.taxCents||0) > 0 ? "mit USt" : "§19 (ohne USt)"}</td>
                  <td>{currency(r.grossCents, r.currency)}</td>
                  <td style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/belege/${r.id}`} className="btn-ghost">Details</Link>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Belege."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewReceiptModal
        open={openNew}
        onClose={()=>setOpenNew(false)}
        onSaved={()=>{ setOpenNew(false); load(); }}
      />
    </main>
  );
}

function NewReceiptModal({ open, onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("");
  const [items, setItems] = useState([
    { id: typeof crypto!=="undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), name: "", quantity: 1, unitPrice: "" }
  ]);

  useEffect(() => {
    (async () => {
      const js = await fetch("/api/settings", { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:null}));
      setSettings(js.data || {});
    })();
  }, []);

  const currencyCode = settings?.currencyDefault || "EUR";
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal - discountCents);

  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function addRow(){ setItems([...items, { id: typeof crypto!=="undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), name:"", quantity:1, unitPrice:"" }]); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  async function submit(e){
    e.preventDefault();
    if(items.length === 0) return alert("Bitte mindestens eine Position hinzufügen.");
    if(items.some(r => !r.name?.trim())) return alert("Jede Position braucht einen Namen.");
    const payload = {
      date,
      currency: currencyCode,
      vatExempt: true,
      discountCents,
      items: items.map(it => ({
        productId: null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      }))
    };
    const res = await fetch("/api/receipts", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(()=>({}));
    if(!json?.ok) return alert(json?.error || "Erstellen fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuen Beleg erfassen" maxWidth={860}>
      <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <div style={fieldStyle}><span style={fieldLabel}>Datum</span>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={input}/>
          </div>
          <div style={fieldStyle}><span style={fieldLabel}>Währung</span>
            <input value={currencyCode} disabled style={input}/>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bezeichnung</th>
                <th style={{ width:110 }}>Menge</th>
                <th style={{ width:160 }}>Einzelpreis</th>
                <th style={{ width:160 }}>Summe</th>
                <th style={{ textAlign:"right", width:110 }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const qty = Number(r.quantity||0);
                const up = toCents(r.unitPrice || 0);
                const line = qty*up;
                return (
                  <tr key={r.id}>
                    <td><input value={r.name} onChange={e=>updateRow(r.id,{name:e.target.value})} style={input} placeholder="Position"/></td>
                    <td><input value={r.quantity} onChange={e=>updateRow(r.id,{quantity:parseInt(e.target.value||"1",10)})} style={input} inputMode="numeric"/></td>
                    <td><input value={r.unitPrice} onChange={e=>updateRow(r.id,{unitPrice:e.target.value})} style={input} inputMode="decimal"/></td>
                    <td>{currency(line, currencyCode)}</td>
                    <td style={{ textAlign:"right" }}><button type="button" onClick={()=>removeRow(r.id)} style={btnDanger}>Entfernen</button></td>
                  </tr>
                );
              })}
              {items.length===0 && <tr><td colSpan={5} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
          <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <div style={fieldStyle}><span style={fieldLabel}>Rabatt (gesamt)</span>
              <input value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" />
            </div>
            <div style={{ fontWeight:700, minWidth:220, textAlign:"right" }}>Gesamt: {currency(gross, currencyCode)}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

/* Styles */
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none", width:"100%" };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"#fff", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
const fieldStyle = { display:"grid", gap:6 };
const fieldLabel = { fontSize:12, color:"#666" };
