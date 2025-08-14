"use client";

import { useEffect, useMemo, useState } from "react";

export default function KundenPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", note: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload(q = "") {
    setLoading(true);
    const res = await fetch(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert("Bitte einen Namen eingeben.");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Fehler beim Anlegen.");
    setForm({ name: "", email: "", note: "" });
    reload(search);
  }

  async function remove(id) {
    if (!confirm("Diesen Eintrag löschen?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Fehler beim Löschen.");
    reload(search);
  }

  async function importFromLocalStorage() {
    const STORAGE_KEY = "mb_customers";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return alert("Keine lokalen Einträge gefunden.");
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return alert("Keine lokalen Einträge gefunden.");

      let ok = 0;
      for (const c of list) {
        const body = {
          name: c.name || "",
          email: c.email || "",
          note: c.note || ""
        };
        if (!body.name.trim()) continue;
        await fetch("/api/customers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }).then(r => r.ok && (ok++));
      }
      alert(`${ok} Einträge importiert.`);
      reload();
    } catch {
      alert("Import fehlgeschlagen.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.note || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <main>
      <h1>Kunden (Server‑gespeichert)</h1>
      <p style={{ marginTop: -8, color: "#666" }}>
        Daten liegen in einer PostgreSQL‑Datenbank auf Railway.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => reload(search)} style={btnGhost}>{loading ? "Lade..." : "Neu laden"}</button>
        <button onClick={importFromLocalStorage} style={btnGhost}>Aus LocalStorage importieren</button>
      </div>

      <section style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "1fr",
        marginTop: 24
      }}>
        <form onSubmit={handleSubmit} style={card}>
          <div style={{ display: "grid", gap: 6 }}>
            <label><strong>Name *</strong></label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Max Mustermann"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label><strong>E‑Mail</strong></label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="max@firma.de"
              type="email"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label><strong>Notiz</strong></label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="z. B. bevorzugt E‑Mail, Stammkunde, ..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={btnPrimary}>Hinzufügen</button>
          </div>
        </form>

        <div style={card}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); reload(e.target.value); }}
              placeholder="Suchen (Name, E‑Mail, Notiz)"
              style={{ ...inputStyle, maxWidth: 380 }}
            />
            <span style={{ color: "#666", fontSize: 14 }}>
              {filtered.length} Eintrag(e)
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>E‑Mail</th>
                  <th style={thStyle}>Notiz</th>
                  <th style={thStyle}>Erstellt</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={tdStyle}>{c.name}</td>
                    <td style={tdStyle}>
                      {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <em style={{ color: "#999" }}>–</em>}
                    </td>
                    <td style={tdStyle}>{c.note || <em style={{ color: "#999" }}>–</em>}</td>
                    <td style={tdStyle}>{new Date(c.createdAt).toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button onClick={() => remove(c.id)} style={btnDanger}>Löschen</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#999" }}>
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

const card = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  outline: "none",
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  fontSize: 13,
  color: "#555",
};

const tdStyle = {
  borderBottom: "1px solid #f2f2f2",
  padding: "10px 8px",
  fontSize: 14,
};

const btnPrimary = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const btnGhost = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "transparent",
  color: "#111",
  cursor: "pointer",
};

const btnDanger = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #c00",
  background: "#fff",
  color: "#c00",
  cursor: "pointer",
};

