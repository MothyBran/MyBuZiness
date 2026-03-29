"use client";
import { useDialog } from "../components/DialogProvider";


import { useEffect, useMemo, useState } from "react";

/* ---------- UI Helfer ---------- */
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="subtle" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ color: "var(--text, inherit)" }}>{children}</span>
      {hint && <span className="subtle" style={{ fontSize: 11 }}>{hint}</span>}
    </label>
  );
}
const input = { padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, width: "100%", outline: "none", background: "var(--panel)", color: "var(--text)" };
const btnPrimary = { padding: "10px 12px", borderRadius: 8, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer" };
const btnGhost = { padding: "10px 12px", borderRadius: 8, background: "transparent", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer" };

const currencies = ["EUR", "CHF", "USD", "GBP"];
/* ---------- Seite ---------- */
export default function SettingsPage() {
  const { confirm: confirmMsg, alert: alertMsg } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ansicht
  const [viewportMode, setViewportMode] = useState("mobile");
  const [colorMode, setColorMode] = useState("system");

  // Firmendaten
  const [companyName, setCompanyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [bankAccount, setBankAccount] = useState(""); // deprecated
  const [bankInstitution, setBankInstitution] = useState("");
  const [bankRecipient, setBankRecipient] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");

  // Steuerdaten (eigener Abschnitt)
  const [vatId, setVatId] = useState("");
  const [kleinunternehmer, setKleinunternehmer] = useState(true);
  const [taxRateDefault, setTaxRateDefault] = useState(19); // nur relevant, wenn NICHT KU

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");
  const [secondaryColor, setSecondaryColor] = useState("#0ea5e9");

  const samplePreview = useMemo(() => ({
    companyName, ownerName, address1, address2, postalCode, city, phone, email, website,
    bankAccount, bankInstitution, bankRecipient, bankIban, bankBic, vatId, kleinunternehmer, currency, logoUrl
  }), [companyName, ownerName, address1, address2, postalCode, city, phone, email, website, bankAccount, bankInstitution, bankRecipient, bankIban, bankBic, vatId, kleinunternehmer, currency, logoUrl]);

  useEffect(() => {
    setViewportMode(localStorage.getItem("viewportMode") || "mobile");
    setColorMode(localStorage.getItem("colorMode") || "system");

    (async () => {
      setLoading(true);
      const js = await fetch("/api/settings", { cache: "no-store" }).then(r => r.json()).catch(() => ({ ok:false }));
      const s = js?.data || {};

      // Firmendaten
      setCompanyName(s.companyName || "");
      setSlogan(s.slogan || "");
      setOwnerName(s.ownerName || "");
      setAddress1(s.address1 || "");
      setAddress2(s.address2 || "");
      setPostalCode(s.postalCode || "");
      setCity(s.city || "");
      setPhone(s.phone || "");
      setEmail(s.email || "");
      setWebsite(s.website || "");
      setBankAccount(s.bankAccount || "");
      setBankInstitution(s.bankInstitution || "");
      setBankRecipient(s.bankRecipient || "");
      setBankIban(s.bankIban || "");
      setBankBic(s.bankBic || "");
      setCurrency(s.currency || "EUR");

      // Steuerdaten
      setVatId(s.vatId || "");
      setKleinunternehmer(!!s.kleinunternehmer);
      setTaxRateDefault(Number.isFinite(Number(s.taxRateDefault)) ? Number(s.taxRateDefault) : 19);

      // Branding
      setLogoUrl(s.logoUrl || "");
      setPrimaryColor(s.primaryColor || "#06b6d4");
      setSecondaryColor(s.secondaryColor || "#0ea5e9");
      setLoading(false);

      // Live anwenden
      applyTheme({
        primaryColor: s.primaryColor || "#06b6d4",
        secondaryColor: s.secondaryColor || "#0ea5e9"
      });
    })();
  }, []);

  function applyTheme({ primaryColor, secondaryColor }) {
    const root = document.documentElement;
    if (primaryColor) root.style.setProperty("--color-primary", primaryColor);
    if (secondaryColor) root.style.setProperty("--color-secondary", secondaryColor);
  }

  function handleViewportChange(mode) {
    setViewportMode(mode);
    localStorage.setItem("viewportMode", mode);
    window.dispatchEvent(new Event("viewportChanged"));
  }

  function handleColorModeChange(mode) {
    setColorMode(mode);
    localStorage.setItem("colorMode", mode);
    window.dispatchEvent(new Event("themeChanged"));
  }

  async function onUploadLogo(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (logoUrl) {
      fd.append("oldUrl", logoUrl); // Send old URL to be deleted
    }
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const js = await res.json().catch(()=>({ ok:false }));
    if (!js?.ok || !js?.url) return await alertMsg(js?.error || "Upload fehlgeschlagen.");
    setLogoUrl(js.url);
  }

  async function save(e) {
    e?.preventDefault?.();
    setSaving(true);
    const payload = {
      // Firmendaten
      companyName, slogan, ownerName, address1, address2, postalCode, city, phone, email, website,
      currency, bankAccount, bankInstitution, bankRecipient, bankIban, bankBic,
      // Steuerdaten
      vatId, kleinunternehmer, taxRateDefault,
      // Branding
      logoUrl, primaryColor, secondaryColor
    };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(()=>({ ok:false }));
    setSaving(false);
    if (!js?.ok) return await alertMsg(js?.error || "Speichern fehlgeschlagen.");

    // Anwendung sofort aktualisieren
    applyTheme({ primaryColor, secondaryColor });
    await alertMsg("Einstellungen gespeichert.");
  }

  return (
    <main className="container">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 16, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Einstellungen</h1>
          <div className="subtle">Firmendaten, Steuern & Branding konfigurieren</div>
        </div>
        <div style={{ display:"flex", alignItems: "center" }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>

      {/* Ansicht (Mobile/Desktop) */}
      <section className="surface" style={{ marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Ansicht</h2>
        <div style={{ display:"grid", gap:24 }}>

          <Field label="Light / Dark Mode">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="colorMode"
                  value="system"
                  checked={colorMode === "system"}
                  onChange={() => handleColorModeChange("system")}
                />
                System
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="colorMode"
                  value="light"
                  checked={colorMode === "light"}
                  onChange={() => handleColorModeChange("light")}
                />
                Hell (Light)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="colorMode"
                  value="dark"
                  checked={colorMode === "dark"}
                  onChange={() => handleColorModeChange("dark")}
                />
                Dunkel (Dark)
              </label>
            </div>
          </Field>

          <Field label="Darstellung auf Mobilgeräten">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="viewportMode"
                  value="mobile"
                  checked={viewportMode === "mobile"}
                  onChange={() => handleViewportChange("mobile")}
                />
                Mobile Ansicht (Standard)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="viewportMode"
                  value="desktop"
                  checked={viewportMode === "desktop"}
                  onChange={() => handleViewportChange("desktop")}
                />
                Desktop Ansicht erzwingen
              </label>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.4 }}>
              <b>Hinweis:</b> Falls in Ihrem mobilen Browser die Funktion „Desktop-Website anfordern“ nativ aktiviert ist, lässt sich die Mobile Ansicht hierüber unter Umständen nicht erzwingen. Sie müssen diese Funktion dann zusätzlich im Browser-Menü deaktivieren.
            </div>
          </Field>
        </div>
      </section>

      {/* Firmendaten */}
      <section className="surface" style={{ marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Firmendaten</h2>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Firmenname"><input style={input} value={companyName} onChange={e=>setCompanyName(e.target.value)} /></Field>
          <Field label="Slogan (im Rechnungskopf)"><input style={input} value={slogan} onChange={e=>setSlogan(e.target.value)} /></Field>

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
        </div>
      </section>

      {/* Bankdaten */}
      <section className="surface" style={{ marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Bankdaten</h2>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Institut"><input style={input} value={bankInstitution} onChange={e=>setBankInstitution(e.target.value)} placeholder="z. B. Sparkasse Musterstadt" /></Field>
          <Field label="Empfänger"><input style={input} value={bankRecipient} onChange={e=>setBankRecipient(e.target.value)} placeholder="z. B. Max Mustermann" /></Field>
          <Field label="IBAN"><input style={input} value={bankIban} onChange={e=>setBankIban(e.target.value)} placeholder="DE..." /></Field>
          <Field label="BIC"><input style={input} value={bankBic} onChange={e=>setBankBic(e.target.value)} placeholder="XXXXXXXXXXX" /></Field>
        </div>
      </section>

      {/* Steuerdaten – eigener Abschnitt */}
      <section className="surface" style={{ marginTop:12 }}>
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
      <section className="surface" style={{ marginTop:12 }}>
        <h2 style={{ margin:"0 0 12px 0", fontSize:18 }}>Branding & Design</h2>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Logo">
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ width:72, height:72, objectFit:"contain", border:"1px solid var(--border)", borderRadius:10, background:"#fff" }}
                  onError={(e)=>{ e.currentTarget.style.display="none"; }}
                />
              ) : (
                <div style={{ width:72, height:72, border:"1px dashed var(--border)", borderRadius:10, display:"grid", placeItems:"center", color:"var(--muted)" }}>kein Logo</div>
              )}
              <input type="file" accept="image/*" onChange={e=>onUploadLogo(e.target.files?.[0])} />
              <input style={{ ...input, flex:"1 1 280px" }} value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="Logo‑URL (optional, falls kein Upload)" />
            </div>
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
        </div>

        {/* Live-Vorschau */}
        <div style={{ marginTop:16 }}>
          <h3 className="subtle" style={{ margin:"0 0 8px 0", fontSize:16 }}>Vorschau</h3>
          <BrandPreview settings={{ ...samplePreview, primaryColor, secondaryColor }} />
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? "Speichern…" : "Speichern"}</button>
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
    bankInstitution, bankRecipient, bankIban, bankBic,
    kleinunternehmer, currency, logoUrl, primaryColor, secondaryColor
  } = settings;

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "var(--shadow-1)",
      background: "var(--panel)"
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
        <div style={{ padding: 14, color: "var(--text)", background: "var(--panel)" }}>
        <div style={{ display:"grid", gap:4 }}>
          <div><b>Inhaber:</b> {ownerName || "—"}</div>
          <div><b>Adresse:</b> {address1 || "—"} {address2 ? `, ${address2}` : ""}</div>
          <div><b>PLZ/Ort:</b> {(postalCode || "—") + " " + (city || "")}</div>
          <div><b>Telefon:</b> {phone || "—"} · <b>E‑Mail:</b> {email || "—"}</div>
          {website ? <div><b>Web:</b> {website}</div> : null}
          <div><b>Währung:</b> {currency}</div>
          {(bankInstitution || bankRecipient || bankIban || bankBic) && (
             <div><b>Bankdaten:</b> Institut: {bankInstitution} | Empfänger: {bankRecipient} | IBAN: {bankIban} | BIC: {bankBic}</div>
          )}
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
