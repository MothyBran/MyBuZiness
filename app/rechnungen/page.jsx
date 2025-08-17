"use client";

import { useEffect, useMemo, useState } from "react";

/* ===== Helpers ===== */
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
function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
      {children}
    </div>
  );
}
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none", width:"100%" };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"#fff", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };

/* ===== Page ===== */
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [openNew, setOpenNew] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);

  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [customers, setCustomers] = useState([]);

  async function load() {
    setLoading(true);
    const [res, st, cs] = await Promise.all([
      fetch(q ? `/api/invoices?q=${encodeURIComponent(q)}` : "/api/invoices", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
    ]);
    const js = await res.json().catch(()=>({ data: [] }));
    const stj = await st.json().catch(()=>({ data:{ currencyDefault:"EUR" }}));
    const cst = await cs.json().catch(()=>({ data: [] }));
    setRows(js.data || []);
    setCurrencyCode(stj?.data?.currencyDefault || "EUR");
    setCustomers(cst.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) { setExpandedId(prev => prev === id ? null : id); setEditId(null); }

  async function removeInvoice(id) {
    if (!confirm("Diese Rechnung wirklich löschen?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method:"DELETE" });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    setExpandedId(null); setEditId(null); load();
  }

  async function saveInvoice(id, values) {
    const res = await fetch(`/api/invoices/${id}`, { method:"PUT", headers:{ "content-type":"application/json" }, body: JSON.stringify(values) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    setEditId(null); load();
  }

  async function createInvoice(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      customerId: fd.get("customerId"),
      issueDate: fd.get("issueDate"),
      dueDate: fd.get("dueDate") || null,
      currency: currencyCode,
      taxRate: Number(fd.get("vatExempt")==="on" ? 0 : (fd.get("taxRate")||19)),
      items: JSON.parse(fd.get("items") || "[]").map(it => ({
        productId: null,
        name: it.name,
        description: null,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      })),
    };
    if (!payload.customerId) return alert("Bitte einen Kunden wählen.");
    if (!payload.items.length) return alert("Mindestens eine Position erforderlich.");

    const res = await fetch("/api/invoices", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Erstellen fehlgeschlagen.");
    setOpenNew(false); load();
  }

  return (
    <main>
      {/* Kopf */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Rechnungen</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Kunde)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neue Rechnung</button>
        </div>
      </div>

      {/* Tabelle */}
      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Kunde</th>
                <th className="hide-sm">Datum</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const d = r.issueDate ? new Date(r.issueDate) : null;
                return (
                  <>
                    <tr
                      key={r.id}
                      className="row-clickable"
                      onClick={() => toggleExpand(r.id)}
                      style={{ cursor:"pointer" }}
                    >
                      <td className="ellipsis">{r.invoiceNo}</td>
                      <td className="ellipsis">{r.customerName || "—"}</td>
                      <td className="hide-sm">{d ? d.toLocaleDateString() : "—"}</td>
                      <td>{currency(r.grossCents, r.currency || currencyCode)}</td>
                    </tr>

                    {expandedId === r.id && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={4} style={{ background:"#fafafa", padding: 12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                          {editId === r.id ? (
                            <InvoiceEditForm
                              initial={r}
                              customers={customers}
                              currencyCode={r.currency || currencyCode}
                              onCancel={() => setEditId(null)}
                              onSave={(values) => saveInvoice(r.id, values)}
                            />
                          ) : (
                            <InvoiceDetails
                              row={r}
                              currencyCode={r.currency || currencyCode}
                              onEdit={() => setEditId(r.id)}
                              onDelete={() => removeInvoice(r.id)}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {rows.length===0 && (
                <tr><td colSpan={4} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Rechnungen vorhanden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini-Modal Neu */}
      {openNew && (
        <NewInvoiceSheet
          onClose={()=>setOpenNew(false)}
          onSubmit={createInvoice}
          customers={customers}
          currencyCode={currencyCode}
        />
      )}
    </main>
  );
}

/* ===== Details & Edit ===== */
function InvoiceDetails({ row, currencyCode, onEdit, onDelete }) {
  const items = row.items || [];
  const taxCents = Number(row.taxCents || 0);
  const net = Number(row.grossCents || 0) - taxCents;

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
        <Field label="Rechnungs-Nr."><div>{row.invoiceNo}</div></Field>
        <Field label="Datum"><div>{row.issueDate ? new Date(row.issueDate).toLocaleDateString() : "—"}</div></Field>
        <Field label="Fällig bis"><div>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}</div></Field>
        <Field label="Kunde"><div>{row.customerName || "—"}</div></Field>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th style={{ width:110 }}>Menge</th>
              <th style={{ width:160 }}>Einzelpreis</th>
              <th style={{ width:160 }}>Summe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const line = Number(it.quantity||0) * Number(it.unitPriceCents||0);
              return (
                <tr key={idx}>
                  <td className="ellipsis">{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{currency(it.unitPriceCents, currencyCode)}</td>
                  <td>{currency(line, currencyCode)}</td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={4} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign:"right" }}>
        Netto: <b>{currency(net, currencyCode)}</b> &nbsp;·&nbsp;
        Steuer: <b>{currency(taxCents, currencyCode)}</b> &nbsp;·&nbsp;
        Brutto: <b>{currency(row.grossCents, currencyCode)}</b>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <button className="btn-ghost" onClick={onEdit}>⚙️ Bearbeiten</button>
        <button className="btn-ghost" onClick={onDelete} style={{ borderColor:"#c00", color:"#c00" }}>❌ Löschen</button>
      </div>
    </div>
  );
}

function InvoiceEditForm({ initial, customers, currencyCode, onCancel, onSave }) {
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ? String(initial.issueDate).slice(0,10) : new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState(initial?.dueDate ? String(initial.dueDate).slice(0,10) : "");
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 19);
  const [vatExempt, setVatExempt] = useState(Number(initial?.taxRate||0) === 0);

  const [items, setItems] = useState(() => (initial?.items || []).map(x => ({
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()),
    name: x.name || "",
    quantity: Number(x.quantity||0),
    unitPrice: x.unitPriceCents ? (x.unitPriceCents/100).toString().replace(".",",") : "",
  })));

  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const tax = vatExempt ? 0 : Math.round(itemsTotal * (Number(taxRate||0)/100));
  const gross = itemsTotal + tax;

  function addRow(){ setItems([...items, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  function submit(e){
    e.preventDefault();
    if(!customerId) return alert("Bitte einen Kunden wählen.");
    if(items.length===0) return alert("Mindestens eine Position erforderlich.");
    if(items.some(r=>!r.name?.trim())) return alert("Jede Position braucht eine Bezeichnung.");
    onSave({
      customerId,
      issueDate,
      dueDate: dueDate || null,
      currency: currencyCode,
      taxRate: vatExempt ? 0 : Number(taxRate||0),
      items: items.map(it => ({
        productId: null,
        name: it.name,
        description: null,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      }))
    });
  }

  return (
    <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
        <Field label="Kunde *">
          <select value={customerId} onChange={e=>setCustomerId(e.target.value)} style={input} required>
            <option value="">– wählen –</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Datum">
          <input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} style={input}/>
        </Field>
        <Field label="Fällig bis">
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={input}/>
        </Field>
        <Field label="Währung"><input value={currencyCode} disabled style={input}/></Field>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th style={{ width:110 }}>Menge</th>
              <th style={{ width:160 }}>Einzelpreis</th>
              <th style={{ width:160 }}>Summe</th>
              <th style={{ width:110, textAlign:"right" }}>Aktion</th>
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
          <span>§19 UStG (ohne USt)</span>
        </label>
        <Field label="Steuersatz (%)">
          <input value={vatExempt ? 0 : taxRate} onChange={e=>setTaxRate(e.target.value)} style={input} inputMode="decimal" disabled={vatExempt}/>
        </Field>
      </div>

      <div style={{ textAlign:"right", fontWeight:700 }}>
        Netto: {currency(itemsTotal, currencyCode)} &nbsp;·&nbsp;
        Steuer: {currency(vatExempt?0:Math.round(itemsTotal*(Number(taxRate||0)/100)), currencyCode)} &nbsp;·&nbsp;
        Brutto: {currency(gross, currencyCode)}
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
        <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button type="button" onClick={onCancel} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </div>
    </form>
  );
}

/* ===== Mini-Modal Neu ===== */
function NewInvoiceSheet({ onClose, onSubmit, customers, currencyCode }) {
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [taxRate, setTaxRate] = useState(19);

  const [items, setItems] = useState([{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), name:"", quantity:1, unitPrice:"" }]);

  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const tax = vatExempt ? 0 : Math.round(itemsTotal * (Number(taxRate||0) / 100));
  const gross = itemsTotal + tax;

  function addRow(){ setItems([...items, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  return (
    <div className="surface" style={modalWrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800 }}>Neue Rechnung erstellen</div>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>
      <form onSubmit={(e)=>{ 
        const hidden = document.querySelector("#new-invoice-items");
        hidden.value = JSON.stringify(items.map(({id, ...rest})=>rest));
        onSubmit(e);
      }} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
          <Field label="Kunde *">
            <select value={customerId} onChange={e=>setCustomerId(e.target.value)} style={input} name="customerId" required>
              <option value="">– wählen –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Datum"><input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} style={input} name="issueDate"/></Field>
          <Field label="Fällig bis"><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={input} name="dueDate"/></Field>
          <Field label="Währung"><input value={currencyCode} disabled style={input}/></Field>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bezeichnung</th>
                <th style={{ width:110 }}>Menge</th>
                <th style={{ width:160 }}>Einzelpreis</th>
                <th style={{ width:160 }}>Summe</th>
                <th style={{ width:110, textAlign:"right" }}>Aktion</th>
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
            <input type="checkbox" checked={vatExempt} onChange={e=>setVatExempt(e.target.checked)} name="vatExempt" />
            <span>§19 UStG (ohne USt)</span>
          </label>
          <Field label="Steuersatz (%)">
            <input value={vatExempt ? 0 : taxRate} onChange={e=>setTaxRate(e.target.value)} style={input} inputMode="decimal" name="taxRate" disabled={vatExempt}/>
          </Field>
        </div>

        <div style={{ textAlign:"right", fontWeight:700 }}>
          Netto: {currency(itemsTotal, currencyCode)} &nbsp;·&nbsp;
          Steuer: {currency(vatExempt?0:Math.round(itemsTotal*(Number(taxRate||0)/100)), currencyCode)} &nbsp;·&nbsp;
          Brutto: {currency(gross, currencyCode)}
        </div>

        <input type="hidden" id="new-invoice-items" name="items" />
        <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
          <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
            <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
            <button type="submit" style={btnPrimary}>Speichern</button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* Sheet-Style */
const modalWrap = {
  position:"fixed", left:"50%", top:"8%", transform:"translateX(-50%)",
  width:"min(860px, 94vw)", maxHeight:"84vh", overflow:"auto", padding:16, zIndex:1000
};
