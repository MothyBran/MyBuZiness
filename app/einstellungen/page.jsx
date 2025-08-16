"use client";

import { useEffect, useState } from "react";

const FONT_PRESETS = [
  { key: "system-ui, sans-serif", label: "System (Sans Serif)" },
  { key: "ui-rounded, system-ui, sans-serif", label: "System Rounded" },
  { key: "Georgia, serif", label: "Georgia (Serif)" },
  { key: "Times New Roman, Times, serif", label: "Times New Roman (Serif)" },
  { key: "Arial, Helvetica, sans-serif", label: "Arial / Helvetica" },
  { key: "Inter, system-ui, sans-serif", label: "Inter (falls installiert)" },
  { key: "Roboto, system-ui, sans-serif", label: "Roboto (falls installiert)" },
  { key: "Montserrat, system-ui, sans-serif", label: "Montserrat (falls installiert)" }
];

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/settings", { cache: "no-store" });
    const json = await res.json();
    const data = json.data || {};
    setS(data);
    // Logo-Preview (DB-Logo)
    const probe = await fetch("/api/settings/logo", { cache: "no-store" });
    setLogoPreviewUrl(probe.ok ? "/api/settings/logo" : (data.logoUrl || ""));
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
    // Seite neu laden, damit Layout (Server-Komponente) neue Variablen setzt
    location.reload();
  }

  async function uploadLogo(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) return alert("Upload fehlgeschlagen.");
    setLogoPreviewUrl(`/api/settings/logo?ts=${Date.now()}`);
  }

  async function removeLogo() {
    if (!confirm("Logo wirklich entfernen?")) return;
    const res = await fetch("/api/settings/logo", { method: "DELETE" });
    if (!res.ok) return alert("Entfernen fehlgeschlagen.");
    setLogoPreviewUrl("");
  }

  if (loading || !s) return <main><p>Lade…</p></main>;

  // Live-Styles direkt aus s (für Preview)
  const previewStyle = {
    borderRadius: Number(s.borderRadius ?? 12),
    background: s.backgroundColor || "#fafafa",
    color: s.textColor || "#111",
    fontFamily: s.fontFamily || "system-ui, sans-serif",
    border: "1px solid #eee",
    padding: 16
  };

  return (
    <main>
      <h1>Einstellungen</h1>
      <p style={{ marginTop: -8, color: "#666" }}>
        Firmendaten, Kleinunternehmer (§19 UStG), Logo-Upload und Design.
      </p>

      <form onSubmit={save} style={card}>
        <strong>Firma</strong>
        <div style={grid2}>
          <Field label="Firmenname"><input value={s.companyName || ""} onChange={e => setS({ ...s, companyName: e.target.value })} style={input} /></Field>
          <Field label="E-Mail"><input value={s.email || ""} onChange={e => setS({ ...s, email: e.target.value })} style={input} /></Field>
          <Field label="Telefon"><input value={s.phone || ""} onChange={e => setS({ ...s, phone: e.target.value })} style={input} /></Field>
          <Field label="USt-ID"><input value={s.vatId || ""} onChange={e => setS({ ...s, vatId: e.target.value })} style={input} /></Field>
          <Field label="IBAN"><input value={s.iban || ""} onChange={e => setS({ ...s, iban: e.target.value })} style={input} /></Field>
          <div />
          <Field label="Adresse Zeile 1"><input value={s.addressLine1 || ""} onChange={e => setS({ ...s, addressLine1: e.target.value })} style={input} /></Field>
          <Field label="Adresse Zeile 2"><input value={s.addressLine2 || ""} onChange={e => setS({ ...s, addressLine2: e.target.value })} style={input} /></Field>
        </div>

        <div style={{ ...grid2, marginTop: 12 }}>
          <Field label="Standard-Währung">
            <select value={s.currencyDefault || "EUR"} onChange={e => setS({ ...s, currencyDefault: e.target.value })} style={input}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Standard-Steuer (%)">
            <input
              value={s.taxRateDefault ?? 19}
              onChange={e => setS({ ...s, taxRateDefault: e.target.value })}
              style={input}
              inputMode="decimal"
              disabled={!!s.kleinunternehmer}
              title={s.kleinunternehmer ? "Bei §19 wird üblicherweise 0% verwendet" : ""}
            />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!!s.kleinunternehmer}
              onChange={e => setS({ ...s, kleinunternehmer: e.target.checked })}
            />
            <span><strong>Kleinunternehmer (§19 UStG)</strong> – kein USt-Ausweis</span>
          </label>
        </div>

        {/* Logo */}
        <div style={{ borderTop: "1px dashed #ddd", marginTop: 16, paddingTop: 12 }}>
          <strong>Logo</strong>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Logo-Datei hochladen (PNG/JPG/SVG)</span>
                <input type="file" accept="image/*" onChange={e => uploadLogo(e.target.files?.[0])} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>oder Logo-URL</span>
                <input
                  value={s.logoUrl || ""}
                  onChange={e => setS({ ...s, logoUrl: e.target.value })}
                  placeholder="https://…"
                  style={input}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={!!s.showLogo} onChange={e => setS({ ...s, showLogo: e.target.checked })} />
                <span>Logo anzeigen</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={removeLogo} style={btnDanger}>Logo entfernen</button>
                <button type="button" onClick={() => setLogoPreviewUrl(s.logoUrl || "")} style={btnGhost}>URL-Logo prüfen</button>
              </div>
            </div>
            <div style={{ minWidth: 120, minHeight: 80, border: "1px solid #eee", display: "grid", placeItems: "center", borderRadius: 8, padding: 8 }}>
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Logo" style={{ maxHeight: 80, maxWidth: 160, objectFit: "contain" }} />
              ) : (
                <span style={{ color: "#999" }}>Keine Vorschau</span>
              )}
            </div>
          </div>
          {uploading && <div style={{ color: "#666", marginTop: 6 }}>Upload läuft…</div>}
        </div>

        {/* Design */}
        <div style={{ borderTop: "1px dashed #ddd", marginTop: 16, paddingTop: 12 }}>
          <strong>Design</strong>
          <div style={grid2}>
            <Field label="Primärfarbe">
              <input type="color" value={s.primaryColor || "#111111"} onChange={e => setS({ ...s, primaryColor: e.target.value })} style={{ ...input, padding: 0, height: 42 }} />
            </Field>
            <Field label="Akzentfarbe">
              <input type="color" value={s.accentColor || "#2563eb"} onChange={e => setS({ ...s, accentColor: e.target.value })} style={{ ...input, padding: 0, height: 42 }} />
            </Field>
            <Field label="Hintergrund">
              <input type="color" value={s.backgroundColor || "#fafafa"} onChange={e => setS({ ...s, backgroundColor: e.target.value })} style={{ ...input, padding: 0, height: 42 }} />
            </Field>
            <Field label="Textfarbe">
              <input type="color" value={s.textColor || "#111111"} onChange={e => setS({ ...s, textColor: e.target.value })} style={{ ...input, padding: 0, height: 42 }} />
            </Field>
            <Field label="Eckenradius (px)">
              <input value={s.borderRadius ?? 12} onChange={e => setS({ ...s, borderRadius: parseInt(e.target.value || "12", 10) })} style={input} inputMode="numeric" />
            </Field>
            <Field label="Schriftfamilie">
              <select
                value={s.fontFamily || "system-ui, sans-serif"}
                onChange={e => setS({ ...s, fontFamily: e.target.value })}
                style={input}
              >
                {FONT_PRESETS.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Header-Titel">
              <input value={s.headerTitle || "MyBuZiness"} onChange={e => setS({ ...s, headerTitle: e.target.value })} style={input} />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Speichern…" : "Speichern"}</button>
          <button type="button" style={btnGhost} onClick={load}>Zurücksetzen</button>
        </div>
      </form>

      {/* Live-Preview */}
      <section style={{ ...card, marginTop: 12 }}>
        <strong>Live-Vorschau</strong>
        <div style={{ marginTop: 12, ...previewStyle }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {s.showLogo && (logoPreviewUrl || s.logoUrl) && (
              <img src={logoPreviewUrl || s.logoUrl} alt="Logo" style={{ height: 40, objectFit: "contain" }} />
            )}
            <div style={{ fontWeight: 700, color: s.primaryColor || "#111" }}>{s.headerTitle || "MyBuZiness"}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ padding: "8px 12px", borderRadius: Number(s.borderRadius ?? 12), border: `1px solid ${s.primaryColor || "#111"}`, color: s.primaryColor || "#111" }}>
              Beispiel-Button
            </span>{" "}
            <span style={{ padding: "8px 12px", borderRadius: Number(s.borderRadius ?? 12), background: s.accentColor || "#2563eb", color: "#fff" }}>
              Akzent
            </span>
          </div>
        </div>
      </section>
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
const btnPrimary = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-primary)", background: "var(--color-primary)", color: "#fff", cursor: "pointer" };
const btnGhost = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-primary)", background: "transparent", color: "var(--color-primary)", cursor: "pointer" };
const btnDanger = { padding: "10px 12px", borderRadius: 10, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" };
