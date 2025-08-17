"use client";

import { useEffect, useState } from "react";

/** Money helpers */
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

/** UI */
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

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [openNew, setOpenNew] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [currencyCode, setCurrencyCode] = useState("EUR");

  async function load() {
    setLoading(true);
    const [res, st] = await Promise.all([
      fetch(q ? `/api/products?q=${encodeURIComponent(q)}` : "/api/products", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
    ]);
    const js = await res.json().catch(() => ({ data: [] }));
    const settings = await st.json().catch(() => ({ data: { currencyDefault: "EUR" } }));
    setCurrencyCode(settings?.data?.currencyDefault || "EUR");
    setRows(js.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id);
    setEditId(null);
  }

  async function removeProduct(id) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const js = await res.json().catch(() => ({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    setExpandedId(null);
    setEditId(null);
    load();
  }

  async function saveProduct(id, values) {
    const res = await fetch(`/api/products/${id}`, {
      method:"PUT",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(values)
    });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    setEditId(null);
    load();
  }

  async function createProduct(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      type: fd.get("type"),
      categoryCode: fd.get("categoryCode") || null,
      unitPriceCents: toCents(fd.get("unitPrice") || 0),
      travelRateCents: fd.get("travelRate") ? toCents(fd.get("travelRate")) : null,
      currency: currencyCode,
    };
    if (!payload.name?.trim()) return alert("Name ist erforderlich.");
    const res = await fetch("/api/products", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Erstellen fehlgeschlagen.");
    setOpenNew(false);
    load();
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Produkte & Dienstleistungen</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name/Kategorie)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Eintrag</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-sm">Typ</th>
                <th>Kategorie</th>
                <th className="hide-sm">Fahrt €/km</th>
                <th>Preis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <>
                  <tr
                    key={r.id}
                    className="row-clickable"
                    onClick={() => toggleExpand(r.id)}
                    style={{ cursor:"pointer" }}
                  >
                    <td className="ellipsis">{r.name}</td>
                    <td className="hide-sm">{r.type === "service" ? "Dienstleistung" : "Produkt"}</td>
                    <td className="ellipsis">{r.categoryCode || "—"}</td>
                    <td className="hide-sm">{r.travelRateCents ? currency(r.travelRateCents, r.currency || currencyCode) : "—"}</td>
                    <td>{currency(r.unitPriceCents, r.currency || currencyCode)}</td>
                  </tr>

                  {expandedId === r.id && (
                    <tr key={r.id + "-details"}>
                      <td colSpan={5} style={{ background:"#fafafa", padding: 12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                        {editId === r.id ? (
                          <ProductEditForm
                            initial={r}
                            currencyCode={r.currency || currencyCode}
                            onCancel={() => setEditId(null)}
                            onSave={(values) => saveProduct(r.id, values)}
                          />
                        ) : (
                          <ProductDetails
                            row={r}
                            currencyCode={r.currency || currencyCode}
                            onEdit={() => setEditId(r.id)}
                            onDelete={() => removeProduct(r.id)}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Einträge."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini-Modal: Neu */}
      {openNew && (
        <div className="surface" style={modalWrap}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800 }}>Neuen Eintrag anlegen</div>
            <button onClick={()=>setOpenNew(false)} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
          </div>
          <form onSubmit={createProduct} style={{ display:"grid", gap:12 }}>
            <div style={{ display:"grid", gap:12, gridTemplateColumns:"2fr 1fr 1fr" }}>
              <Field label="Name *"><input style={input} name="name" required /></Field>
              <Field label="Typ">
                <select style={input} name="type" defaultValue="service">
                  <option value="service">Dienstleistung</option>
                  <option value="product">Produkt</option>
                </select>
              </Field>
              <Field label="Kategorie-Code (z. B. 1.1)">
                <input style={input} name="categoryCode" placeholder="1.1" />
              </Field>
            </div>

            <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
              <Field label={`Preis (${currencyCode})`}>
                <input style={input} name="unitPrice" inputMode="decimal" placeholder="z. B. 49,90" />
              </Field>
              <Field label={`Fahrtkosten €/km (${currencyCode})`}>
                <input style={input} name="travelRate" inputMode="decimal" placeholder="optional, z. B. 0,35" />
              </Field>
              <Field label="Währung">
                <input style={input} value={currencyCode} disabled />
              </Field>
            </div>

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
              <button type="button" onClick={()=>setOpenNew(false)} style={btnGhost}>Abbrechen</button>
              <button type="submit" style={btnPrimary}>Speichern</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

/** Details – read-only */
function ProductDetails({ row, currencyCode, onEdit, onDelete }) {
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"2fr 1fr 1fr" }}>
        <Field label="Kategorie-Code"><div>{row.categoryCode || "—"}</div></Field>
        <Field label="Name"><div>{row.name}</div></Field>
        <Field label="Typ"><div>{row.type === "service" ? "Dienstleistung" : "Produkt"}</div></Field>
      </div>

      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
        <Field label={`Preis (${currencyCode})`}><div>{currency(row.unitPriceCents, currencyCode)}</div></Field>
        <Field label={`Fahrt €/km (${currencyCode})`}><div>{row.travelRateCents ? currency(row.travelRateCents, currencyCode) : "—"}</div></Field>
        <Field label="Währung"><div>{currencyCode}</div></Field>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap", marginTop:4 }}>
        <button className="btn-ghost" onClick={onEdit}>⚙️ Bearbeiten</button>
        <button className="btn-ghost" onClick={onDelete} style={{ borderColor:"#c00", color:"#c00" }}>❌ Löschen</button>
      </div>
    </div>
  );
}

/** Inline-Edit */
function ProductEditForm({ initial, currencyCode, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "service");
  const [categoryCode, setCategoryCode] = useState(initial?.categoryCode || "");
  const [unitPrice, setUnitPrice] = useState(
    initial ? (initial.unitPriceCents/100).toString().replace(".", ",") : ""
  );
  const [travelRate, setTravelRate] = useState(
    initial?.travelRateCents ? (initial.travelRateCents/100).toString().replace(".", ",") : ""
  );

  function submit(e){
    e.preventDefault();
    if (!name.trim()) return alert("Name ist erforderlich.");
    onSave({
      name,
      type,
      categoryCode: categoryCode || null,
      unitPriceCents: toCents(unitPrice || 0),
      travelRateCents: travelRate ? toCents(travelRate) : null,
      currency: currencyCode,
    });
  }

  return (
    <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"2fr 1fr 1fr" }}>
        <Field label="Name *"><input style={input} value={name} onChange={e=>setName(e.target.value)} required /></Field>
        <Field label="Typ">
          <select style={input} value={type} onChange={e=>setType(e.target.value)}>
            <option value="service">Dienstleistung</option>
            <option value="product">Produkt</option>
          </select>
        </Field>
        <Field label="Kategorie-Code (z. B. 1.1)">
          <input style={input} value={categoryCode} onChange={e=>setCategoryCode(e.target.value)} placeholder="1.1" />
        </Field>
      </div>

      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
        <Field label={`Preis (${currencyCode})`}>
          <input style={input} value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} inputMode="decimal" placeholder="z. B. 49,90" />
        </Field>
        <Field label={`Fahrtkosten €/km (${currencyCode})`}>
          <input style={input} value={travelRate} onChange={e=>setTravelRate(e.target.value)} inputMode="decimal" placeholder="optional, z. B. 0,35" />
        </Field>
        <Field label="Währung">
          <input style={input} value={currencyCode} disabled />
        </Field>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Abbrechen</button>
        <button type="submit" style={btnPrimary}>Speichern</button>
      </div>
    </form>
  );
}

const modalWrap = {
  position:"fixed", left:"50%", top:"10%", transform:"translateX(-50%)",
  width:"min(760px, 92vw)", maxHeight:"80vh", overflow:"auto", padding:16, zIndex:1000
};
