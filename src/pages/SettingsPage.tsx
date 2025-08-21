// src/pages/SettingsPage.tsx  (Theme & InfoStripe Konfiguration)
import React, { useEffect, useState } from "react";
import { updateSettings, getSettings } from "../utils/api";
import { Settings } from "../utils/types";
import { useTheme } from "../theme/ThemeProvider";

const ColorInput: React.FC<{label:string; value?:string|null; onChange:(v:string)=>void}> = ({label, value, onChange}) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" type="text" placeholder="#RRGGBB" value={value || ""} onChange={(e)=>onChange(e.target.value)} />
  </div>
);

export default function SettingsPage() {
  const { reload } = useTheme();
  const [model, setModel] = useState<Partial<Settings>>({});
  const [busy, setBusy] = useState(false);

  useEffect(()=>{ getSettings().then(setModel); }, []);

  const save = async () => {
    setBusy(true);
    try {
      await updateSettings(model);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const bind = <K extends keyof Settings>(k:K) => ({
    value: model[k] as any || "",
    onChange: (v: any) => setModel(m => ({...m, [k]: v.target ? v.target.value : v }))
  });

  return (
    <div className="grid" style={{gap:16}}>
      <div className="card">
        <div className="card__header"><div className="card__title">Branding</div></div>
        <div className="card__content grid" style={{gridTemplateColumns:"repeat(2, 1fr)", gap:16}}>
          <div>
            <label className="label">Firmenname (companyName)</label>
            <input className="input" {...bind("companyName")} />
          </div>
          <div>
            <label className="label">Header‑Titel (headerTitle)</label>
            <input className="input" {...bind("headerTitle")} />
          </div>
          <div>
            <label className="label">Inhaber (ownerName)</label>
            <input className="input" {...bind("ownerName")} />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" {...bind("website")} />
          </div>
          <div>
            <label className="label">Logo‑URL (optional)</label>
            <input className="input" {...bind("logoUrl")} />
          </div>
          <div>
            <label className="label">Logo anzeigen?</label>
            <select className="input" value={String(model.showLogo ?? "")} onChange={e=>setModel(m=>({...m, showLogo: e.target.value === "true"}))}>
              <option value="">—</option>
              <option value="true">Ja</option>
              <option value="false">Nein</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header"><div className="card__title">Theme</div></div>
        <div className="card__content grid" style={{gridTemplateColumns:"repeat(2, 1fr)", gap:16}}>
          <ColorInput label="Primärfarbe" value={model.primaryColor || ""} onChange={v=>setModel(m=>({...m, primaryColor:v}))} />
          <ColorInput label="Sekundärfarbe" value={model.secondaryColor || ""} onChange={v=>setModel(m=>({...m, secondaryColor:v}))} />
          <ColorInput label="Akzentfarbe" value={model.accentColor || ""} onChange={v=>setModel(m=>({...m, accentColor:v}))} />
          <ColorInput label="Hintergrund" value={model.backgroundColor || ""} onChange={v=>setModel(m=>({...m, backgroundColor:v}))} />
          <ColorInput label="Textfarbe" value={model.textColor || ""} onChange={v=>setModel(m=>({...m, textColor:v}))} />
          <div>
            <label className="label">Schriftfamilie</label>
            <input className="input" {...bind("fontFamily")} placeholder="Inter, system-ui, …" />
          </div>
          <div>
            <label className="label">Eckenradius (px)</label>
            <input className="input" type="number" value={Number(model.borderRadius ?? 16)} onChange={e=>setModel(m=>({...m, borderRadius: Number(e.target.value)}))} />
          </div>
          <div>
            <label className="label">Standard‑Währung</label>
            <input className="input" {...bind("currency")} placeholder="EUR" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header"><div className="card__title">InfoStripe & Finanzdaten</div></div>
        <div className="card__content grid" style={{gridTemplateColumns:"repeat(2, 1fr)", gap:16}}>
          <div><label className="label">Ort (city)</label><input className="input" {...bind("city")} /></div>
          <div><label className="label">Telefon</label><input className="input" {...bind("phone")} /></div>
          <div><label className="label">E‑Mail</label><input className="input" {...bind("email")} /></div>
          <div><label className="label">IBAN</label><input className="input" {...bind("iban")} /></div>
          <div><label className="label">USt‑ID</label><input className="input" {...bind("vatId")} /></div>
          <div><label className="label">Steuer‑Nr.</label><input className="input" {...bind("taxNumber")} /></div>
          <div><label className="label">Finanzamt</label><input className="input" {...bind("taxOffice")} /></div>
        </div>
      </div>

      <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}>
        <button className="btn btn--ghost" onClick={()=>window.location.reload()}>Abbrechen</button>
        <button className="btn btn--primary" onClick={save} disabled={busy}>{busy ? "Speichern…" : "Speichern"}</button>
      </div>
    </div>
  );
}
