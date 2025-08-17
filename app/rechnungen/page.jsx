"use client";

import { useEffect, useMemo, useState } from "react";

/* =========================
   Utils & kleine UI-Helfer
   ========================= */
function toCents(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return Math.round(input * 100);

  let s = String(input).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    s = s.replace(new RegExp("\\" + thouSep, "g"), "");
    s = s.replace(decSep, ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function fmt(cents, code = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: code }).format((Number(cents || 0) / 100));
}
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      {children}
    </label>
  );
}
const input = { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, width: "100%" };
const btnPrimary = { padding: "10px 12px", borderRadius: 8, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer" };
const btnGhost = { padding: "10px 12px", borderRadius: 8, background: "#fff", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer" };
const btnDanger = { padding: "10px 12px", borderRadius: 8, background: "#fff", color: "#c00", border: "1px solid #c00", cursor: "pointer" };
const card = { background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16 };
const modalWrap = { position: "fixed", left: "50%", top: "8%", transform: "translateX(-50%)", width: "min(980px,96vw)", maxHeight: "86vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 16, zIndex: 1000, boxShadow: "0 10px 40px rgba(0,0,0,.15)" };

/* =========================
   Seite: Rechnungen
   ========================= */
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [expandedId, setExpandedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function load() {
    setLoading(true);
    const [listRes, prodRes, custRes] = await Promise.all([
      fetch("/api/invoices", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
    ]);
    const list = await listRes.json().catch(()=>({ data: [] }));
    const pr = await prodRes.json().catch(()=>({ data: [] }));
    const cs = await custRes.json().catch(()=>({ data: [] }));

    setRows(list.data || []);
    const mappedProducts = (pr.data || []).map(p => ({
      id: p.id,
      name: p.name,
      priceCents: Number.isFinite(p.priceCents) ? p.priceCents : 0,
      currency: p.currency || "EUR",
    }));
    setProducts(mappedProducts);
    setCustomers(cs.data || []);
    if (mappedProducts.length) setCurrencyCode(mappedProducts[0].currency);

    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) { setExpandedId(prev => prev === id ? null : id); }

  async function removeRow(id) {
    if (!confirm("Diese Rechnung wirklich löschen?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method:"DELETE" });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    if (expandedId === id) setExpandedId(null);
    load();
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Rechnungen</h1>
        <button style={btnPrimary} onClick={()=>setShowNew(true)}>+ Neue Rechnung</button>
      </div>

      <div style={{ ...card, marginTop:12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{whiteSpace:"nowrap"}}>Nr.</th>
                <th style={{whiteSpace:"nowrap"}}>Kunde</th>
                <th className="hide-sm" style={{whiteSpace:"nowrap"}}>Datum</th>
                <th style={{whiteSpace:"nowrap"}}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const d = r.issueDate ? new Date(r.issueDate) : (r.date ? new Date(r.date) : null);
                return (
                  <>
                    <tr key={r.id} className="row-clickable" style={{ cursor:"pointer" }} onClick={()=>toggleExpand(r.id)}>
                      <td className="ellipsis">{r.invoiceNo}</td>
                      <td className="ellipsis">{r.customerName || r.customer?.name || "—"}</td>
                      <td className="hide-sm">{d ? d.toLocaleDateString() : "—"}</td>
                      <td>{fmt(r.grossCents ?? r.totalCents, r.currency || currencyCode)}</td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={4} style={{ background:"#fafafa", padding:12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                          <InvoiceDetails row={r} currencyCode={r.currency || currencyCode} />
                          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
                            <button className="btn-ghost" onClick={(e)=>{ e.stopPropagation(); setEditRow(r); }}>⚙️ Bearbeiten</button>
                            <button className="btn-ghost" style={btnDanger} onClick={(e)=>{ e.stopPropagation(); removeRow(r.id); }}>❌ Löschen</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {rows.length===0 && (
                <tr><td colSpan={4} style={{ textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Rechnungen vorhanden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewInvoiceSheet
          currencyCode={currencyCode}
          products={products}
          customers={customers}
          onClose={()=>setShowNew(false)}
          onSaved={()=>{ setShowNew(false); load(); }}
        />
      )}
      {editRow && (
        <EditInvoiceSheet
          row={editRow}
          onClose={()=>setEditRow(null)}
          onSaved={()=>{ setEditRow(null); load(); }}
        />
      )}
    </main>
  );
}

/* ========= Details (aufklappbar) ========= */
function InvoiceDetails({ row, currencyCode }) {
  const items = row.items || [];
  const net = items.reduce((s, it) => s + Number(it.unitPriceCents||0) * Number(it.quantity||0), 0);
  const taxRate = Number(row.taxRate || 0);
  const tax = Math.round(net * (taxRate / 100));
  const gross = net + tax;

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
        <Field label="Rechnungs-Nr."><div>{row.invoiceNo}</div></Field>
        <Field label="Datum"><div>{row.issueDate ? new Date(row.issueDate).toLocaleDateString() : (row.date ? new Date(row.date).toLocaleDateString() : "—")}</div></Field>
        <Field label="Kunde"><div>{row.customerName || row.customer?.name || "—"}</div></Field>
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
              const sum = Number(it.quantity||0) * Number(it.unitPriceCents||0);
              return (
                <tr key={idx}>
                  <td className="ellipsis">{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{fmt(it.unitPriceCents, currencyCode)}</td>
                  <td>{fmt(sum, currencyCode)}</td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={4} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign:"right", fontWeight:800 }}>
        Netto: {fmt(net, currencyCode)} · Steuer: {fmt(tax, currencyCode)} · Gesamt: {fmt(gross, currencyCode)}
      </div>
    </div>
  );
}

/* ========= Modal: Neue Rechnung ========= */
function NewInvoiceSheet({ currencyCode, products, customers, onClose, onSaved }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [taxRate, setTaxRate] = useState(19);

  const [items, setItems] = useState([{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"" }]);

  const net = useMemo(()=> items.reduce((s,it)=> s + toCents(it.unitPrice||0)*Number(it.quantity||0), 0), [items]);
  const tax = Math.round(net * (Number(taxRate||0)/100));
  const gross = net + tax;

  function addRow(){ setItems(prev => [...prev, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(prev => prev.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function removeRowLocal(id){ setItems(prev => prev.filter(r => r.id !== id)); }
  function onPickProduct(rowId, productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return updateRow(rowId, { productId: "", name: "", unitPrice: "" });
    updateRow(rowId, { productId, name: p.name, unitPrice: (p.priceCents / 100).toFixed(2) });
  }

  async function save(e){
    e.preventDefault();
    if (!customerId) return alert("Bitte Kunde wählen.");
    const payload = {
      invoiceNo: invoiceNo || null,
      customerId,
      issueDate, dueDate: dueDate || null,
      currency: currencyCode,
      taxRate: Number(taxRate||0),
      items: items.map(it => ({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice||0),
      })),
    };
    const res = await fetch("/api/invoices", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <div className="surface" style={modalWrap} onClick={(e)=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>Neue Rechnung erstellen</b>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>

      <form onSubmit={save} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
          <Field label="Nr."><input style={input} value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} /></Field>
          <Field label="Rechnungsdatum"><input type="date" style={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)} /></Field>
          <Field label="Fällig am"><input type="date" style={input} value={dueDate} onChange={e=>setDueDate(e.target.value)} /></Field>
        </div>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"2fr 1fr" }}>
          <Field label="Kunde *">
            <CustomerPicker value={customerId} onChange={setCustomerId} />
          </Field>
          <Field label="Steuersatz (%)">
            <input style={input} value={taxRate} onChange={e=>setTaxRate(e.target.value)} inputMode="decimal" />
          </Field>
        </div>

        <PositionsTable
          items={items}
          products={products}
          currencyCode={currencyCode}
          onPickProduct={onPickProduct}
          onQty={(id, v)=>updateRow(id,{ quantity: parseInt(v||"1",10) })}
          onRemove={removeRowLocal}
          onAdd={addRow}
        />

        <div style={{ display:"flex", justifyContent:"flex-end", gap:16 }}>
          <div>Netto: <b>{fmt(net, currencyCode)}</b></div>
          <div>Steuer: <b>{fmt(tax, currencyCode)}</b></div>
          <div>Brutto: <b>{fmt(gross, currencyCode)}</b></div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </div>
  );
}

/* ========= Modal: Rechnung bearbeiten ========= */
function EditInvoiceSheet({ row, onClose, onSaved }) {
  const currencyCode = row.currency || "EUR";
  const [invoiceNo, setInvoiceNo] = useState(row.invoiceNo || "");
  const [issueDate, setIssueDate] = useState(row.issueDate?.slice(0,10) || new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState(row.dueDate?.slice(0,10) || "");
  const [customerId, setCustomerId] = useState(row.customerId || "");
  const [taxRate, setTaxRate] = useState(row.taxRate ?? 19);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(()=>{ (async()=>{
    const cj = await fetch("/api/customers").then(r=>r.json()).catch(()=>({data:[]}));
    setCustomers(cj.data||[]);
    const pj = await fetch("/api/products").then(r=>r.json()).catch(()=>({data:[]}));
    setProducts((pj.data||[]).map(p=>({ id:p.id, name:p.name, priceCents:p.priceCents||0, currency:p.currency||"EUR" })));
  })(); },[]);

  const [items, setItems] = useState(
    (row.items||[]).map(it => ({
      id: it.id,
      productId: it.productId || "",
      name: it.name || "",
      quantity: Number(it.quantity || 1),
      unitPrice: (Number(it.unitPriceCents||0)/100).toFixed(2),
    }))
  );

  const net = useMemo(()=> items.reduce((s,it)=> s + toCents(it.unitPrice||0)*Number(it.quantity||0), 0), [items]);
  const tax = Math.round(net * (Number(taxRate||0)/100));
  const gross = net + tax;

  function addRow(){ setItems(prev=>[...prev, { id: crypto.randomUUID(), productId:"", name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(prev=>prev.map(r => r.id===id? {...r, ...patch} : r)); }
  function removeRowLocal(id){ setItems(prev => prev.filter(r => r.id !== id)); }
  function onPickProduct(rowId, productId) {
    const p = products.find(x=>x.id===productId);
    if (!p) return updateRow(rowId, { productId:"", name:"", unitPrice:"" });
    updateRow(rowId, { productId, name:p.name, unitPrice:(p.priceCents/100).toFixed(2) });
  }

  async function save(e){
    e.preventDefault();
    if (!customerId) return alert("Bitte Kunde wählen.");
    const payload = {
      invoiceNo: invoiceNo || null,
      customerId,
      issueDate, dueDate: dueDate || null,
      currency: currencyCode,
      taxRate: Number(taxRate||0),
      items: items.map(it=>({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice||0),
      })),
    };
    const res = await fetch(`/api/invoices/${row.id}`, { method:"PUT", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <div className="surface" style={modalWrap} onClick={(e)=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>Rechnung bearbeiten</b>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>

      <form onSubmit={save} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
          <Field label="Nr."><input style={input} value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} /></Field>
          <Field label="Rechnungsdatum"><input type="date" style={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)} /></Field>
          <Field label="Fällig am"><input type="date" style={input} value={dueDate} onChange={e=>setDueDate(e.target.value)} /></Field>
        </div>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"2fr 1fr" }}>
          <Field label="Kunde *">
            <CustomerPicker value={customerId} onChange={setCustomerId} />
          </Field>
          <Field label="Steuersatz (%)">
            <input style={input} value={taxRate} onChange={e=>setTaxRate(e.target.value)} inputMode="decimal" />
          </Field>
        </div>

        <PositionsTable
          items={items}
          products={products}
          currencyCode={currencyCode}
          onPickProduct={onPickProduct}
          onQty={(id, v)=>updateRow(id,{ quantity: parseInt(v||"1",10) })}
          onRemove={removeRowLocal}
          onAdd={addRow}
        />

        <div style={{ display:"flex", justifyContent:"flex-end", gap:16 }}>
          <div>Netto: <b>{fmt(net, currencyCode)}</b></div>
          <div>Steuer: <b>{fmt(tax, currencyCode)}</b></div>
          <div>Brutto: <b>{fmt(gross, currencyCode)}</b></div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </div>
  );
}

/* ========= Wiederverwendbare Komponenten ========= */
function PositionsTable({ items, products, currencyCode, onPickProduct, onQty, onRemove, onAdd }) {
  return (
    <div className="table-wrap" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
      <table className="table pos-table" style={{ minWidth: 700 }}>
        <thead>
          <tr>
            <th>Produkt</th>
            <th style={{ width:96 }}>Menge</th>
            <th style={{ width:160 }}>Einzelpreis</th>
            <th style={{ width:160 }}>Summe</th>
            <th style={{ width:120, textAlign:"right" }}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {products.length===0 && (
            <tr><td colSpan={5} style={{ textAlign:"center", color:"#777" }}>Keine Produkte vorhanden. Lege zuerst Produkte unter <a href="/produkte">/produkte</a> an.</td></tr>
          )}
          {items.map(r=>{
            const qty = Number(r.quantity||0);
            const upCents = toCents(r.unitPrice || 0);
            const line = qty * upCents;
            return (
              <tr key={r.id}>
                <td>
                  <select value={r.productId} onChange={e=>onPickProduct(r.id, e.target.value)} style={{ ...input, minWidth: 220 }}>
                    <option value="">– auswählen –</option>
                    {products.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td><input value={r.quantity} onChange={e=>onQty(r.id, e.target.value)} style={input} inputMode="numeric" /></td>
                <td>{fmt(upCents, currencyCode)}</td>
                <td>{fmt(line, currencyCode)}</td>
                <td style={{ textAlign:"right" }}><button type="button" onClick={()=>onRemove(r.id)} style={btnDanger}>Entfernen</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop:8 }}><button type="button" onClick={onAdd} style={btnGhost}>+ Position</button></div>
    </div>
  );
}
function CustomerPicker({ value, onChange }) {
  const [opts, setOpts] = useState([]);
  useEffect(()=>{ (async()=>{
    const js = await fetch("/api/customers", { cache:"no-store" }).then(r=>r.json()).catch(()=>({data:[]}));
    setOpts(js.data || []);
  })(); },[]);
  return (
    <select style={input} value={value} onChange={e=>onChange(e.target.value)} required>
      <option value="">– wählen –</option>
      {opts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}
