// app/components/AppointmentForm.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ===== Helpers ===== */
const pad2 = (n) => String(n).padStart(2, "0");
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d]=input.split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function minutesFromTime(val){
  const m = String(val ?? "").match(/^\s*(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const h  = Math.max(0, Math.min(23, parseInt(m[1],10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
  return h*60 + mm;
}
function timeFromMinutes(min){
  const m = Math.max(0, Math.min(23*60+59, min|0));
  const hh = Math.floor(m/60), mm = m%60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

/* ===== Zeit-Picker (Android-Style: zwei Scrollspalten) ===== */
function TimePickerField({
  label,
  value,
  onChange,
  minMinutes = null,   // z. B. Start+30 für Ende
  allowClear = false,  // Ende darf leer sein
  inputAriaLabel
}){
  const [open, setOpen] = useState(false);
  const hostRef = useRef(null);
  const vMin = typeof value === "string" && value ? minutesFromTime(value) : null;

  const hours = useMemo(()=>Array.from({length:24},(_,i)=>i),[]);
  const minutes5 = useMemo(()=>Array.from({length:12},(_,i)=>i*5),[]);

  const [tmpH, setTmpH] = useState(()=> (vMin!=null ? Math.floor(vMin/60) : 9));
  const [tmpM, setTmpM] = useState(()=> (vMin!=null ? (vMin%60) : 0));

  useEffect(()=>{
    function onDoc(e){
      if (!open) return;
      if (!hostRef.current) return;
      if (!hostRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive:true });
    return ()=>{
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  },[open]);

  useEffect(()=>{
    if (vMin!=null){ setTmpH(Math.floor(vMin/60)); setTmpM(vMin%60); }
  },[vMin]);

  function apply(){
    let mm = tmpH*60 + tmpM;
    if (typeof minMinutes === "number" && mm < minMinutes){
      mm = minMinutes;
    }
    onChange(timeFromMinutes(mm));
    setOpen(false);
  }
  function clearVal(){
    onChange("");
    setOpen(false);
  }

  const display = (value && /^\d{1,2}:\d{2}/.test(value)) ? value.slice(0,5) : "";

  // weiches Min nur zur Markierung
  const softMin = typeof minMinutes === "number" ? minMinutes : -1;

  return (
    <div className="field af-time-field" ref={hostRef}>
      <span className="label"> {label} </span>

      <button
        type="button"
        className="input af-time-display"
        aria-label={inputAriaLabel || label}
        onClick={()=>setOpen(v=>!v)}
      >
        <span className="af-time-text">{display || "—"}</span>
        <span className="af-time-ico" aria-hidden>🕒</span>
      </button>

      {open && (
        <div className="af-time-pop">
          <div className="af-wheels">
            <div className="af-wheel" role="listbox" aria-label="Stunden">
              {hours.map(h=>{
                const mm = h*60 + tmpM;
                const disabledSoft = softMin>=0 && mm < softMin;
                return (
                  <button
                    key={h}
                    type="button"
                    className={`af-opt ${tmpH===h?"is-active":""} ${disabledSoft?"is-soft-disabled":""}`}
                    onClick={()=>setTmpH(h)}
                  >{pad2(h)}</button>
                );
              })}
            </div>
            <div className="af-wheel" role="listbox" aria-label="Minuten">
              {minutes5.map(m=>{
                const mm = tmpH*60 + m;
                const disabledSoft = softMin>=0 && mm < softMin;
                return (
                  <button
                    key={m}
                    type="button"
                    className={`af-opt ${tmpM===m?"is-active":""} ${disabledSoft?"is-soft-disabled":""}`}
                    onClick={()=>setTmpM(m)}
                  >{pad2(m)}</button>
                );
              })}
            </div>
          </div>

          <div className="af-time-actions">
            {allowClear && (
              <button type="button" className="btn-ghost" onClick={clearVal}>Leeren</button>
            )}
            <div style={{flex:1}} />
            <button type="button" className="btn" onClick={apply}>OK</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .af-time-field{ position:relative; }
        .af-time-display{
          display:flex; align-items:center; justify-content:space-between;
          height: var(--af-field-h);
          padding: 0 12px; /* wie .input */
          cursor:pointer;
        }
        .af-time-text{ font-variant-numeric: tabular-nums; }
        .af-time-ico{ font-size:20px; opacity:.85; margin-left:8px; }
        .af-time-pop{
          position:absolute; z-index:20; top:100%; left:0; right:0;
          margin-top:8px; background:#fff; border:1px solid var(--color-border);
          border-radius:12px; box-shadow: var(--shadow-md); padding:10px;
          max-width:100%;
        }
        .af-wheels{
          display:grid; grid-template-columns: 1fr 1fr; gap:10px;
        }
        .af-wheel{
          max-height: 180px; overflow:auto; border:1px solid var(--color-border);
          border-radius:10px; padding:6px; background:#fafafa;
        }
        .af-opt{
          width:100%; text-align:center; padding:8px 6px; border-radius:8px;
          border:1px solid transparent; background:#fff; margin-bottom:6px;
          font-variant-numeric: tabular-nums;
        }
        .af-opt:last-child{ margin-bottom:0; }
        .af-opt.is-active{ border-color:#2563eb; background:#eff6ff; font-weight:700; }
        .af-opt.is-soft-disabled{ opacity:.45; }
        .af-time-actions{
          display:flex; align-items:center; gap:8px; margin-top:10px;
        }
      `}</style>
    </div>
  );
}

/* ===== Haupt-Form ===== */
export default function AppointmentForm({ initial = null, customers = [], onSaved, onCancel }){
  const isEdit = !!initial?.id;

  const [kind,setKind]=useState(initial?.kind || "appointment");
  const [title,setTitle]=useState(initial?.title || "");
  const [date,setDate]=useState(()=>{
    const d = initial?.date ? toDate(initial.date) : new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  });
  const [startAt,setStartAt]=useState(initial?.startAt?.slice(0,5) || "09:00");
  const [endAt,setEndAt]=useState(initial?.endAt?.slice(0,5) || "");
  const [customerId,setCustomerId]=useState(initial?.customerId || "");
  const [customerName,setCustomerName]=useState(initial?.customerName || "");
  const [status,setStatus]=useState(initial?.status || "open");
  const [note,setNote]=useState(initial?.note || "");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    const found = customers.find(c=>String(c.id)===String(customerId));
    if (found) setCustomerName(found.name);
  },[customerId, customers]);

  const endMin = useMemo(()=> minutesFromTime(startAt) + 30, [startAt]);

  async function submit(e){
    e.preventDefault();
    if (!title.trim()){ alert("Bezeichnung ist erforderlich."); return; }
    let finalEnd = endAt;
    if (finalEnd){
      const mEnd = minutesFromTime(finalEnd);
      if (mEnd < endMin) finalEnd = timeFromMinutes(endMin);
    }
    setSaving(true);
    try{
      const payload = {
        kind, title, date,
        startAt: startAt || "00:00",
        endAt: finalEnd || null,
        customerId: customerId || null,
        customerName: customerName || null,
        status, note
      };
      const url = isEdit ? `/api/appointments/${initial.id}` : `/api/appointments`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload)
      });
      if(!r.ok) throw new Error(await r.text().catch(()=> "save_failed"));
      await r.json().catch(()=> ({}));
      onSaved?.();
    }catch(err){
      console.error(err);
      alert("Speichern fehlgeschlagen.");
    }finally{
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="form af-form">
      <div className="af-wrap">
        {/* Zeile 1: Art | Datum (gleich breit, Text vertikal mittig) */}
        <div className="af-row2">
          <label className="field">
            <span className="label">Art</span>
            <select className="select af-control" value={kind} onChange={e=>setKind(e.target.value)}>
              <option value="appointment">Termin</option>
              <option value="order">Auftrag</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Datum</span>
            <input className="input af-control" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </label>
        </div>

        {/* Zeile 2: Bezeichnung – gleiche Breite & Höhe wie Zeile 4 */}
        <label className="field">
          <span className="label">Bezeichnung *</span>
          <input className="input af-control" value={title} onChange={e=>setTitle(e.target.value)} required />
        </label>

        {/* Zeile 3: Start | Ende | Status – gleich hoch; Status-Text mittig */}
        <div className="af-row3">
          <TimePickerField
            label="Start"
            value={startAt}
            onChange={(t)=>{
              setStartAt(t);
              if (endAt && minutesFromTime(endAt) < minutesFromTime(t)+30){
                setEndAt(timeFromMinutes(minutesFromTime(t)+30));
              }
            }}
            inputAriaLabel="Startzeit wählen"
          />
          <TimePickerField
            label="Ende (optional)"
            value={endAt}
            onChange={setEndAt}
            minMinutes={endMin}
            allowClear
            inputAriaLabel="Endzeit wählen"
          />
          <label className="field">
            <span className="label">Status</span>
            <select className="select af-control" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="open">offen</option>
              <option value="cancelled">abgesagt</option>
              <option value="done">abgeschlossen</option>
            </select>
          </label>
        </div>

        {/* Zeile 4: Kunde – Referenzbreite/Höhe */}
        <label className="field">
          <span className="label">Kunde (optional)</span>
          <select className="select af-control" value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        {/* Zeile 5: Notiz – gleiche Breite wie Kunde/Bezeichnung, höhere Textarea */}
        <label className="field">
          <span className="label">Notiz (optional)</span>
          <textarea className="textarea af-textarea" rows={5} value={note} onChange={e=>setNote(e.target.value)} />
        </label>

        <div className="af-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Abbrechen</button>
          <button type="submit" className="btn" disabled={saving}>{saving?"Speichert…":"Speichern"}</button>
        </div>
      </div>

      {/* Strenges, bündiges, mobiles Styling */}
      <style jsx>{`
        .af-form{
          --af-field-h: 44px;       /* einheitliche Feldhöhe (außer Textarea) */
        }

        .af-wrap{
          width: 100%;
          max-width: 560px;         /* kompakter als zuvor → passt sicher ins Modal */
          margin: 0 auto;
          box-sizing: border-box;
        }
        .af-wrap *{ box-sizing: border-box; } /* verhindert Überbreite */

        /* Rasterbreiten – alle Zeilen hängen an derselben Wrap-Breite */
        .af-row2{
          display:grid;
          grid-template-columns: 1fr 1fr; /* exakt gleich breit */
          gap:12px;
          align-items:start;
        }
        .af-row3{
          display:grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap:12px;
          align-items:start;
        }

        /* Einheitliche Kontrolle für Inputs & Selects: gleiche Höhe, zentrierter Text */
        .af-control{
          height: var(--af-field-h);
          padding: 0 12px;         /* vertikale Mitte */
          line-height: normal;     /* Browser-Default, verhindert ungleiche Zentrierung */
          width: 100%;
        }

        /* input[type="date"] auf gleiche optische Höhe bringen */
        :global(.af-form) input[type="date"].af-control{
          -webkit-appearance: none;
          appearance: none;
          padding: 0 12px;
        }

        /* Zeit-Button (TimePicker) – gleiche Höhe wie af-control */
        :global(.af-form) .af-time-display{
          height: var(--af-field-h);
          padding: 0 12px;
        }

        /* Selects: sichere vertikale Zentrierung via Padding */
        :global(.af-form) .select.af-control{
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-position: right 10px center; /* native Pfeile */
        }

        /* Textarea: volle Breite, automatisch höher */
        .af-textarea{
          width: 100%;
          max-width: 100%;
          resize: vertical;
        }

        .af-actions{
          display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; margin-top: 4px;
        }

        /* Kleinstgeräte: volle Breite ohne horizontales Scrollen */
        @media (max-width: 380px){
          .af-wrap{ max-width: 100%; padding: 0 4px; }
        }
      `}</style>
    </form>
  );
}
