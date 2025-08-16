"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { toCents, fromCents } from "@/lib/money";

export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(q ? `/api/invoices?q=${encodeURIComponent(q)}` : "/api/invoices", { cache: "no-store" });
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>Rechnungen</h1>
        <div style={{ display:"flex", gap:8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Kunde)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neue Rechnung</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Nr.</th>
                <th style={th}>Datum</th>
                <th style={th}>Kunde</th>
                <th style={th}>Betrag (Brutto)</th>
                <th style={{ ...th, textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.invoiceNo}</td>
                  <td style={td}>{new Date(r.issueDate).toLocaleDateString()}</td>
                  <td style={td}>{r.customerName}</td>
                  <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/rechnungen/${r.id}`} style={btnGhost}>Details</Link>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Rechnungen."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewInvoiceModal open={openNew} onClose={()=>setOpenNew(false)} onSaved={()=>{ setOpenNew(false); load(); }} />
    </main>
  );
}

function NewInvoiceModal({ open, onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(19);
  const [vatExempt, setVatExempt] = useState(false);

  const [items, setItems] = useState([
    { id: crypto.randomUUID(), name:"", quantity:1, unitPrice:"" }
  ]);

  useEffect(() => {
    (async () => {
      const st = await fetch("/api/settings", { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:null}));
      const cs = await fetch("/api/customers", { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:[]}));
      const s = st.data || {};
      setSettings(s);
      setTaxRate(Number(s.taxRateDefault ?? 19));
      setVatExempt(!!s.kleinunternehmer);
      setCustomers(cs.data || []);
    })();
  }, []);

  const currency = settings?.currencyDefault || "EUR";
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const tax = vatExempt ? 0 : Math.round(itemsTotal * (Number(taxRate || 0) / 100));
  const gross = itemsTotal + tax;

  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function addRow(){ setItems([...items, { id: crypto.randomUUID(), name:"", quantity:1, unitPrice:"" }]); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  async function submit(e){
    e.preventDefault();
    if(!customerId) return alert("Bitte einen Kunden wählen.");
    if(items.length === 0) return alert("Bitte mindestens eine Position hinzufügen.");
    if(items.some(r => !r.name?.trim())) return alert("Jede Position braucht einen Namen.");
    const payload = {
      customerId, issueDate, dueDate: dueDate || null,
      currency, taxRate: vatExempt ? 0 : Number(taxRate || 0),
      items: items.map(it => ({
        productId: null,
        name: it.name,
        description: null,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      }))
    };
    const res = await fetch("/api/invoices", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(()=>({}));
    if(!json?.ok) return alert(json?.error || "Erstellen fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Neue Rechnung erstellen" maxWidth={860}>
      <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
          <label style={label}><span>Kunde *</span>
            <select value={customerId} onChange={e=>setCustomerId(e.target.value)} style={input} required>
              <option value="">– wählen –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={label}><span>Datum</span>
            <input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} style={input}/>
          </label>
          <label style={label}><span>Fällig bis</span>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={input}/>
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

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={{ ...label, alignItems:"center", gridTemplateColumns:"auto 1fr", display:"grid" }}>
            <input type="checkbox" checked={vatExempt} onChange={e=>setVatExempt(e.target.checked)} />
            <span>§19 UStG (Kleinunternehmer, ohne USt)</span>
          </label>
          <label style={label}><span>Steuersatz (%)</span>
            <input value={vatExempt ? 0 : taxRate} onChange={e=>setTaxRate(e.target.value)} style={input} inputMode="decimal" disabled={vatExempt}/>
          </label>
        </div>

        <div style={{ textAlign:"right", fontWeight:700 }}>
          Netto: {fromCents(itemsTotal, currency)} &nbsp;·&nbsp; Steuer: {fromCents(vatExempt?0:Math.round(itemsTotal*(Number(taxRate||0)/100)), currency)} &nbsp;·&nbsp; Brutto: {fromCents(itemsTotal+(vatExempt?0:Math.round(itemsTotal*(Number(taxRate||0)/100))), currency)}
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
