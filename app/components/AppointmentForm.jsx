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

  const hhmm = useMemo(()=>Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,"0")}:${i%2? "30":"00"}`),[]);

  async function submit(e){
    e.preventDefault();
    if (!title.trim()){ alert("Bezeichnung ist erforderlich."); return; }
    setSaving(true);
    try{
      const payload = {
        kind, title, date,
        startAt: startAt || "00:00",
        endAt: endAt?.trim() ? endAt : null,
        customerId: customerId || null,
        customerName: customerName || null,
        status, note
      };
      const url = isEdit ? `/api/appointments/${initial.id}` : `/api/appointments`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      if(!r.ok){
        // Server-Detail ausgeben (hilft bei 500ern)
        const txt = await r.text().catch(()=> "");
        throw new Error(txt || `HTTP ${r.status}`);
      }
      await r.json().catch(()=> ({}));
      onSaved?.();
    }catch(err){
      console.error(err);
      alert("Speichern fehlgeschlagen.\n\n" + (err?.message || err));
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

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <label className="field">
            <span className="label">Start</span>
            <select className="select" value={startAt} onChange={e=>setStartAt(e.target.value)}>
              {hhmm.map(t=> <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Ende (optional)</span>
            <select className="select" value={endAt} onChange={e=>setEndAt(e.target.value)}>
              <option value="">—</option>
              {hhmm.map(t=> <option key={t} value={t}>{t}</option>)}
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
