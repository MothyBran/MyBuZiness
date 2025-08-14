"use client";

import { useEffect, useMemo, useState } from "react";
import { toCents, fromCents } from "@/lib/money";

export default function ProduktePage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: "", currency: "EUR", description: "" });
  const [editId, setEditId] = useState(null);

  async function reload(q = "") {
    setLoading(true);
    const res = await fetch(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku,
      priceCents: toCents(form.price),
      currency: form.currency,
      description: form.description
    };

    const url = editId ? `/api/products/${editId}` : "/api/products";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Fehler beim Speichern.");

    setForm({ name: "", sku: "", price: "", currency: "EUR", description: "" });
    setEditId(null);
    reload(search);
  }

  function startEdit(p) {
    setEditId(p.id);
    setForm({
      name: p.name || "",
      sku: p.sku || "",
      price: (p.priceCents / 100).toString().replace(".", ","),
      currency: p.currency || "EUR",
      description: p.description || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id) {
    if (!confirm("Dieses Produkt löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Fehler beim Löschen.");
    reload(search);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <main>
      <h1>Produkte</h1>
      <p style={{ marginTop: -8, color: "#666" }}>Verwalte deine Produktliste (in PostgreSQL gespeichert).</p>

      <section style={grid}>
        <form onSubmit={handleSubmit} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <strong>{editId ? "Produkt bearbeiten" : "Neues Produkt"}</strong>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ name: "", sku: "", price: "", currency: "EUR", description: "" }); }} style={btnGhost}>
                Abbrechen
              </button>
            )}
          </div>

          <div style={row}>
            <div style={col}>
              <label><strong>Name *</strong></label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="z. B. Maniküre Basic"
                required
                style={input}
              />
            </div>
            <div style={col}>
              <label><strong>SKU (optional)</strong></label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="PROD-001"
                style={input}
              />
            </div>
          </div>

          <div style={row}>
            <div style={col}>
              <label><strong>Preis *</strong></label>
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="z. B. 29,90"
                inputMode="decimal"
                style={input}
              />
            </div>
            <div style={{ ...col, maxWidth: 180 }}>
              <label><strong>Währung</strong></label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={input}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label><strong>Beschreibung</strong></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Kurzbeschreibung ..."
              rows={3}
              style={{ ...input, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={btnPrimary}>{editId ? "Speichern" : "Hinzufügen"}</button>
          </div>
        </form>

        <div style={card}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); reload(e.target.value); }}
              placeholder="Suchen (Name, SKU, Beschreibung)"
              style={{ ...input, maxWidth: 380 }}
            />
            <span style={{ color: "#666", fontSize: 14 }}>
              {filtered.length} Produkt(e)
            </span>
            <button onClick={() => reload(search)} style={btnGhost}>{loading ? "Lade..." : "Neu laden"}</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>SKU</th>
                  <th style={th}>Preis</th>
                  <th style={th}>Währung</th>
                  <th style={th}>Beschreibung</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{p.sku || <em style={{ color: "#999" }}>–</em>}</td>
                    <td style={td}>{fromCents(p.priceCents, p.currency)}</td>
                    <td style={td}>{p.currency}</td>
                    <td style={td}>{p.description || <em style={{ color: "#999" }}>–</em>}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => startEdit(p)} style={btnGhost}>Bearbeiten</button>{" "}
                      <button onClick={() => remove(p.id)} style={btnDanger}>Löschen</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: "center", color: "#999" }}>
                      Keine Einträge gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

const grid = { display: "grid", gap: 16, gridTemplateColumns: "1fr", marginTop: 24 };
const card = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 };
const row = { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" };
const col = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", outline: "none" };
const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: "10px 8px", fontSize: 13, color: "#555" };
const td = { borderBottom: "1px solid #f2f2f2", padding: "10px 8px", fontSize: 14 };
const btnPrimary = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" };
const btnGhost = { padding: "8px 10px", borderRadius: 8, border: "1px solid #111", background: "transparent", color: "#111", cursor: "pointer" };
const btnDanger = { padding: "8px 10px", borderRadius: 8, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" };
