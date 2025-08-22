import React, { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeProvider";

type Patch = Partial<{
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  headerTitle: string;
  companyName: string;
  currency: string;
}>;

export default function SettingsPage() {
  const { settings, refresh } = useTheme();
  const [model, setModel] = useState<Patch>({});

  useEffect(() => {
    if (settings) {
      setModel({
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
        borderRadius: settings.borderRadius,
        fontFamily: settings.fontFamily,
        headerTitle: settings.headerTitle,
        companyName: settings.companyName,
        currency: settings.currency || settings.currencyDefault
      });
    }
  }, [settings]);

  const save = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model)
    });
    await refresh();
    alert("Einstellungen gespeichert.");
  };

  return (
    <div className="card">
      <div className="card__header" style={{ justifyContent: "space-between" }}>
        <div className="card__title">Einstellungen</div>
        <button className="btn btn--primary" onClick={save}>Speichern</button>
      </div>
      <div className="card__content">
        <div className="form-grid">
          <div className="form-col-6">
            <label className="label">Header‑Titel</label>
            <input className="input" value={model.headerTitle || ""} onChange={e => setModel({ ...model, headerTitle: e.target.value })}/>
          </div>
          <div className="form-col-6">
            <label className="label">Unternehmensname</label>
            <input className="input" value={model.companyName || ""} onChange={e => setModel({ ...model, companyName: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Primärfarbe</label>
            <input className="input" value={model.primaryColor || ""} onChange={e => setModel({ ...model, primaryColor: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Sekundärfarbe</label>
            <input className="input" value={model.secondaryColor || ""} onChange={e => setModel({ ...model, secondaryColor: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Akzentfarbe</label>
            <input className="input" value={model.accentColor || ""} onChange={e => setModel({ ...model, accentColor: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Textfarbe</label>
            <input className="input" value={model.textColor || ""} onChange={e => setModel({ ...model, textColor: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Hintergrund</label>
            <input className="input" value={model.backgroundColor || ""} onChange={e => setModel({ ...model, backgroundColor: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Radius</label>
            <input className="input" type="number" value={Number(model.borderRadius ?? 12)} onChange={e => setModel({ ...model, borderRadius: Number(e.target.value) })}/>
          </div>
          <div className="form-col-6">
            <label className="label">Schriftfamilie</label>
            <input className="input" value={model.fontFamily || ""} onChange={e => setModel({ ...model, fontFamily: e.target.value })}/>
          </div>
          <div className="form-col-3">
            <label className="label">Währung</label>
            <input className="input" value={model.currency || ""} onChange={e => setModel({ ...model, currency: e.target.value })}/>
          </div>
        </div>
      </div>
    </div>
  );
}
