// app/components/AppointmentForm.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

export default function AppointmentForm({ initial = null, customers = [], onSaved, onCancel }){
  const isEdit = !!initial?.id;

  const [kind,setKind]=useState(initial?.kind || "appointment");
  const [title,setTitle]=useState(initial?.title || "");
  const [date,setDate]=useState(()=>{
    if (initial?.date) {
      const d = toDate(initial.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
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

  // 30-Minuten Raster (wie zuvor)
  const hhmm = useMemo(()=>Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,"0")}:${i%2? "30":"00"}`),[]);
  // Ende erst ab Start+30min auswählbar, leere Option bleibt erlaubt
  const endOptions = useMemo(()=>{
    const s = minutesFromTime(startAt);
    return ["", ...hhmm.filter(t => minutesFromTime(t) >= s + 30)];
  },[hhmm, startAt]);

  async function submit(e){
    e.preventDefault();
    if (!title.trim()){ alert("Bezeichnung ist erforderlich."); return; }
    setSaving(true);
    try{
      const payload = {
        kind, title, date,
        startAt: startAt || "00:00",
        endAt: endAt || null,
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
      {/* Oberes 2er-Grid: Art | Datum (gleich breit & schmaler) */}
      <div className="af-grid-2">
        <label className="field">
          <span className="label">Art</span>
          <select className="select" value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="appointment">Termin</option>
            <option value="order">Auftrag</option>
          </select>
        </label>

        <label className="field">
          <span className="label">Datum</span>
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
      </div>

      {/* Bezeichnung – exakt so breit wie (Art..Datum) zusammen */}
      <label className="field af-span-2">
        <span className="label">Bezeichnung *</span>
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} required />
      </label>

      {/* Start | Ende | Status – drei gleich hohe, schmalere Felder; bündig unter Bezeichnung */}
      <div className="af-grid-3 af-span-2">
        <label className="field af-time-wrap">
          <span className="label">Start</span>
          <span className="af-time-ico" aria-hidden>🕒</span>
          <select
            className="select af-time-input"
            value={startAt}
            onChange={e=>{
              const v = e.target.value;
              setStartAt(v);
              // Ende zurücksetzen, falls nun ungültig
              if (endAt && minutesFromTime(endAt) < minutesFromTime(v)+30) setEndAt("");
            }}
          >
            {hhmm.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="field af-time-wrap">
          <span className="label">Ende (optional)</span>
          <span className="af-time-ico" aria-hidden>🕒</span>
          <select
            className="select af-time-input"
            value={endAt ?? ""}
            onChange={e=>setEndAt(e.target.value)}
          >
            {endOptions.map(t => (
              <option key={t || "-"} value={t}>{t || "—"}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Status</span>
          <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="open">offen</option>
            <option value="cancelled">abgesagt</option>
            <option value="done">abgeschlossen</option>
          </select>
        </label>
      </div>

      {/* Kunde – volle Breite wie Bezeichnung */}
      <label className="field af-span-2">
        <span className="label">Kunde (optional)</span>
        <select className="select" value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
          <option value="">—</option>
          {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {/* Notizen – volle Breite wie Bezeichnung */}
      <label className="field af-span-2">
        <span className="label">Notiz (optional)</span>
        <textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)} />
      </label>

      <div className="af-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Abbrechen</button>
        <button type="submit" className="btn" disabled={saving}>{saving?"Speichert…":"Speichern"}</button>
      </div>

      {/* Kompaktes, responsives Styling nur für dieses Formular */}
      <style jsx>{`
        .af-form{ gap: 14px; }

        /* Oberes Raster: 2 Spalten, mobil & desktop gleichmäßig */
        .af-grid-2{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:12px;
          align-items: start;
        }

        /* Bezeichnung/Kunde/Notiz sollen genau die Breite von (Art..Datum) einnehmen */
        .af-span-2{
          display: block;
        }

        /* Drei schmale Felder bündig unter Bezeichnung */
        .af-grid-3{
          display:grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap:12px;
          align-items: start;
        }

        /* Uhr-Icon in den Zeit-Feldern (größer) */
        .af-time-wrap{ position: relative; }
        .af-time-ico{
          position:absolute; right:10px; top:50%; transform: translateY(-6px);
          font-size: 18px; opacity: .75; pointer-events: none;
        }
        .af-time-input{
          padding-right: 32px; /* Platz fürs Icon */
          height: 40px;       /* gleiche Höhe für alle drei Felder */
        }

        .af-actions{
          display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; margin-top: 4px;
        }

        /* Mobile Feinschliff: etwas größere Touch-Ziele */
        @media (max-width: 480px){
          .af-time-input{ height: 44px; }
        }
      `}</style>
    </form>
  );
}

/* helpers (wie in deiner bestehenden Datei belassen) */
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
