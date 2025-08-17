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
      <span style={{ fontSize: 12, color: "#666", whiteSpace:"nowrap" }}>{label}</span>
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
export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [currencyCode, setCurrencyCode] = useState("EUR");

  const [products, setProducts] = useState([]);

  async function load() {
    setLoading(true);
    const [listRes, stRes, prRes] = await Promise.all([
      fetch(q ? `/api/receipts?q=${encodeURIComponent(q)}` : "/api/receipts", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
    ]);
    const js = await listRes.json().catch(() => ({ data: [] }));
    const st = await stRes.json().catch(() => ({ data: { currencyDefault: "EUR" } }));
    const pr = await prRes.json().catch(() => ({ data: [] }));
    setRows(js.data || []);
    setCurrencyCode(st?.data?.currencyDefault || "EUR");
    setProducts((pr.data || []).map(p => ({
      id: p.id, name: p.name, priceCents: p.unitPriceCents, currency: p.currency
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) { setExpandedId(prev => prev === id ? null : id); setEditId(null); }

  async function removeReceipt(id) {
    if (!confirm("Diesen Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method:"DELETE" });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    setExpandedId(null); setEditId(null); load();
  }

  async function saveReceipt(id, values) {
    const res = await fetch(`/api/receipts/${id}`, { method:"PUT", headers:{ "content-type":"application/json" }, body: JSON.stringify(values) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    setEditId(null); load();
  }

  async function createReceipt(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date");
    const discount = fd.get("discount");
    const itemsRaw = JSON.parse(fd.get("items") || "[]");
    if (!itemsRaw.length) return alert("Bitte mindestens eine Position hinzufügen.");

    const payload = {
      date,
      currency: currencyCode,
      vatExempt: true,
      discountCents: toCents(discount || 0),
      items: itemsRaw.map(it => ({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity || 0),
        unitPriceCents: toCents(it.unitPrice || 0)
      })),
    };
    const res = await fetch("/api/receipts", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Erstellen fehlgeschlagen.");
    setOpenNew(false); load();
  }

  return (
    <main>
      {/* Kopf */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Belege</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Notiz)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Beleg</button>
        </div>
      </div>

      {/* Tabelle */}
      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style="white-space:nowrap">Nr.</th>
                <th className="hide-sm" style={{whiteSpace:"nowrap"}}>Datum</th>
                <th style={{whiteSpace:"nowrap"}}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const date = r.date ? new Date(r.date) : null;
                return (
                  <>
                    <tr
                      key={r.id}
                      className="row-clickable"
                      onClick={() => toggleExpand(r.id)}
                      style={{ cursor:"pointer" }}
                    >
                      <td className="ellipsis">{r.receiptNo}</td>
                      <td className="hide-sm">{date ? date.toLocaleDateString() : "—"}</td>
                      <td>{currency(r.grossCents, r.currency || currencyCode)}</td>
                    </tr>

                    {expandedId === r.id && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={3} style={{ background:"#fafafa", padding: 12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                          {editId === r.id ? (
                            <ReceiptEditForm
                              initial={r}
                              currencyCode={r.currency || currencyCode}
                              products={products}
                              onCancel={() => setEditId(null)}
                              onSave={(values) => saveReceipt(r.id, values)}
                            />
                          ) : (
                            <ReceiptDetails
                              row={r}
                              currencyCode={r.currency || currencyCode}
                              onEdit={() => setEditId(r.id)}
                              onDelete={() => removeReceipt(r.id)}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {rows.length===0 && (
                <tr><td colSpan={3} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Belege vorhanden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini-Modal Neu */}
      {openNew && <NewReceiptSheet currencyCode={currencyCode} products={products} onClose={()=>setOpenNew(false)} onSubmit={createReceipt} />}
    </main>
  );
}

/* ===== Details & Edit ===== */
function ReceiptDetails({ row, currencyCode, onEdit, onDelete }) {
  const items = row.items || [];
  const discount = Number(row.discountCents || 0);
  const itemsTotal = items.reduce((s, it) => s + Number(it.unitPriceCents||0)*Number(it.quantity||0), 0);
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
        <Field label="Beleg-Nr."><div>{row.receiptNo}</div></Field>
        <Field label="Datum"><div>{row.date ? new Date(row.date).toLocaleDateString() : "—"}</div></Field>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{whiteSpace:"nowrap"}}>Bezeichnung</th>
              <th style={{ width:110, whiteSpace:"nowrap" }}>Menge</th>
              <th style={{ width:160, whiteSpace:"nowrap" }}>Einzelpreis</th>
              <th style={{ width:160, whiteSpace:"nowrap" }}>Summe</th>
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

      <div style={{ display:"grid", gap:8, gridTemplateColumns:"1fr auto", alignItems:"center" }}>
        <div style={{ color:"#6b7280" }}>
          Netto: {currency(itemsTotal, currencyCode)}
          {discount>0 && <> · Rabatt: {currency(discount, currencyCode)}</>}
        </div>
        <div style={{ fontWeight:800 }}>Gesamt: {currency(row.grossCents, currencyCode)}</div>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <button className="btn-ghost" onClick={onEdit}>⚙️ Bearbeiten</button>
        <button className="btn-ghost" onClick={onDelete} style={{ borderColor:"#c00", color:"#c00" }}>❌ Löschen</button>
      </div>
    </div>
  );
}

function ReceiptEditForm({ initial, currencyCode, products, onCancel, onSave }) {
  const [date, setDate] = useState(initial?.date ? String(initial.date).slice(0,10) : new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState(initial?.discountCents ? (initial.discountCents/100).toString().replace(".",",") : "");
  const [items, setItems] = useState(() => (initial?.items || []).map(x => ({
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()),
    productId: null, // wenn aus Dropdown gewählt
    name: x.name || "",
    quantity: Number(x.quantity||0),
    unitPrice: x.unitPriceCents ? (x.unitPriceCents/100).toString().replace(".",",") : "",
  })));

  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal - discountCents);

  function addRow(){ setItems([...items, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:null, name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }

  function onPickProduct(rowId, productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    updateRow(rowId, { productId, name: p.name, unitPrice: (p.priceCents/100).toString().replace(".", ",") });
  }

  function submit(e){
    e.preventDefault();
    if(items.length===0) return alert("Mindestens eine Position erforderlich.");
    if(items.some(r=>!r.name?.trim())) return alert("Jede Position braucht eine Bezeichnung.");
    onSave({
      date,
      currency: currencyCode,
      vatExempt: true,
      discountCents,
      items: items.map(it => ({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      }))
    });
  }

  return (
    <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr" }}>
        <Field label="Datum"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={input}/></Field>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{whiteSpace:"nowrap"}}>Produkt wählen</th>
              <th style={{whiteSpace:"nowrap"}}>Bezeichnung</th>
              <th style={{ width:110, whiteSpace:"nowrap" }}>Menge</th>
              <th style={{ width:160, whiteSpace:"nowrap" }}>Einzelpreis</th>
              <th style={{ width:160, whiteSpace:"nowrap" }}>Summe</th>
              <th style={{ width:110, textAlign:"right", whiteSpace:"nowrap" }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => {
              const qty = Number(r.quantity||0);
              const up = toCents(r.unitPrice || 0);
              const line = qty*up;
              return (
                <tr key={r.id}>
                  <td>
                    <select value={r.productId || ""} onChange={e=>onPickProduct(r.id, e.target.value)} style={input}>
                      <option value="">– auswählen –</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td><input value={r.name} onChange={e=>updateRow(r.id,{name:e.target.value})} style={input} placeholder="Bezeichnung"/></td>
                  <td><input value={r.quantity} onChange={e=>updateRow(r.id,{quantity:parseInt(e.target.value||"1",10)})} style={input} inputMode="numeric"/></td>
                  <td><input value={r.unitPrice} onChange={e=>updateRow(r.id,{unitPrice:e.target.value})} style={input} inputMode="decimal"/></td>
                  <td>{currency(line, currencyCode)}</td>
                  <td style={{ textAlign:"right" }}><button type="button" onClick={()=>removeRow(r.id)} style={btnDanger}>Entfernen</button></td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={6} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
        <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <Field label="Rabatt gesamt">
            <input value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" />
          </Field>
          <div style={{ fontWeight:700, minWidth:220, textAlign:"right" }}>Gesamt: {currency(gross, currencyCode)}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Abbrechen</button>
        <button type="submit" style={btnPrimary}>Speichern</button>
      </div>
    </form>
  );
}

/* ===== Mini Sheet for New ===== */
function NewReceiptSheet({ currencyCode, products, onClose, onSubmit }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("");
  const [items, setItems] = useState([{ id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:null, name:"", quantity:1, unitPrice:"" }]);

  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal - discountCents);

  function addRow(){ setItems([...items, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:null, name:"", quantity:1, unitPrice:"" }]); }
  function updateRow(id, patch){ setItems(items.map(r => r.id===id ? { ...r, ...patch } : r)); }
  function removeRow(id){ setItems(items.filter(r => r.id !== id)); }
  function onPickProduct(rowId, productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    updateRow(rowId, { productId, name: p.name, unitPrice: (p.priceCents/100).toString().replace(".", ",") });
  }

  return (
    <div className="surface" style={modalWrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800 }}>Neuen Beleg erfassen</div>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>
      <form onSubmit={(e)=>{ 
        const hidden = document.querySelector("#new-receipt-items");
        hidden.value = JSON.stringify(items.map(({id, ...rest})=>rest));
        onSubmit(e);
      }} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr" }}>
          <Field label="Datum"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={input} name="date" /></Field>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{whiteSpace:"nowrap"}}>Produkt wählen</th>
                <th style={{whiteSpace:"nowrap"}}>Bezeichnung</th>
                <th style={{ width:110, whiteSpace:"nowrap" }}>Menge</th>
                <th style={{ width:160, whiteSpace:"nowrap" }}>Einzelpreis</th>
                <th style={{ width:160, whiteSpace:"nowrap" }}>Summe</th>
                <th style={{ width:110, textAlign:"right", whiteSpace:"nowrap" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const qty = Number(r.quantity||0);
                const up = toCents(r.unitPrice || 0);
                const line = qty*up;
                return (
                  <tr key={r.id}>
                    <td>
                      <select value={r.productId || ""} onChange={e=>onPickProduct(r.id, e.target.value)} style={input}>
                        <option value="">– auswählen –</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><input value={r.name} onChange={e=>updateRow(r.id,{name:e.target.value})} style={input} placeholder="Bezeichnung"/></td>
                    <td><input value={r.quantity} onChange={e=>updateRow(r.id,{quantity:parseInt(e.target.value||"1",10)})} style={input} inputMode="numeric"/></td>
                    <td><input value={r.unitPrice} onChange={e=>updateRow(r.id,{unitPrice:e.target.value})} style={input} inputMode="decimal"/></td>
                    <td>{currency(line, currencyCode)}</td>
                    <td style={{ textAlign:"right" }}><button type="button" onClick={()=>removeRow(r.id)} style={btnDanger}>Entfernen</button></td>
                  </tr>
                );
              })}
              {items.length===0 && <tr><td colSpan={6} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
          <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <Field label="Rabatt gesamt">
              <input name="discount" value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" />
            </Field>
            <div style={{ fontWeight:700, minWidth:220, textAlign:"right" }}>Gesamt: {currency(gross, currencyCode)}</div>
          </div>
        </div>

        <input type="hidden" id="new-receipt-items" name="items" />
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
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
