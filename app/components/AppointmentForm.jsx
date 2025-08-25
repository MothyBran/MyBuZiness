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

/* ===== Zeit-Picker – Native Eingabe + Icon öffnet Picker; Fallback = Wheel ===== */
function TimePickerField({
  label,
  value,
  onChange,
  minMinutes = null,   // z. B. Start+30 für Ende
  allowClear = false,  // Ende darf leer sein
  inputAriaLabel
}){
  const inputRef = useRef(null);

  // Fallback-Wheel (dein bestehendes Look & Feel)
  const [openWheel, setOpenWheel] = useState(false);
  const hours    = useMemo(()=>Array.from({length:24},(_,i)=>i),[]);
  const minutes5 = useMemo(()=>Array.from({length:12},(_,i)=>i*5),[]);
  const OPT_H = 36;            // muss zu CSS --opt-h passen
  const hRef = useRef(null);
  const mRef = useRef(null);
  const snapTimer = useRef(null);

  const vMin = typeof value === "string" && value ? minutesFromTime(value) : null;
  const [tmpH, setTmpH] = useState(()=> (vMin!=null ? Math.floor(vMin/60) : 9));
  const [tmpM, setTmpM] = useState(()=> (vMin!=null ? Math.round((vMin%60)/5)*5 : 0));

  useEffect(()=>{
    if (vMin!=null){
      setTmpH(Math.floor(vMin/60));
      setTmpM(Math.round((vMin%60)/5)*5);
    }
  },[vMin]);

  function openPicker(){
    const el = inputRef.current;
    if (el && typeof el.showPicker === "function") {
      // Chromium/Safari: nativen Picker anzeigen (wie beim Datum)
      el.showPicker();
    } else {
      // Firefox/ältere Browser: Fallback auf Wheel
      setOpenWheel(true);
    }
  }

  // min-Attribut für native Eingabe
  const minAttr = typeof minMinutes === "number"
    ? timeFromMinutes(minMinutes).slice(0,5)
    : undefined;

  // Bei manueller Eingabe ggf. an min anpassen (wie Date-Validierung)
  function onBlurClamp(){
    if (typeof minMinutes !== "number") return;
    const val = (inputRef.current?.value || "");
    if (!/^\d{1,2}:\d{2}/.test(val)) return;
    if (minutesFromTime(val) < minMinutes){
      const t = timeFromMinutes(minMinutes).slice(0,5);
      onChange(t);
      if (inputRef.current) inputRef.current.value = t;
    }
  }

  // ===== Wheel-Helpers (Fallback)
  function centerTo(el, index){
    if(!el) return;
    const target = index * OPT_H - (el.clientHeight/2 - OPT_H/2);
    el.scrollTo({ top: Math.max(0, target) });
  }
  function snapToIndex(el, index){
    if (!el) return;
    const visible = Math.max(1, Math.round(el.clientHeight / OPT_H));
    const slot    = (visible % 2 === 1) ? Math.ceil(visible/2) : (visible/2); // Mitte oder #2 bei 4 Slots
    const top     = index*OPT_H - OPT_H*(slot-1);
    el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  function handleWheelScroll(which){
    return (e)=>{
      clearTimeout(snapTimer.current);
      const el = e.currentTarget;
      snapTimer.current = setTimeout(()=>{
        const visible = Math.max(1, Math.round(el.clientHeight / OPT_H));
        const slot     = (visible % 2 === 1) ? Math.ceil(visible/2) : (visible/2);
        const currentTop = el.scrollTop;
        const approxIdx  = Math.round((currentTop + OPT_H*(slot-1)) / OPT_H);
        const maxIdx     = (which==='h') ? 23 : 11;
        const idx        = Math.max(0, Math.min(maxIdx, approxIdx));
        const targetTop  = idx*OPT_H - OPT_H*(slot-1);
        el.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        if (which==='h') setTmpH(idx); else setTmpM(idx*5);
      }, 80);
    };
  }

  useEffect(()=>{
    if(!openWheel) return;
    // beim Öffnen aktuelle Auswahl mittig in den Ziel-Slot scrollen
    centerTo(hRef.current, tmpH);
    centerTo(mRef.current, Math.round(tmpM/5));
    function onDoc(e){
      if (!e.target.closest?.('.af-time-pop')) setOpenWheel(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive:true });
    return ()=>{
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  },[openWheel, tmpH, tmpM]);

  function applyWheel(){
    // min beachten
    let mm = tmpH*60 + tmpM;
    if (typeof minMinutes === "number" && mm < minMinutes){
      mm = minMinutes;
    }
    const t = timeFromMinutes(mm).slice(0,5);
    onChange(t);
    if (inputRef.current) inputRef.current.value = t;
    setOpenWheel(false);
  }

  return (
    <label className="field af-time-native">
      <span className="label">{label}</span>

      <div className={`af-time-wrap ${openWheel ? "is-open" : ""}`}>
        {/* Native Eingabe wie beim Datum (manuell oder per Icon öffnen) */}
        <input
          ref={inputRef}
          type="time"
          className="input time-input af-time-input"
          step={300}                      // 5-Minuten-Raster
          value={value || ""}
          min={minAttr}
          onChange={(e)=> onChange(e.target.value)}
          onBlur={onBlurClamp}
          aria-label={inputAriaLabel || label}
        />

        {/* Uhr-Icon öffnet nativen Picker; Fallback = Wheel */}
        <button
          type="button"
          className="af-clock"
          aria-label="Uhrzeit auswählen"
          onClick={openPicker}
          title="Uhrzeit auswählen"
        >🕒</button>

        {allowClear && value && (
          <button
            type="button"
            className="af-clear"
            onClick={()=> onChange("")}
            aria-label="Zeit leeren"
            title="Zeit leeren"
          >
            ✕
          </button>
        )}

        {/* Fallback: dein kompaktes Wheel (nur wenn showPicker fehlt) */}
        {openWheel && (
          <div className="af-time-pop">
            <div className="af-wheels">
              <div
                className="af-wheel"
                ref={hRef}
                onScroll={handleWheelScroll('h')}
                role="listbox"
                aria-label="Stunden"
              >
                {hours.map(h=>(
                  <button
                    key={h}
                    type="button"
                    className={`af-opt ${tmpH===h?"is-active":""}`}
                    onClick={()=>{
                      setTmpH(h); snapToIndex(hRef.current, h);
                    }}
                  >{String(h).padStart(2,"0")}</button>
                ))}
              </div>

              <div
                className="af-wheel"
                ref={mRef}
                onScroll={handleWheelScroll('m')}
                role="listbox"
                aria-label="Minuten"
              >
                {minutes5.map(m=>(
                  <button
                    key={m}
                    type="button"
                    className={`af-opt ${tmpM===m?"is-active":""}`}
                    onClick={()=>{
                      setTmpM(m); snapToIndex(mRef.current, Math.round(m/5));
                    }}
                  >{String(m).padStart(2,"0")}</button>
                ))}
              </div>
            </div>

            {/* fixer Ziel-Slot-Rahmen (scrollt nicht mit) */}
            <div className="af-center-indicator" aria-hidden />

            <div className="af-time-actions">
              {allowClear && (
                <button type="button" className="btn-ghost" onClick={()=>setOpenWheel(false)}>Abbrechen</button>
              )}
              <div style={{flex:1}} />
              <button type="button" className="btn" onClick={applyWheel}>OK</button>
            </div>
          </div>
        )}
      </div>

      {/* Styles: bündig, native Höhensystematik; Fallback-Wheel wie gehabt */}
      <style jsx>{`
        .af-time-native { width: 100%; }
        .af-time-wrap { position: relative; display:block; }
        .af-time-wrap.is-open .af-time-input{
          border-color: transparent !important;
          box-shadow: none !important;
        }

        /* Native Eingabe – gleiche Höhe wie die anderen Felder */
        .af-time-input{
          height: var(--af-field-h);
          line-height: calc(var(--af-field-h) - 2px);
          padding: 0 72px 0 12px; /* Platz für Icon & Clear */
          width: 100%;
        }

        /* Uhr-Button rechts im Feld */
        .af-clock{
          position:absolute; top:50%; right:36px; transform: translateY(-50%);
          border:0; background:transparent; cursor:pointer;
          width: 28px; height: 28px; line-height: 28px; text-align:center;
          border-radius: 14px; font-size: 18px;
          color: #374151;
        }
        .af-clock:hover{ background: rgba(0,0,0,.06); }

        /* Clear-Button (optional) */
        .af-clear{
          position:absolute; top:50%; right:6px; transform: translateY(-50%);
          border:0; background:transparent; cursor:pointer;
          width: 24px; height: 24px; line-height: 24px; text-align:center;
          border-radius: 12px;
          color: #6b7280;
        }
        .af-clear:hover{ background: rgba(0,0,0,.06); }

        /* ==== Fallback-Wheel (nur wenn openWheel) ==== */
        .af-time-pop{
          position:absolute; z-index:30; top:100%; left:0; right:0;
          margin-top:8px; background:#fff; border:1px solid var(--color-border);
          border-radius:12px; box-shadow: var(--shadow-md); padding:10px;
          max-width:100%;
          --opt-h: 36px;
          --visible-slots: 4;             /* <— hier 4 oder 5 einstellbar */
          --wheel-h: calc(var(--opt-h) * var(--visible-slots));
        }
        .af-wheels{
          display:grid; grid-template-columns: 1fr 1fr; gap:10px;
          position: relative;
        }
        .af-wheel{
          position: relative;
          height: var(--wheel-h);
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          background:
            linear-gradient(#fafafa, rgba(250,250,250,0)) top,
            linear-gradient(rgba(250,250,250,0), #fafafa) bottom;
          background-size: 100% calc(var(--opt-h) * 1.2), 100% calc(var(--opt-h) * 1.2);
          background-repeat: no-repeat;
          background-attachment: local, local;
          border:1px solid var(--color-border);
          border-radius:10px;
          padding:6px;
          scrollbar-width: none;
          z-index: 1;
        }
        .af-wheel::-webkit-scrollbar{ width:0; height:0; }
        .af-center-indicator{
          position:absolute;
          left:10px; right:10px;
          top: calc(10px + (var(--wheel-h) / var(--visible-slots)) * (Math.ceil(var(--visible-slots)/2) - 1));
          height: var(--opt-h);
          border-top: 1px solid rgba(37,99,235,.35);
          border-bottom: 1px solid rgba(37,99,235,.35);
          pointer-events:none;
          z-index: 4;
        }
        .af-opt{
          height: var(--opt-h);
          line-height: var(--opt-h);
          scroll-snap-align: center;
          width:100%; text-align:center;
          border-radius:8px; border:1px solid transparent;
          background:#fff; margin:4px 0;
          font-variant-numeric: tabular-nums;
          transition: transform .12s ease, background .12s ease, border-color .12s ease;
        }
        .af-opt.is-active{
          border-color:#2563eb; background:#eff6ff; font-weight:700;
          transform: scale(1.03);
        }
        .af-time-actions{
          display:flex; align-items:center; gap:8px; margin-top:10px;
          position: relative; z-index: 2;
        }

        @media (max-width: 420px){
          .af-time-pop{ --opt-h: 34px; }
        }
      `}</style>
    </label>
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
