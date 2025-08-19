"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------- UI Helfer ---------- */
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "#9ca3af" }}>{hint}</span>}
    </label>
  );
}
const input = { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, width: "100%", outline: "none", background: "#fff" };
const btnPrimary = { padding: "12px 14px", borderRadius: 12, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer", fontWeight: 600 };
const btnGhost = { padding: "12px 14px", borderRadius: 12, background: "#fff", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer", fontWeight: 600 };
const card = { background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" };

const currencies = ["EUR", "CHF", "USD", "GBP"];
const fonts = [
  { value: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", label: "System" },
  { value: "Inter, system-ui, Arial, sans-serif", label: "Inter" },
  { value: "Roboto, system-ui, Arial, sans-serif", label: "Roboto" },
  { value: "'Open Sans', system-ui, Arial, sans-serif", label: "Open Sans" },
  { value: "Lato, system-ui, Arial, sans-serif", label: "Lato" },
  { value: "Poppins, system-ui, Arial, sans-serif", label: "Poppins" },
];

/* ---------- Seite ---------- */
export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Firmendaten
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [bankAccount, setBankAccount] = useState("");

  // Steuerdaten (eigener Abschnitt)
  const [vatId, setVatId] = useState("");
  const [kleinunternehmer, setKleinunternehmer] = useState(true);
  const [taxRateDefault, setTaxRateDefault] = useState(19); // nur relevant, wenn NICHT KU

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");
  const [secondaryColor, setSecondaryColor] = useState("#0ea5e9");
  const [fontFamily, setFontFamily] = useState(fonts[0].value);
  const [textColor, setTextColor] = useState("#0f172a");

  const samplePreview = useMemo(() => ({
    companyName, ownerName, address1, address2, postalCode, city, phone, email, website,
    bankAccount, vatId, kleinunternehmer, currency, logoUrl
  }), [companyName, ownerName, address1, address2, postalCode, city, phone, email, website, bankAccount, vatId, kleinunternehmer, currency, logoUrl]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const js = await fetch("/api/settings", { cache: "no-store" }).then(r => r.json()).catch(() => ({ ok:false }));
      const s = js?.data || {};

      // Firmendaten
      setCompanyName(s.companyName || "");
      setOwnerName(s.ownerName || "");
      setAddress1(s.address1 || "");
      setAddress2(s.address2 || "");
      setPostalCode(s.postalCode || "");
      setCity(s.city || "");
      setPhone(s.phone || "");
      setEmail(s.email || "");
      setWebsite(s.website || "");
      setBankAccount(s.bankAccount || "");
      setCurrency(s.currency || "EUR");

      // Steuerdaten
      setVatId(s.vatId || "");
      setKleinunternehmer(!!s.kleinunternehmer);
      setTaxRateDefault(Number.isFinite(Number(s.taxRateDefault)) ? Number(s.taxRateDefault) : 19);

      // Branding
      setLogoUrl(s.logoUrl || "");
      setPrimaryColor(s.primaryColor || "#06b6d4");
      setSecondaryColor(s.secondaryColor || "#0ea5e9");
      setFontFamily(s.fontFamily || fonts[0].value);
      setTextColor(s.textColor || "#0f172a");
      setLoading(false);

      // Live anwenden
      applyTheme({
        primaryColor: s.primaryColor || "#06b6d4",
        secondaryColor: s.secondaryColor || "#0ea5e9",
        textColor: s.textColor || "#0f172a",
        fontFamily: s.fontFamily || fonts[0].value
      });
    })();
  }, []);

  function applyTheme({ primaryColor, secondaryColor, textColor, fontFamily }) {
    const root = document.documentElement;
    if (primaryColor) root.style.setProperty("--color-primary", primaryColor);
    if (secondaryColor) root.style.setProperty("--color-secondary", secondaryColor);
    if (textColor) root.style.setProperty("--color-text", textColor);
    if (fontFamily) document.body.style.fontFamily = fontFamily;
  }

  async function onUploadLogo(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const js = await res.json().catch(()=>({ ok:false }));
    if (!js?.ok || !js?.url) return alert(js?.error || "Upload fehlgeschlagen.");
    setLogoUrl(js.url);
  }

  async function save(e) {
    e?.preventDefault?.();
    setSaving(true);
    const payload = {
      // Firmendaten
      companyName, ownerName, address1, address2, postalCode, city, phone, email, website,
      currency, bankAccount,
      // Steuerdaten
      vatId, kleinunternehmer, taxRateDefault,
      // Branding
      logoUrl, primaryColor, secondaryColor, fontFamily, textColor
    };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(()=>({ ok:false }));
    setSaving(false);
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");

    // Anwendung sofort aktualisieren
    applyTheme({ primaryColor, secondaryColor, textColor, fontFamily });
    // ... in save() NACH applyTheme({ ... }) und VOR alert(...)
try {
  // andere Seiten aktualisieren (InfoStripe + ThemeBridge hören darauf)
  window.dispatchEvent(new CustomEvent("settings:saved", {
    detail: {
      primaryColor,
      secondaryColor,
      textColor,
      fontFamily,
      companyName,
      email,
      city,
    }
  }));
} catch {}
    alert("Einstellungen gespeichert.");
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Einstellungen</h1>
        <button onClick={save} disabled={saving} style={btnPrimary}>
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>

      {/* Firmendaten */}
      <section style={{ ...card, marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Firmendaten</h2>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Firmenname"><input style={input} value={companyName} onChange={e=>setCompanyName(e.target.value)} /></Field>
          <Field label="Inhaber"><input style={input} value={ownerName} onChange={e=>setOwnerName(e.target.value)} /></Field>

          <Field label="Adresszeile 1"><input style={input} value={address1} onChange={e=>setAddress1(e.target.value)} /></Field>
          <Field label="Adresszeile 2 (optional)"><input style={input} value={address2} onChange={e=>setAddress2(e.target.value)} /></Field>

          <Field label="PLZ"><input style={input} value={postalCode} onChange={e=>setPostalCode(e.target.value)} /></Field>
          <Field label="Ort"><input style={input} value={city} onChange={e=>setCity(e.target.value)} /></Field>

          <Field label="Telefon"><input style={input} value={phone} onChange={e=>setPhone(e.target.value)} /></Field>
          <Field label="E‑Mail"><input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} /></Field>
          <Field label="Webseite (optional)"><input style={input} type="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://…" /></Field>

          <Field label="Währung">
            <select style={input} value={currency} onChange={e=>setCurrency(e.target.value)}>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Bankverbindung">
            <textarea style={{ ...input, minHeight: 80 }} value={bankAccount} onChange={e=>setBankAccount(e.target.value)} placeholder="IBAN / BIC / Bankname" />
          </Field>
        </div>
      </section>

      {/* Steuerdaten – eigener Abschnitt */}
      <section style={{ ...card, marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Steuerdaten</h2>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="USt‑ID">
            <input style={input} value={vatId} onChange={e=>setVatId(e.target.value)} placeholder="z. B. DE123456789" />
          </Field>

          <Field label="Kleinunternehmer‑Regelung § 19 UStG">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input
                id="ku"
                type="checkbox"
                checked={kleinunternehmer}
                onChange={e=>setKleinunternehmer(e.target.checked)}
              />
              <label htmlFor="ku" style={{ userSelect:"none" }}>Aktiv (0 % USt, Hinweis in Fußzeile)</label>
            </div>
          </Field>

          {!kleinunternehmer && (
            <Field label="Standard‑Steuersatz (%)" hint="Wird in Rechnungen ohne abweichenden Satz verwendet.">
              <input
                style={input}
                inputMode="decimal"
                value={taxRateDefault}
                onChange={e=>setTaxRateDefault(e.target.value)}
                placeholder="z. B. 19"
              />
            </Field>
          )}
        </div>
      </section>

      {/* Branding & Design */}
      <section style={{ ...card, marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Branding & Design</h2>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Logo">
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ width:72, height:72, objectFit:"contain", border:"1px solid #eee", borderRadius:10, background:"#fff" }}
                  onError={(e)=>{ e.currentTarget.style.display="none"; }}
                />
              ) : (
                <div style={{ width:72, height:72, border:"1px dashed #ddd", borderRadius:10, display:"grid", placeItems:"center", color:"#9ca3af" }}>kein Logo</div>
              )}
              <input type="file" accept="image/*" onChange={e=>onUploadLogo(e.target.files?.[0])} />
              <input style={{ ...input, flex:"1 1 280px" }} value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="Logo‑URL (optional, falls kein Upload)" />
            </div>
          </Field>

          <Field label="Schriftart">
            <select style={input} value={fontFamily} onChange={e=>setFontFamily(e.target.value)}>
              {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>

          <Field label="Primärfarbe">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="color" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} />
              <input style={input} value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} />
            </div>
          </Field>

          <Field label="Sekundärfarbe">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="color" value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} />
              <input style={input} value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} />
            </div>
          </Field>

          <Field label="Schriftfarbe">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} />
              <input style={input} value={textColor} onChange={e=>setTextColor(e.target.value)} />
            </div>
          </Field>
        </div>

        {/* Live-Vorschau */}
        <div style={{ marginTop:16 }}>
          <h3 style={{ margin:"0 0 8px 0", fontSize:16, color:"#6b7280" }}>Vorschau</h3>
          <BrandPreview settings={{ ...samplePreview, primaryColor, secondaryColor, fontFamily, textColor }} />
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? "Speichern…" : "Speichern"}</button>
          <button onClick={()=>applyTheme({ primaryColor, secondaryColor, textColor, fontFamily })} style={btnGhost}>Live anwenden</button>
        </div>
      </section>

      <style jsx global>{`
        @media (max-width: 820px){
          section > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- Vorschau-Komponente ---------- */
function BrandPreview({ settings }) {
  const {
    companyName, ownerName, address1, address2, postalCode, city, phone, email, website,
    kleinunternehmer, currency, logoUrl, primaryColor, secondaryColor, fontFamily, textColor
  } = settings;

  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 8px 30px rgba(0,0,0,.05)"
    }}>
      <div style={{
        padding: 14,
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        color: "#fff",
        display: "flex",
        alignItems:"center",
        gap: 12
      }}>
        {logoUrl ? <img src={logoUrl} style={{ width:40, height:40, objectFit:"contain", filter:"drop-shadow(0 2px 4px rgba(0,0,0,.2))" }} alt="Logo" /> : null}
        <div style={{ fontWeight: 800, letterSpacing: .2 }}>{companyName || "Firmenname"}</div>
      </div>
      <div style={{ padding: 14, fontFamily, color: textColor }}>
        <div style={{ display:"grid", gap:4 }}>
          <div><b>Inhaber:</b> {ownerName || "—"}</div>
          <div><b>Adresse:</b> {address1 || "—"} {address2 ? `, ${address2}` : ""}</div>
          <div><b>PLZ/Ort:</b> {(postalCode || "—") + " " + (city || "")}</div>
          <div><b>Telefon:</b> {phone || "—"} · <b>E‑Mail:</b> {email || "—"}</div>
          {website ? <div><b>Web:</b> {website}</div> : null}
          <div><b>Währung:</b> {currency}</div>
          {kleinunternehmer && (
            <div style={{ fontSize:12, opacity:.8, marginTop:8 }}>
              Hinweis gem. § 19 UStG (Kleinunternehmerregelung): Es wird keine Umsatzsteuer ausgewiesen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
