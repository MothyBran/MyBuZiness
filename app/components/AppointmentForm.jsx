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
    const t = initial?.date ? toDate(initial.date) : new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  });

  // --- Zeit als getrennte H/M-Selects (5-Minuten-Schritte) ------------------
  const startInit = (initial?.startAt?.slice(0,5)) || "09:00";
  const [startHour,setStartHour] = useState(parseInt(startInit.split(":")[0]||"9",10));
  const [startMin,setStartMin]   = useState(parseInt(startInit.split(":")[1]||"0",10));

  const endInit = (initial?.endAt?.slice(0,5)) || "";
  const [endHour,setEndHour] = useState(endInit ? parseInt(endInit.split(":")[0],10) : null);
  const [endMin,setEndMin]   = useState(endInit ? parseInt(endInit.split(":")[1],10) : null);

  const [customerId,setCustomerId]=useState(initial?.customerId || "");
  const [customerName,setCustomerName]=useState(initial?.customerName || "");
  const [status,setStatus]=useState(initial?.status || "open");
  const [note,setNote]=useState(initial?.note || "");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    const found = customers.find(c=>String(c.id)===String(customerId));
    if (found) setCustomerName(found.name);
  },[customerId, customers]);

  const hours = useMemo(()=>Array.from({length:24}, (_,h)=>h),[]);
  const minutes5 = useMemo(()=>Array.from({length:12},(_,i)=>i*5),[]);

  function pad2(n){ return String(n).padStart(2,"0"); }
  function toHM(h, m){ return `${pad2(h)}:${pad2(m)}`; }
  function mins(h, m){ return h*60 + m; }
  function next5(n){ return Math.ceil(n/5)*5; }

  // Ende muss mind. 30 Minuten nach Start sein
  const minEndTotal = useMemo(()=> mins(startHour, startMin) + 30, [startHour, startMin]);

  // Wenn Start geändert wurde und Ende zu früh ist -> Ende anpassen
  useEffect(()=>{
    const curEnd = (endHour==null || endMin==null) ? null : mins(endHour, endMin);
    if (curEnd==null || curEnd < minEndTotal) {
      const hh = Math.floor(minEndTotal/60);
      const mm = next5(minEndTotal % 60);
      const adjH = (mm>=60) ? (hh+1) : hh;
      const adjM = (mm>=60) ? 0 : mm;
      setEndHour(adjH>23 ? 23 : adjH);
      setEndMin(adjH>23 ? 55 : adjM);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minEndTotal]);

  // Disable-Logik für „Ende“-Optionen
  function endDisabled(h, m){
    return mins(h, m) < minEndTotal;
  }

  async function submit(e){
    e.preventDefault();
    if (!title.trim()){ alert("Bezeichnung ist erforderlich."); return; }

    const startAt = toHM(startHour, startMin);
    const endAt   = (endHour==null || endMin==null) ? null : toHM(endHour, endMin);

    setSaving(true);
    try{
      const payload = {
        kind, title, date,
        startAt,
        endAt,
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
    <form onSubmit={submit} className="form">
      <div className="grid-gap-16" style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
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

        <label className="field">
          <span className="label">Bezeichnung *</span>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} required />
        </label>

        {/* Zeitfelder – getrennte H/M-Selects */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div className="field">
            <span className="label">Start</span>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <select className="select" value={startHour} onChange={e=>setStartHour(parseInt(e.target.value,10))}>
                {hours.map(h=><option key={h} value={h}>{pad2(h)} Std</option>)}
              </select>
              <select className="select" value={startMin} onChange={e=>setStartMin(parseInt(e.target.value,10))}>
                {minutes5.map(m=><option key={m} value={m}>{pad2(m)} Min</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <span className="label">Ende (≥ +30 Min)</span>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <select
                className="select"
                value={endHour ?? ""}
                onChange={e=>setEndHour(e.target.value==="" ? null : parseInt(e.target.value,10))}
              >
                {hours.map(h=>{
                  const disabledAll = minutes5.every(m => endDisabled(h,m));
                  return (
                    <option key={h} value={h} disabled={disabledAll}>{pad2(h)} Std</option>
                  );
                })}
              </select>
              <select
                className="select"
                value={endMin ?? ""}
                onChange={e=>setEndMin(e.target.value==="" ? null : parseInt(e.target.value,10))}
              >
                {minutes5.map(m=>{
                  const h = (endHour==null) ? startHour : endHour;
                  const disabled = endHour==null ? true : endDisabled(h,m);
                  return (
                    <option key={m} value={m} disabled={disabled}>{pad2(m)} Min</option>
                  );
                })}
              </select>
            </div>
          </div>

          <label className="field">
            <span className="label">Status</span>
            <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="open">offen</option>
              <option value="cancelled">abgesagt</option>
              <option value="done">abgeschlossen</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span className="label">Kunde (optional)</span>
          <select className="select" value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="field">
          <span className="label">Notiz (optional)</span>
          <textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)} />
        </label>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button type="button" className="btn-ghost" onClick={onCancel}>Abbrechen</button>
          <button type="submit" className="btn" disabled={saving}>{saving?"Speichert…":"Speichern"}</button>
        </div>
      </div>
    </form>
  );
}

/* helpers */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d]=input.split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
