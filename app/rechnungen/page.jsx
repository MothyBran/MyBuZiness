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
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);

  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ kleinunternehmer: true, defaultVat: 19 });

  async function load() {
    setLoading(true);
    const [res, st, cs, pr] = await Promise.all([
      fetch(q ? `/api/invoices?q=${encodeURIComponent(q)}` : "/api/invoices", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
    ]);
    const js = await res.json().catch(()=>({ data: [] }));
    const stj = await st.json().catch(()=>({ data:{ currencyDefault:"EUR", kleinunternehmer:true, defaultVat:19 }}));
    const cst = await cs.json().catch(()=>({ data: [] }));
    const prj = await pr.json().catch(()=>({ data: [] }));

    const stData = stj?.data || {};
    setRows(js.data || []);
    setCurrencyCode(stData.currencyDefault || "EUR");
    setSettings({
      kleinunternehmer: !!stData.kleinunternehmer,
      defaultVat: Number.isFinite(stData.defaultVat) ? stData.defaultVat : 19
    });
    setCustomers(cst.data || []);
    setProducts((prj.data || []).map(p => ({ id: p.id, name: p.name, priceCents: p.unitPriceCents, currency: p.currency })));
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
    const itemsRaw = JSON.parse(fd.get("items") || "[]");
    if (!itemsRaw.length) return alert("Mindestens eine Position erforderlich.");

    const vatRate = (settings.kleinunternehmer === true) ? 0 : (Number.isFinite(settings.defaultVat) ? settings.defaultVat : 19);

    const payload = {
      invoiceNo: fd.get("invoiceNo") || null,       // Server darf automatisch vergeben
      customerId: fd.get("customerId"),
      issueDate: fd.get("issueDate"),
      currency: currencyCode,
      taxRate: vatRate,
      discountCents: toCents(fd.get("discount") || 0),
      items: itemsRaw.map(it => ({
        productId: it.productId || null,
        name: it.name,
        description: null,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      })),
    };
    if (!payload.customerId) return alert("Bitte einen Kunden wählen.");

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
                <th style={{whiteSpace:"nowrap"}}>Nr.</th>
                <th style={{whiteSpace:"nowrap"}}>Kunde</th>
                <th className="hide-sm" style={{whiteSpace:"nowrap"}}>Datum</th>
                <th style={{whiteSpace:"nowrap"}}>Betrag</th>
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
                      <td>{currency(r.grossCents, currencyCode)}</td>
                    </tr>

                    {expandedId === r.id && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={4} style={{ background:"#fafafa", padding: 12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                          {editId === r.id ? (
                            <InvoiceEditDetails
                              initial={r}
                              customers={customers}
                              products={products}
                              currencyCode={currencyCode}
                              onCancel={() => setEditId(null)}
                              onSave={(values) => saveInvoice(r.id, values)}
                            />
                          ) : (
                            <InvoiceDetails
                              row={r}
                              currencyCode={currencyCode}
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
          onClose={()=>setShowNew(false)}
    onSubmit={createInvoice}
    products={products}          // ✅ hinzufügen
    customers={customers}
    currencyCode={settings.currency}
    settings={settings}
        />
      )}
    </main>
  );
}

/* ===== Details (read-only) ===== */
function InvoiceDetails({ row, currencyCode, onEdit, onDelete }) {
  const items = row.items || [];
  const taxCents = Number(row.taxCents || 0);
  const net = Number(row.grossCents || 0) - taxCents;

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
        <Field label="Rechnungs-Nr."><div>{row.invoiceNo}</div></Field>
        <Field label="Datum"><div>{row.issueDate ? new Date(row.issueDate).toLocaleDateString() : "—"}</div></Field>
        <Field label="Kunde"><div>{row.customerName || "—"}</div></Field>
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

/* ===== Inline-Edit Platzhalter (kurz) ===== */
function InvoiceEditDetails({ initial, customers, products, currencyCode, onCancel, onSave }) {
  return (
    <div style={{ color:"#6b7280" }}>
      Inline-Bearbeitung folgt – hier ist jetzt die „Neu“-Logik schlank umgesetzt. Sag Bescheid, wenn ich Edit 1:1 angleichen soll.
      <div style={{ marginTop: 8 }}>
        <button className="btn-ghost" onClick={onCancel}>Schließen</button>
      </div>
    </div>
  );
}

/* ===== Mini-Modal Neu (nach neuer Vorgabe) ===== */
function NewInvoiceSheet({ onClose, onSubmit, customers, products, currencyCode, settings }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("");

  const [items, setItems] = useState([
    { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"" }
  ]);

  const itemsTotal = useMemo(
    () => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0),
    [items]
  );
  const vatRate = (settings?.kleinunternehmer === true) ? 0 : (Number.isFinite(settings?.defaultVat) ? settings.defaultVat : 19);
  const tax = Math.round(itemsTotal * (vatRate / 100));
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal + tax - discountCents);

  function addRow(){
    setItems(prev => [...prev, { id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()), productId:"", name:"", quantity:1, unitPrice:"" }]);
  }
  function updateRow(id, patch){
    setItems(prev => prev.map(r => r.id===id ? { ...r, ...patch } : r));
  }
  function removeRow(id){ setItems(prev => prev.filter(r => r.id !== id)); }
  function onPickProduct(rowId, productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return updateRow(rowId, { productId:"", name:"", unitPrice:"" });
    updateRow(rowId, {
      productId,
      name: p.name,
      unitPrice: (p.priceCents/100).toString().replace(".", ",")
    });
  }

  return (
    <div className="surface" style={modalWrap}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800 }}>Neue Rechnung erstellen</div>
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
        {/* Kopf: Nr., Datum, Kunde */}
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
          <Field label="Nr.">
            <input style={input} name="invoiceNo" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} placeholder="automatisch oder manuell" />
          </Field>
          <Field label="Datum">
            <input type="date" style={input} name="issueDate" value={issueDate} onChange={e=>setIssueDate(e.target.value)} />
          </Field>
          <Field label="Kunde *">
            <select style={input} name="customerId" value={customerId} onChange={e=>setCustomerId(e.target.value)} required>
              <option value="">– wählen –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Positionen: nur Produkt + Menge; Preis & Summe read-only */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{whiteSpace:"nowrap"}}>Produkt</th>
                <th style={{ width:120, whiteSpace:"nowrap" }}>Menge</th>
                <th style={{ width:160, whiteSpace:"nowrap" }}>Einzelpreis</th>
                <th style={{ width:160, whiteSpace:"nowrap" }}>Summe</th>
                <th style={{ width:110, textAlign:"right", whiteSpace:"nowrap" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const qty = Number(r.quantity||0);
                const upCents = toCents(r.unitPrice || 0);
                const line = qty * upCents;
                return (
                  <tr key={r.id}>
                    {/* Produkt */}
                    <td>
                      <select value={r.productId} onChange={e=>onPickProduct(r.id, e.target.value)} style={input}>
                        <option value="">– auswählen –</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Menge */}
                    <td>
                      <input
                        value={r.quantity}
                        onChange={e=>updateRow(r.id,{quantity:parseInt(e.target.value||"1",10)})}
                        style={input}
                        inputMode="numeric"
                      />
                    </td>

                    {/* Einzelpreis (nur Anzeige) */}
                    <td>{currency(upCents, currencyCode)}</td>

                    {/* Summe (nur Anzeige) */}
                    <td>{currency(line, currencyCode)}</td>

                    {/* Entfernen */}
                    <td style={{ textAlign:"right" }}>
                      <button type="button" onClick={()=>removeRow(r.id)} style={btnDanger}>Entfernen</button>
                    </td>
                  </tr>
                );
              })}
              {items.length===0 && <tr><td colSpan={5} style={{ textAlign:"center", color:"#999" }}>Keine Positionen.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Rabatt & Summen inkl. Steuer je nach §19 */}
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr", alignItems:"center" }}>
          <Field label="Rabatt gesamt">
            <input name="discount" value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" placeholder="z. B. 10,00" />
          </Field>
          <div style={{ textAlign:"right" }}>
            <div>Zwischensumme: <b>{currency(itemsTotal, currencyCode)}</b></div>
            {vatRate>0 && <div>Steuer ({vatRate}%): <b>{currency(Math.round(itemsTotal*(vatRate/100)), currencyCode)}</b></div>}
            <div style={{ marginTop:6, fontWeight:700 }}>Brutto: {currency(gross, currencyCode)}</div>
          </div>
        </div>

        {/* Hidden items JSON */}
        <input type="hidden" id="new-invoice-items" name="items" />

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
