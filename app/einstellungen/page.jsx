"use client";

import { useEffect, useState } from "react";

const wrap = { background:"#fff", border:"1px solid #eee", borderRadius:14, padding:16 };
const grid2 = { display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" };
const grid3 = { display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" };
const label = { display:"grid", gap:6 };
const cap = { fontSize:12, color:"#6b7280" };
const input = { padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, width:"100%" };
const btnPrimary = { padding:"10px 12px", borderRadius:8, background:"var(--color-primary,#0aa)", color:"#fff", border:"1px solid transparent", cursor:"pointer" };

const FONTS = [
  "Inter, system-ui, Arial",
  "System UI, -apple-system, Segoe UI",
  "Roboto, Arial, Helvetica",
  "Open Sans, Arial",
  "Poppins, Arial, Helvetica",
  "Nunito, Arial, Helvetica"
];

const CURRENCIES = ["EUR", "USD", "CHF", "GBP"];

export default function SettingsPage(){
  const [data,setData] = useState(null);
  const [saving,setSaving] = useState(false);

  async function load(){
    const res = await fetch("/api/settings", { cache:"no-store" });
    const js = await res.json().catch(()=>({}));
    setData(js?.data || {});
  }
  useEffect(()=>{ load(); },[]);

  function upd(p){ setData(prev => ({ ...prev, ...p })); }

  async function save(){
    setSaving(true);
    const res = await fetch("/api/settings", {
      method:"PUT",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(data)
    });
    const js = await res.json().catch(()=>({}));
    setSaving(false);
    if(!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    setData(js.data);
    alert("Einstellungen gespeichert.");
  }

  if(!data) return <main><div style={wrap}>Lade…</div></main>;

  return (
    <main>
      <h1>Einstellungen</h1>

      {/* Preview-Streifen oben */}
      <div style={{height:8, borderRadius:8, background:`linear-gradient(90deg, ${data.primaryColor||"#0aa"} 0%, ${data.secondaryColor||"#0e7490"} 100%)`, margin:"8px 0 16px"}} />

      <div style={{...wrap, display:"grid", gap:16}}>
        <section style={{display:"grid", gap:12}}>
          <h3 style={{margin:"4px 0"}}>Firmendaten</h3>
          <div style={grid2}>
            <Field label="Firmenname"><input style={input} value={data.companyName||""} onChange={e=>upd({companyName:e.target.value})} /></Field>
            <Field label="Inhaber"><input style={input} value={data.proprietor||""} onChange={e=>upd({proprietor:e.target.value})} /></Field>
          </div>
          <div style={grid2}>
            <Field label="Adresszeile 1"><input style={input} value={data.address1||""} onChange={e=>upd({address1:e.target.value})} /></Field>
            <Field label="Adresszeile 2 (optional)"><input style={input} value={data.address2||""} onChange={e=>upd({address2:e.target.value})} /></Field>
          </div>
          <div style={grid3}>
            <Field label="PLZ"><input style={input} value={data.postalCode||""} onChange={e=>upd({postalCode:e.target.value})} /></Field>
            <Field label="Ort"><input style={input} value={data.city||""} onChange={e=>upd({city:e.target.value})} /></Field>
            <Field label="Telefon"><input style={input} value={data.phone||""} onChange={e=>upd({phone:e.target.value})} /></Field>
          </div>
          <div style={grid3}>
            <Field label="E-Mail"><input style={input} value={data.email||""} onChange={e=>upd({email:e.target.value})} /></Field>
            <Field label="Webseite (optional)"><input style={input} value={data.website||""} onChange={e=>upd({website:e.target.value})} /></Field>
            <Field label="USt-ID"><input style={input} value={data.vatId||""} onChange={e=>upd({vatId:e.target.value})} /></Field>
          </div>
          <Field label="Bankverbindung"><input style={input} value={data.bank||""} onChange={e=>upd({bank:e.target.value})} /></Field>
        </section>

        <section style={{display:"grid", gap:12}}>
          <h3 style={{margin:"4px 0"}}>Steuer & Währung</h3>
          <div style={grid2}>
            <Field label="Kleinunternehmer-Regelung § 19 UStG">
              <label style={{display:"flex", alignItems:"center", gap:10}}>
                <input type="checkbox" checked={!!data.kleinunternehmer} onChange={e=>upd({kleinunternehmer:e.target.checked})} />
                <span style={{fontSize:13, color:"#374151"}}>Wenn aktiv, werden Rechnungen/Belege ohne USt. erstellt.</span>
              </label>
            </Field>
            <Field label="Währung">
              <select style={input} value={data.currency||"EUR"} onChange={e=>upd({currency:e.target.value})}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section style={{display:"grid", gap:12}}>
          <h3 style={{margin:"4px 0"}}>Branding & Design</h3>
          <div style={grid3}>
            <Field label="Primärfarbe">
              <input type="color" style={{...input, padding:0, height:44}} value={data.primaryColor||"#0aa"} onChange={e=>upd({primaryColor:e.target.value})} />
            </Field>
            <Field label="Sekundärfarbe">
              <input type="color" style={{...input, padding:0, height:44}} value={data.secondaryColor||"#0e7490"} onChange={e=>upd({secondaryColor:e.target.value})} />
            </Field>
            <Field label="Schriftfarbe">
              <input type="color" style={{...input, padding:0, height:44}} value={data.fontColor||"#111827"} onChange={e=>upd({fontColor:e.target.value})} />
            </Field>
          </div>
          <div style={grid2}>
            <Field label="Schriftart">
              <select style={input} value={data.fontFamily||FONTS[0]} onChange={e=>upd({fontFamily:e.target.value})}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Logo-URL">
              <input style={input} value={data.logoUrl||""} onChange={e=>upd({logoUrl:e.target.value})} placeholder="https://…" />
            </Field>
          </div>
        </section>

        <div style={{display:"flex", justifyContent:"flex-end"}}>
          <button disabled={saving} onClick={save} style={btnPrimary}>{saving ? "Speichern…" : "Speichern"}</button>
        </div>
      </div>

      {/* Preview-Streifen unten (ohne Text) */}
      <div style={{height:8, borderRadius:8, background:`linear-gradient(90deg, ${data.primaryColor||"#0aa"} 0%, ${data.secondaryColor||"#0e7490"} 100%)`, margin:"16px 0 8px"}} />

      <style jsx global>{`
        :root {
          --color-primary: ${data.primaryColor || "#0aa"};
        }
        body { color: ${data.fontColor || "#111827"}; font-family: ${data.fontFamily || "Inter, system-ui, Arial"}; }
      `}</style>
    </main>
  );
}

function Field({ label, children }){
  return <label style={label}><span style={cap}>{label}</span>{children}</label>;
}
