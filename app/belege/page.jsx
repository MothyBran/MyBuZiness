"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { toCents, fromCents } from "@/lib/money";

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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>Belege</h1>
        <div style={{ display:"flex", gap:8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Notiz)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Beleg</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Beleg-Nr.</th>
                <th style={th}>Datum</th>
                <th style={th}>USt</th>
                <th style={th}>Betrag</th>
                <th style={{ ...th, textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.receiptNo}</td>
                  <td style={td}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={td}>{Number(r.taxCents||0) > 0 ? "mit USt" : "§19 (ohne USt)"}</td>
                  <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/belege/${r.id}`} style={btnGhost}>Details</Link>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Belege."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewReceiptModal open={openNew} onClose={()=>setOpenNew(false)} onSaved={()=>{ setOpenNew(false); load(); }} />
    </main>
  );
}

function NewReceiptModal({ open, onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("");
  const [items, setItems] = useState([
    { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: "" }
  ]);

  useEffect(() => {
    (async () => {
      const js = await fetch("/api/settings", { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:null}));
      setSettings(js.data || {});
    })();
  }, []);

  const currency = settings?.currencyDefault || "EUR";
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal - discountCents);

  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function addRow(){ setItems([...items, { id: crypto.randomUUID(), name:"", quantity:1, unitPrice:"" }]); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  async function submit(e){
    e.preventDefault();
    if(items.length === 0) return alert("Bitte mindestens eine Position hinzufügen.");
    if(items.some(r => !r.name?.trim())) return alert("Jede Position braucht einen Namen.");
    const payload = {
      date,
      currency,
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
          <label style={label}><span>Datum</span>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={input}/>
          </label>
          <label style={label}><span>Währung</span>
            <input value={currency} disabled style={input}/>
          </label>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Bezeichnung</th>
                <th style={th}>Menge</th>
                <th style={th}>Einzelpreis</th>
                <th style={th}>Summe</th>
                <th style={{ ...th, textAlign:"right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const qty = Number(r.quantity||0);
                const up = toCents(r.unitPrice || 0);
                const line = qty*up;
                return (
                  <tr key={r.id}>
                    <td style={td}><input value={r.name} onChange={e=>updateRow(r.id,{name:e.target.value})} style={input} placeholder="Position"/></td>
                    <td style={td}><input value={r.quantity} onChange={e=>updateRow(r.id,{quantity:parseInt(e.target.value||"1",10)})} style={input} inputMode="numeric"/></td>
                    <td style={td}><input value={r.unitPrice} onChange={e=>updateRow(r.id,{unitPrice:e.target.value})} style={input} inputMode="decimal"/></td>
                    <td style={td}>{fromCents(line, currency)}</td>
                    <td style={{ ...td, textAlign:"right" }}><button type="button" onClick={()=>removeRow(r.id)} style={btnDanger}>Entfernen</button></td>
                  </tr>
                );
              })}
              {items.length===0 && <tr><td colSpan={5} style={{ ...td, textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"space-between" }}>
          <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <label style={{ display:"grid", gap:6 }}>
              <span>Rabatt (gesamt)</span>
              <input value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" />
            </label>
            <div style={{ fontWeight:700 }}>Gesamt: {fromCents(gross, currency)}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none" };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
