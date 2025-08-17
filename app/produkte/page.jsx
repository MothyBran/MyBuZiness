"use client";

import { useEffect, useState } from "react";
import Modal from "@/app/components/Modal";

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

/** UI helpers */
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
  const [editRow, setEditRow] = useState(null);
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

  async function remove(id) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const js = await res.json().catch(() => ({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    load();
  }

  return (
    <main>
      {/* Kopfzeile */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Produkte & Dienstleistungen</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name/Kategorie)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Liste */}
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
                <th style={{ textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.name}</td>
                  <td className="hide-sm">{r.type === "service" ? "Dienstleistung" : "Produkt"}</td>
                  <td className="ellipsis">{r.categoryCode || "—"}</td>
                  <td className="hide-sm">{r.travelRateCents ? currency(r.travelRateCents, currencyCode) : "—"}</td>
                  <td>{currency(r.unitPriceCents, r.currency || currencyCode)}</td>
                  <td style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                    <button className="btn-ghost" onClick={()=>setEditRow(r)} style={{ marginRight: 8 }}>Bearbeiten</button>
                    <button className="btn-ghost" onClick={()=>remove(r.id)} style={{ borderColor:"#c00", color:"#c00" }}>Löschen</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={6} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Einträge."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        title="Neuen Eintrag anlegen"
        open={openNew}
        onClose={()=>setOpenNew(false)}
        onSaved={()=>{ setOpenNew(false); load(); }}
        currencyCode={currencyCode}
      />
      {editRow && (
        <ProductModal
          title="Eintrag bearbeiten"
          initial={editRow}
          open={!!editRow}
          onClose={()=>setEditRow(null)}
          onSaved={()=>{ setEditRow(null); load(); }}
          currencyCode={currencyCode}
        />
      )}
    </main>
  );
}

function ProductModal({ title, open, onClose, onSaved, initial, currencyCode="EUR" }) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "service"); // "service" | "product"
  const [categoryCode, setCategoryCode] = useState(initial?.categoryCode || "");
  const [unitPrice, setUnitPrice] = useState(initial ? (initial.unitPriceCents/100).toString().replace(".", ",") : "");
  const [travelRate, setTravelRate] = useState(
    initial?.travelRateCents ? (initial.travelRateCents/100).toString().replace(".", ",") : ""
  );

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || "");
    setType(initial?.type || "service");
    setCategoryCode(initial?.categoryCode || "");
    setUnitPrice(initial ? (initial.unitPriceCents/100).toString().replace(".", ",") : "");
    setTravelRate(initial?.travelRateCents ? (initial.travelRateCents/100).toString().replace(".", ",") : "");
  }, [open, initial]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return alert("Name ist erforderlich.");
    const payload = {
      name,
      type,
      categoryCode: categoryCode || null,
      unitPriceCents: toCents(unitPrice || 0),
      travelRateCents: travelRate ? toCents(travelRate) : null,
      currency: currencyCode,
    };

    let res;
    if (initial?.id) {
      res = await fetch(`/api/products/${initial.id}`, { method:"PUT", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/products", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    }
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={760}>
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
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}
