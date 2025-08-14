"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mb_customers";

export default function KundenPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", note: "" });
  const [search, setSearch] = useState("");

  // Laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustomers(JSON.parse(raw));
    } catch {}
  }, []);

  // Speichern
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    } catch {}
  }, [customers]);

  // Einfacher Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.note.toLowerCase().includes(q)
    );
  }, [customers, search]);

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const note = form.note.trim();
    if (!name) return alert("Bitte einen Namen eingeben.");

    const newCustomer = {
      id: crypto.randomUUID(),
      name,
      email,
      note,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setForm({ name: "", email: "", note: "" });
  }

  function remove(id) {
    if (!confirm("Diesen Eintrag löschen?")) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(customers, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunden-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <h1>Kunden</h1>
      <p style={{ marginTop: -8, color: "#666" }}>
        Einfaches Kundenverzeichnis (lokal im Browser gespeichert).
      </p>

      <section style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "1fr",
        marginTop: 24
      }}>
        <form onSubmit={handleSubmit} style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12
        }}>
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
            <button type="button" style={btnGhost} onClick={exportJson}>Export (.json)</button>
          </div>
        </form>

        <div style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
