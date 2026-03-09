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
    if (found) {
      setCustomerName(found.name);
      if (!title.trim()) {
        setTitle(found.name);
      }
    } else {
      setCustomerName("");
    }
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
        {/* Zeile 1: Art | Datum */}
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

        {/* Zeile 2: Bezeichnung */}
        <label className="field">
          <span className="label">Bezeichnung {!customerId && "*"}</span>
          <input className="input af-control" value={title} onChange={e=>setTitle(e.target.value)} required={!customerId} />
        </label>

        {/* Zeile 3: Start | Ende | Status */}
        <div className="af-row3">
          <label className="field">
            <span className="label">Start</span>
            <input
              type="time"
              className="input af-control"
              value={startAt}
              onChange={(e) => {
                const t = e.target.value;
                setStartAt(t);
                if (endAt && minutesFromTime(endAt) < minutesFromTime(t) + 30) {
                  setEndAt(timeFromMinutes(minutesFromTime(t) + 30));
                }
              }}
            />
          </label>
          <label className="field">
            <span className="label">Ende (optional)</span>
            <input
              type="time"
              className="input af-control"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              min={typeof endMin === "number" ? timeFromMinutes(endMin).slice(0,5) : undefined}
            />
          </label>
          <label className="field">
            <span className="label">Status</span>
            <select className="select af-control" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="open">offen</option>
              <option value="cancelled">abgesagt</option>
              <option value="done">abgeschlossen</option>
            </select>
          </label>
        </div>

        {/* Zeile 4: Kunde */}
        <label className="field">
          <span className="label">Kunde (optional)</span>
          <select className="select af-control" value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        {/* Zeile 5: Notiz */}
        <label className="field">
          <span className="label">Notiz (optional)</span>
          <textarea className="textarea af-textarea" rows={5} value={note} onChange={e=>setNote(e.target.value)} />
        </label>

        <div className="af-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Abbrechen</button>
          <button type="submit" className="btn" disabled={saving}>{saving?"Speichert…":"Speichern"}</button>
        </div>
      </div>

      {/* Strenges, bündiges, mobiles Styling + manuelle Breite der Zeitfelder */}
      <style jsx>{`
        .af-form{
          --af-field-h: 44px;      /* einheitliche Feldhöhe (außer Textarea) */
          --time-col-w: 130px;     /* <<< Breite der Zeit-Felder */
        }

        .af-wrap{
          width: 100%;
          max-width: 360px;        /* kompakt fürs Modal */
          margin: 0 auto;
          box-sizing: border-box;
        }
        .af-wrap *{ box-sizing: border-box; }

        .af-row2{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:12px;
          align-items:start;
        }

        /* Drei Spalten: Zeit | Zeit | Status */
        .af-row3{
          display:grid;
          grid-template-columns: var(--time-col-w) var(--time-col-w) 1fr;
          gap:12px;
          align-items:start;
          min-width: 0;
        }

        /* Einheitliche Controls */
        .af-control{
          height: var(--af-field-h);
          padding: 0 12px;
          line-height: normal;
          width: 100%;
        }

        .af-textarea{
          width: 100%;
          max-width: 100%;
          resize: vertical;
        }

        .af-actions{
          display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; margin-top: 4px;
        }

        /* Mobile: Felder untereinander anordnen */
        @media (max-width: 480px){
          .af-row2 {
            grid-template-columns: 1fr;
          }
          .af-row3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}
