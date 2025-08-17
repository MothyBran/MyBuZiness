"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";

/* lokale Helpers */
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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Rechnungen</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Kunde)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neue Rechnung</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Kunde</th>
                <th className="hide-sm">Datum</th>
                <th>Brutto</th>
                <th style={{ textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.invoiceNo}</td>
                  <td className="ellipsis">{r.customerName}</td>
                  <td className="hide-sm">{new Date(r.issueDate).toLocaleDateString()}</td>
                  <td>{currency(r.grossCents, r.currency)}</td>
                  <td style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/rechnungen/${r.id}`} className="btn-ghost">Details</Link>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Rechnungen."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewInvoiceModal
        open={openNew}
        onClose={()=>setOpenNew(false)}
        onSaved={()=>{ setOpenNew(false); load(); }}
      />
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
    { id: typeof crypto!=="undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), name:"", quantity:1, unitPrice:"" }
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

  const currencyCode = settings?.currencyDefault || "EUR";
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const tax = vatExempt ? 0 : Math.round(itemsTotal * (Number(taxRate || 0) / 100));
  const gross = itemsTotal + tax;

  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function addRow(){ setItems([...items, { id: typeof crypto!=="undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), name:"", quantity:1, unitPrice:"" }]); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  async function submit(e){
    e.preventDefault();
    if(!customerId) return alert("Bitte einen Kunden wählen.");
    if(items.length === 0) return alert("Bitte mindestens eine Position hinzufügen.");
    if(items.some(r => !r.name?.trim())) return alert("Jede Position braucht einen Namen.");
    const payload = {
      customerId,
      issueDate,
      dueDate: dueDate || null,
      currency: currencyCode,
      taxRate: vatExempt ? 0 : Number(taxRate || 0),
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
          <div style={fieldStyle}><span style={fieldLabel}>Kunde *</span>
            <select value={customerId} onChange={e=>setCustomerId(e.target.value)} style={input} required>
              <option value="">– wählen –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={fieldStyle}><span style={fieldLabel}>Datum</span>
            <input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} style={input}/>
          </div>
          <div style={fieldStyle}><span style={fieldLabel}>Fällig bis</span>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={input}/>
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

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={{ display:"grid", gridTemplateColumns:"auto 1fr", alignItems:"center", gap:10 }}>
            <input type="checkbox" checked={vatExempt} onChange={e=>setVatExempt(e.target.checked)} />
            <span>§19 UStG (Kleinunternehmer, ohne USt)</span>
          </label>
          <div style={fieldStyle}><span style={fieldLabel}>Steuersatz (%)</span>
            <input value={vatExempt ? 0 : taxRate} onChange={e=>setTaxRate(e.target.value)} style={input} inputMode="decimal" disabled={vatExempt}/>
          </div>
        </div>

        <div style={{ textAlign:"right", fontWeight:700 }}>
          Netto: {currency(itemsTotal, currencyCode)} &nbsp;·&nbsp;
          Steuer: {currency(vatExempt?0:Math.round(itemsTotal*(Number(taxRate||0)/100)), currencyCode)} &nbsp;·&nbsp;
          Brutto: {currency(gross, currencyCode)}
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
          <button type="button" onClick={()=>addRow()} style={btnGhost}>+ Position</button>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
            <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
            <button type="submit" style={btnPrimary}>Speichern</button>
          </div>
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
