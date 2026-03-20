"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2 } from "lucide-react";

export default function MitarbeiterPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await fetch("/api/mitarbeiter");
      const data = await res.json();
      if (data.ok) {
        setEmployees(data.data || []);
      } else {
        alert("Fehler beim Laden der Mitarbeiter");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function saveEmployee(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/mitarbeiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        setIsModalOpen(false);
        setForm({ name: "", email: "", password: "" });
        loadEmployees();
      } else {
        setErrorMsg(data.error || "Ein Fehler ist aufgetreten.");
      }
    } catch (e) {
      setErrorMsg("Verbindung fehlgeschlagen.");
    }
    setSaving(false);
  }

  async function deleteEmployee(id) {
    if (!confirm("Mitarbeiter wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/mitarbeiter/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        loadEmployees();
      } else {
        alert(data.error || "Löschen fehlgeschlagen.");
      }
    } catch (e) {
      alert("Fehler beim Löschen.");
    }
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Mitarbeiter</h1>
          <div className="subtle">Zugänge für Ihre Mitarbeiter verwalten</div>
        </div>
        <div>
          <button
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => { setErrorMsg(""); setIsModalOpen(true); }}
          >
            <UserPlus size={18} /> Mitarbeiter hinzufügen
          </button>
        </div>
      </div>

      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>E-Mail</th>
                <th style={th}>Erstellt am</th>
                <th style={{ ...th, textAlign: "right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={td} colSpan={4}>Lade…</td></tr>
              ) : employees.length ? (
                employees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ ...td, fontWeight: 500 }}>{emp.name || "-"}</td>
                    <td style={td}>{emp.email}</td>
                    <td style={td}>{new Date(emp.createdAt).toLocaleDateString("de-DE")}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        className="btn-xxs btn-danger"
                        onClick={() => deleteEmployee(emp.id)}
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td style={td} colSpan={4}>Keine Mitarbeiter gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content surface">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Neuer Mitarbeiter</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            {errorMsg && (
              <div style={{ padding: "10px", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={saveEmployee} style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Name</span>
                <input
                  required
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>E-Mail</span>
                <input
                  required
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Passwort</span>
                <input
                  required
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <span className="subtle" style={{ fontSize: 11 }}>Min. 8 Zeichen, mind. ein Großbuchstabe, ein Kleinbuchstabe und eine Zahl.</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Abbrechen</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center; z-index: 999;
          padding: 16px;
        }
        .modal-content {
          width: 100%; max-width: 400px; padding: 20px;
        }
        .btn-close {
          background: none; border: none; font-size: 24px; line-height: 1; cursor: pointer; color: var(--muted);
        }
        .btn-close:hover { color: var(--text); }
        .input {
          padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; width: 100%;
          outline: none; background: var(--panel); color: var(--text);
        }
      `}</style>
    </div>
  );
}

const th = { textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border, #eee)", fontSize: 13, color: "var(--muted, #374151)" };
const td = { padding: "12px 16px", borderBottom: "1px solid var(--border, #f2f2f2)", fontSize: 14 };
