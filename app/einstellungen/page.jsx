"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/settings");
    const json = await res.json();
    setS(json.data || {});
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(s)
    });
    const json = await res.json();
    setSaving(false);
    if (!json.ok) return alert(json.error || "Speichern fehlgeschlagen.");
    setS(json.data);
    alert("Gespeichert!");
  }

  if (loading || !s) return <main><p>Lade…</p></main>;

  return (
    <main>
      <h1>Einstellungen</h1>
      <p style={{ marginTop: -8, color: "#666" }}>Firmendaten & Standards</p>

      <form onSubmit={save} style={card}>
        <div style={grid2}>
          <Field label="Firmenname">
            <input value={s.companyName || ""} onChange={e => setS({ ...s, companyName: e.target.value })} style={input} />
          </Field>
          <Field label="E-Mail">
            <input value={s.email || ""} onChange={e => setS({ ...s, email: e.target.value })} style={input} />
          </Field>
          <Field label="Telefon">
            <input value={s.phone || ""} onChange={e => setS({ ...s, phone: e.target.value })} style={input} />
          </Field>
          <Field label="USt-ID">
            <input value={s.vatId || ""} onChange={e => setS({ ...s, vatId: e.target.value })} style={input} />
          </Field>
          <Field label="IBAN">
            <input value={s.iban || ""} onChange={e => setS({ ...s, iban: e.target.value })} style={input} />
          </Field>
          <Field label="Logo-URL">
            <input value={s.logoUrl || ""} onChange={e => setS({ ...s, logoUrl: e.target.value })} style={input} />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Adresse Zeile 1">
            <input value={s.addressLine1 || ""} onChange={e => setS({ ...s, addressLine1: e.target.value })} style={input} />
          </Field>
          <Field label="Adresse Zeile 2">
            <input value={s.addressLine2 || ""} onChange={e => setS({ ...s, addressLine2: e.target.value })} style={input} />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Standard-Währung">
            <select value={s.currencyDefault || "EUR"} onChange={e => setS({ ...s, currencyDefault: e.target.value })} style={input}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Standard-Steuer (%)">
            <input value={s.taxRateDefault ?? 19} onChange={e => setS({ ...s, taxRateDefault: e.target.value })} style={input} inputMode="decimal" />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Speichern…" : "Speichern"}</button>
          <button type="button" style={btnGhost} onClick={load}>Zurücksetzen</button>
        </div>
      </form>

      {s.logoUrl && (
        <div style={{ marginTop: 16 }}>
          <strong>Logo-Vorschau:</strong>
          <div><img src={s.logoUrl} alt="Logo" style={{ maxHeight: 80, marginTop: 8 }} /></div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <strong>{label}</strong>
      {children}
    </label>
  );
}

const card = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, marginTop: 16 };
const grid2 = { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 };
const input = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", outline: "none" };
const btnPrimary = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" };
const btnGhost = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "transparent", color: "#111", cursor: "pointer" };
