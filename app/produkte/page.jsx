"use client";

import { useEffect, useMemo, useState } from "react";

/* =========================
   Utils & Styles
   ========================= */
function toCents(v) {
  if (v === null || v === undefined) return 0;
  const str = String(v).replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(str);
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}
function currency(cents, code = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: code }).format((cents || 0) / 100);
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
const btnDanger = { padding: "8px 10px", borderRadius: 8, background: "#fff", color: "#c00", border: "1px solid #c00", cursor: "pointer" };
const card = { background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16 };
const modalWrap = { position: "fixed", left: "50%", top: "8%", transform: "translateX(-50%)", width: "min(900px,94vw)", maxHeight: "84vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 16, zIndex: 1000, boxShadow: "0 10px 40px rgba(0,0,0,.15)" };

/* =========================
   Seite: Rechnungen
   ========================= */
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [expandedId, setExpandedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    const [listRes, prodRes, custRes] = await Promise.all([
      fetch("/api/invoices", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
    ]);

    const list = await listRes.json().catch(() => ({ data: [] }));
    const pr = await prodRes.json().catch(() => ({ data: [] }));
    const cs = await custRes.json().catch(() => ({ data: [] }));

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

  async function createInvoice(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const itemsRaw = JSON.parse(fd.get("items") || "[]");
    if (!itemsRaw.length) return alert("Mindestens eine Position erforderlich.");
    if (!fd.get("customerId")) return alert("Bitte einen Kunden wählen.");

    const payload = {
      invoiceNo: fd.get("invoiceNo") || null,
      issueDate: fd.get("issueDate"),
      customerId: fd.get("customerId"),
      discountCents: toCents(fd.get("discount") || 0),
      currency: currencyCode,
      items: itemsRaw.map(it => ({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity || 0),
        unitPriceCents: toCents(it.unitPrice || 0),
      })),
    };

    const res = await fetch("/api/invoices", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Erstellen fehlgeschlagen.");
    setShowNew(false);
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
                      <td>{currency(r.grossCents ?? r.totalCents, r.currency || currencyCode)}</td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={4} style={{ background:"#fafafa", padding:12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                          <InvoiceDetails row={r} currencyCode={r.currency || currencyCode} />
                          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
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
          onSubmit={createInvoice}
        />
      )}
    </main>
  );
}

/* ========= Details-Bereich (aufklappbar) ========= */
function InvoiceDetails({ row, currencyCode }) {
  const items = row.items || [];
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
                  <td>{currency(it.unitPriceCents, currencyCode)}</td>
                  <td>{currency(sum, currencyCode)}</td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={4} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign:"right", fontWeight:800 }}>
        Gesamt: {currency(row.grossCents ?? row.totalCents, currencyCode)}
      </div>
    </div>
  );
}

/* ========= Modal: Neue Rechnung ========= */
function NewInvoiceSheet({ currencyCode, products, customers, onClose, onSubmit }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0,10));
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");

  const [localProducts, setLocalProducts] = useState(Array.isArray(products)? products : []);
  useEffect(() => {
    let ignore = false;
    async function ensureProducts() {
      if (Array.isArray(products) && products.length > 0) { setLocalProducts(products); return; }
      const res = await fetch("/api/products", { cache: "no-store" });
      const js = await res.json().catch(()=>({ data:[] }));
      const mapped = (js.data||[]).map(p => ({
        id: p.id, name: p.name,
        priceCents: Number.isFinite(p.priceCents) ? p.priceCents : 0,
        currency: p.currency || "EUR",
      }));
      if (!ignore) setLocalProducts(mapped);
    }
    ensureProducts();
    return ()=>{ ignore = true; };
  }, [products]);

  const [items, setItems] = useState([
    { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"" }
  ]);

  const itemsTotal = useMemo(
    () => items.reduce((s,it)=> s + toCents(it.unitPrice||0)*Number(it.quantity||0), 0),
    [items]
  );
  // (Wenn du §19 UStG berücksichtigst, könntest du hier Tax rechnen – aktuell nur Brutto = Netto - Rabatt)
  const gross = Math.max(0, itemsTotal - toCents(discount||0));

  function addRow(){ setItems(prev => [...prev, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(prev => prev.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function removeRow(id){ setItems(prev => prev.filter(r => r.id !== id)); }
  function onPickProduct(rowId, productId) {
    const p = localProducts.find(x => x.id === productId);
    if (!p) return updateRow(rowId, { productId:"", name:"", unitPrice:"" });
    updateRow(rowId, { productId, name: p.name, unitPrice: String((p.priceCents/100).toFixed(2)).replace(".", ",") });
  }

  return (
    <div className="surface" style={modalWrap} onClick={(e)=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>Neue Rechnung erstellen</b>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>

      <form
        onSubmit={(e)=>{ 
          const hidden = document.querySelector("#new-invoice-items");
          hidden.value = JSON.stringify(items.map(({id, ...rest})=>rest));
          onSubmit(e);
        }}
        style={{ display:"grid", gap:12 }}
      >
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
          <Field label="Nr."><input style={input} name="invoiceNo" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} /></Field>
          <Field label="Datum"><input type="date" style={input} name="issueDate" value={issueDate} onChange={e=>setIssueDate(e.target.value)} /></Field>
          <Field label="Kunde *">
            <select style={input} name="customerId" value={customerId} onChange={e=>setCustomerId(e.target.value)} required>
              <option value="">– wählen –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th style={{ width:120 }}>Menge</th>
                <th style={{ width:160 }}>Einzelpreis</th>
                <th style={{ width:160 }}>Summe</th>
                <th style={{ width:120, textAlign:"right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {localProducts.length===0 && (
                <tr><td colSpan={5} style={{ textAlign:"center", color:"#777" }}>Keine Produkte vorhanden. Bitte unter <a href="/produkte">/produkte</a> anlegen.</td></tr>
              )}
              {items.map(r => {
                const qty = Number(r.quantity||0);
                const upCents = toCents(r.unitPrice||0);
                const line = qty * upCents;
                return (
                  <tr key={r.id}>
                    <td>
                      <select value={r.productId} onChange={e=>onPickProduct(r.id, e.target.value)} style={input}>
                        <option value="">– auswählen –</option>
                        {localProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td><input value={r.quantity} onChange={e=>updateRow(r.id,{ quantity: parseInt(e.target.value||"1",10) })} style={input} inputMode="numeric" /></td>
                    <td>{currency(upCents, currencyCode)}</td>
                    <td>{currency(line, currencyCode)}</td>
                    <td style={{ textAlign:"right" }}><button type="button" onClick={()=>removeRow(r.id)} style={btnDanger}>Entfernen</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop:8 }}><button type="button" onClick={addRow} style={btnGhost}>+ Position</button></div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <Field label="Rabatt gesamt"><input name="discount" value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" placeholder="z. B. 10,00" /></Field>
          <div style={{ fontWeight:800 }}>Gesamt: {currency(gross, currencyCode)}</div>
        </div>

        <input type="hidden" id="new-invoice-items" name="items" />

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </div>
  );
}
