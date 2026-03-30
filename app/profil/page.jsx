"use client";

import { useState, useEffect } from "react";

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", oldPassword: "", newPassword: "", confirmPassword: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/profil");
      const data = await res.json();
      if (data.ok) {
        setForm({ name: data.data.name || "", email: data.data.email || "", oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setErrorMsg("Fehler beim Laden des Profils.");
      }
    } catch (e) {
      setErrorMsg("Verbindung fehlgeschlagen.");
    }
    setLoading(false);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMsg(data.message || "Profil aktualisiert.");
        setForm(prev => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" })); // Clear password fields after save
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrorMsg(data.error || "Ein Fehler ist aufgetreten.");
      }
    } catch (e) {
      setErrorMsg("Verbindung fehlgeschlagen.");
    }
    setSaving(false);
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Profil</h1>
        <div className="subtle">Ihre persönlichen Kontodaten und Sicherheitseinstellungen</div>
      </div>

      {errorMsg && (
        <div style={{ padding: "12px", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: "12px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          {successMsg}
        </div>
      )}

      <div className="surface" style={{ padding: 24 }}>
        {loading ? (
          <div>Lade Profil...</div>
        ) : (
          <form onSubmit={saveProfile} style={{ display: "grid", gap: 20 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Name</span>
              <input
                required
                className="input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="z.B. Max Mustermann"
                style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", width: "100%", background: "var(--panel)", color: "var(--text)" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>E-Mail Adresse</span>
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", width: "100%", background: "var(--panel)", color: "var(--text)" }}
              />
              <span className="subtle" style={{ fontSize: 12 }}>Diese E-Mail wird für den Login verwendet.</span>
            </label>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />

            <div style={{ display: "grid", gap: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Passwort ändern (Optional)</span>

              <div style={{ display: "grid", gap: 6 }}>
                <span className="subtle" style={{ fontSize: 13 }}>Altes Passwort</span>
                <div style={{ position: "relative" }}>
                  <input
                    type={showOldPassword ? "text" : "password"}
                    className="input"
                    value={form.oldPassword}
                    onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                    placeholder="Aktuelles Passwort"
                    style={{ padding: "10px 12px", paddingRight: "40px", border: "1px solid var(--border)", borderRadius: "8px", width: "100%", background: "var(--panel)", color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                    }}
                    title={showOldPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showOldPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <span className="subtle" style={{ fontSize: 13 }}>Neues Passwort</span>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="input"
                    value={form.newPassword}
                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="Neues Passwort"
                    style={{ padding: "10px 12px", paddingRight: "40px", border: "1px solid var(--border)", borderRadius: "8px", width: "100%", background: "var(--panel)", color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                    }}
                    title={showNewPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <span className="subtle" style={{ fontSize: 12 }}>Min. 8 Zeichen, mind. ein Großbuchstabe, ein Kleinbuchstabe und eine Zahl.</span>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <span className="subtle" style={{ fontSize: 13 }}>Neues Passwort wiederholen</span>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="input"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Neues Passwort bestätigen"
                    style={{ padding: "10px 12px", paddingRight: "40px", border: "1px solid var(--border)", borderRadius: "8px", width: "100%", background: "var(--panel)", color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                    }}
                    title={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer", padding: "10px 12px", borderRadius: 8 }}>
                {saving ? "Wird gespeichert..." : "Änderungen speichern"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
