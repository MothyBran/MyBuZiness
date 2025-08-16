"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { toCents, fromCents } from "@/lib/money";

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterKind, setFilterKind] = useState(""); // '', 'service', 'product'
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (filterKind) qs.set("kind", filterKind);
    const res = await fetch(`/api/products${qs.toString() ? `?${qs}` : ""}`);
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filterKind]);

  async function del(id) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Löschen fehlgeschlagen.");
    load();
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>Produkte & Dienstleistungen</h1>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name, SKU, Kategorie)…" style={input} />
          <button onClick={() => load()} style={btnGhost}>Suchen</button>
          <span style={{ color:"#666" }}>Typ:</span>
          <select value={filterKind} onChange={(e)=>setFilterKind(e.target.value)} style={input}>
            <option value="">Alle</option>
            <option value="service">Dienstleistung</option>
            <option value="product">Produkt</option>
          </select>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neu</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Typ</th>
                <th style={th}>Kategorie</th>
                <th style={th}>Name</th>
                <th style={th}>Preis</th>
                <th style={th}>Fahrtkosten</th>
                <th style={{ ...th, textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td style={td}>{p.kind === "product" ? "Produkt" : "Dienstleistung"}</td>
                  <td style={td}>{p.categoryCode || "-"}</td>
                  <td style={td}>
                    <div style={{ fontWeight:600 }}>{p.name}</div>
                    <div style={{ color:"#666", fontSize:13 }}>{p.sku || ""}</div>
                    {p.description && <div style={{ color:"#666", fontSize:13 }}>{p.description}</div>}
                  </td>
                  <td style={td}>{fromCents(p.priceCents, p.currency)}</td>
                  <td style={td}>
                    {p.travelEnabled
                      ? `${fromCents(p.travelRateCents, p.currency)} pro ${p.travelUnit || "km"}`
                      : "—"}
                  </td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/produkte/${p.id}`} style={btnGhost}>Bearbeiten</Link>{" "}
                    <button onClick={() => del(p.id)} style={btnDanger}>Löschen</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign:"center", color:"#999" }}>
                    {loading ? "Lade…" : "Keine Einträge."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewProductModal open={openNew} onClose={()=>setOpenNew(false)} onSaved={()=>{ setOpenNew(false); load(); }} />
    </main>
  );
}

function NewProductModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    kind: "service",
    categoryCode: "",
    name: "",
    sku: "",
    price: "",
    currency: "EUR",
    description: "",
    travelEnabled: false,
    travelRate: "",
    travelUnit: "km"
  });

  async function submit(e){
    e.preventDefault();
    const payload = {
      kind: form.kind,
      categoryCode: form.categoryCode || null,
      name: form.name,
      sku: form.sku || null,
      priceCents: toCents(form.price || 0),
      currency: form.currency,
      description: form.description || null,
      travelEnabled: !!form.travelEnabled,
      travelRateCents: toCents(form.travelRate || 0),
      travelUnit: form.travelUnit || "km"
    };
    if (!payload.name) return alert("Name ist erforderlich.");

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Erstellen fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Neues Produkt/Dienstleistung">
      <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(4, 1fr)" }}>
          <label style={label}>
            <span>Typ</span>
            <select value={form.kind} onChange={(e)=>setForm({ ...form, kind: e.target.value })} style={input}>
              <option value="service">Dienstleistung</option>
              <option value="product">Produkt</option>
            </select>
          </label>
          <label style={label}>
            <span>Kategorie-Code</span>
            <input value={form.categoryCode} onChange={(e)=>setForm({ ...form, categoryCode: e.target.value })} style={input} placeholder="z. B. 1.1" />
          </label>
          <label style={label}>
            <span>Name *</span>
            <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} style={input} required />
          </label>
          <label style={label}>
            <span>SKU</span>
            <input value={form.sku} onChange={(e)=>setForm({ ...form, sku: e.target.value })} style={input} />
          </label>
        </div>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(4, 1fr)" }}>
          <label style={label}>
            <span>Preis (Einheit)</span>
            <input value={form.price} onChange={(e)=>setForm({ ...form, price: e.target.value })} style={input} inputMode="decimal" placeholder="z. B. 29,90" />
          </label>
          <label style={label}>
            <span>Währung</span>
            <select value={form.currency} onChange={(e)=>setForm({ ...form, currency: e.target.value })} style={input}>
              <option>EUR</option><option>USD</option>
            </select>
          </label>
          <label style={{ ...label, alignItems:"center", display:"grid", gridTemplateColumns:"1fr auto" }}>
            <div style={{ display:"grid", gap:6 }}>
              <span>Fahrtkosten aktiv</span>
              <small style={{ color:"#666" }}>Wenn aktiv: pro-km-Satz angeben</small>
            </div>
            <input type="checkbox" checked={form.travelEnabled} onChange={(e)=>setForm({ ...form, travelEnabled: e.target.checked })} />
          </label>
          <label style={label}>
            <span>Fahrtkosten (pro km)</span>
            <input value={form.travelRate} onChange={(e)=>setForm({ ...form, travelRate: e.target.value })} style={input} inputMode="decimal" placeholder="z. B. 0,35" />
          </label>
        </div>

        <label style={label}>
          <span>Beschreibung</span>
          <textarea value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} style={{ ...input, resize:"vertical" }} rows={2} />
        </label>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

const label = { display:"grid", gap:6 };
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none" };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
