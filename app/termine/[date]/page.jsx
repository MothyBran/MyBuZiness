// app/termine/[date]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { useRouter } from "next/navigation";

// 30-Minuten Raster 00:00..23:30
function times(){ const out=[]; for(let h=0;h<24;h++){ for(let m of [0,30]) out.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);} return out; }

export default function DayPage({ params }) {
  const router = useRouter();
  const date = params.date; // YYYY-MM-DD
  const [items,setItems]=useState([]);
  const [customers,setCustomers]=useState([]);

  // Modals
  const [openNew,setOpenNew]=useState(false);
  const [openEdit,setOpenEdit]=useState(false);
  const [editItem,setEditItem]=useState(null);

  // Load day items
  useEffect(()=>{ 
    fetch(`/api/appointments?date=${date}`)
      .then(r=>r.json())
      .then(setItems)
      .catch(()=>setItems([]));
  },[date]);

  // Load customers for dropdown
  useEffect(()=>{ 
    fetch(`/api/customers`)
      .then(r=>r.json())
      .then(rows=> setCustomers(rows?.map(c=>({ id: String(c.id??""), name: c.name || "" }))||[]) )
      .catch(()=>setCustomers([])); 
  },[]);

  const grouped = useMemo(()=>{
    const map = {}; 
    for(const t of items){ 
      const key = (t.startAt||"00:00").slice(0,5); 
      (map[key] ||= []).push(t); 
    }
    return map;
  },[items]);

  async function handleDelete(id, title){
    const ok = window.confirm(`Diesen Eintrag wirklich löschen?\n\n${title}`);
    if(!ok) return;
    const res = await fetch(`/api/appointments/${id}`, { method:"DELETE" });
    if(!res.ok){
      alert("Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="container" style={{display:"grid", gap:16}}>
      <div className="surface card">
        <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h2>Tagesansicht – {date}</h2>
            <Link href="/termine" className="btn" style={{marginTop:8}}>← Zurück zum Kalender</Link>
          </div>
          <button className="btn btn-primary" onClick={()=>setOpenNew(true)}>+ Neuer Eintrag</button>
        </div>

        <div className="day-grid">
          {times().map(t=>(
            <div key={t} className="slot">
              <div className="slot-time">{t}</div>
              <div className="slot-content">
                {(grouped[t]||[]).map(ev=>(
                  <div key={ev.id} className={`chip ${ev.kind==='order'?'chip-accent':'chip-info'}`} title={ev.title}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <b>{ev.kind==='order'?'Auftrag':'Termin'}</b>
                      <span>{ev.title}</span>
                      {ev.customerName && <span>· {ev.customerName}</span>}
                      <span style={{opacity:.7}}>· {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</span>

                      <div className="chip-actions">
                        <button
                          className="btn btn-xxs"
                          title="Bearbeiten"
                          onClick={()=>{ setEditItem(ev); setOpenEdit(true); }}
                        >⚙️ Bearbeiten</button>
                        <button
                          className="btn btn-xxs btn-danger"
                          title="Löschen"
                          onClick={()=>handleDelete(ev.id, ev.title)}
                        >❌ Löschen</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Neuer Eintrag */}
      <Modal open={openNew} onClose={()=>setOpenNew(false)} title="+ Neuer Eintrag">
        <NewEntryForm
          date={date}
          customers={customers}
          onDone={()=>{
            setOpenNew(false);
            router.refresh();
          }}
        />
      </Modal>

      {/* Modal: Eintrag bearbeiten */}
      <Modal open={openEdit} onClose={()=>setOpenEdit(false)} title="⚙️ Eintrag bearbeiten">
        {editItem && (
          <EditEntryForm
            initial={editItem}
            customers={customers}
            onDone={()=>{
              setOpenEdit(false);
              setEditItem(null);
              router.refresh();
            }}
          />
        )}
      </Modal>

      <style jsx>{`
        .day-grid{ display:grid; grid-template-columns: 1fr; gap:4px; }
        .slot{ display:grid; grid-template-columns: 80px 1fr; gap:8px; align-items:flex-start; }
        .slot-time{ opacity:.6; font-size:12px; padding-top:6px; }
        .slot-content{ display:flex; flex-direction:column; gap:6px; }
        .chip{ padding:8px 10px; border-radius: 12px; background:#e5e7eb; }
        .chip-info{ background: var(--chip-info, #DBEAFE); }
        .chip-accent{ background: var(--chip-accent, #FDE68A); }
        .chip-actions{ display:flex; gap:6px; margin-left:auto; }
        .btn-xxs{
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
          background: var(--surface, #fff);
          border: 1px solid rgba(0,0,0,.12);
        }
        .btn-xxs:hover{ background: #fafafa; }
        .btn-danger{ border-color: #ef4444; }
      `}</style>
    </div>
  );
}

function NewEntryForm({ date, customers, onDone }) {
  const [kind,setKind]=useState("appointment");
  const [title,setTitle]=useState("");
  const [startAt,setStartAt]=useState("09:00");
  const [endAt,setEndAt]=useState("");
  const [customerId,setCustomerId]=useState("");
  const [customerName,setCustomerName]=useState("");
  const [note,setNote]=useState("");

  useEffect(()=>{
    const found = customers.find(c=>String(c.id)===String(customerId));
    setCustomerName(found?.name || "");
  },[customerId, customers]);

  async function submit(e){
    e.preventDefault();
    const res = await fetch("/api/appointments",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        kind, title, date, startAt: startAt || "00:00", endAt: endAt || null,
        customerId: customerId || null, customerName: customerName || null, note
      })
    });
    if(!res.ok){ alert("Fehler beim Speichern"); return; }
    onDone?.();
  }

  const hhmm = Array.from({length:48}, (_,i)=>{
    const h = Math.floor(i/2), m = (i%2)*30;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  });

  return (
    <form onSubmit={submit} className="form">
      <div className="grid-2">
        <label>Art
          <select value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="appointment">Termin</option>
            <option value="order">Auftrag</option>
          </select>
        </label>
        <label>Datum
          <input type="date" defaultValue={date} />
        </label>
      </div>

      <label>Bezeichnung
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="z. B. Beratung, Installation..." required />
      </label>

      <div className="grid-3">
        <label>Uhrzeit (Start)
          <select value={startAt} onChange={e=>setStartAt(e.target.value)}>
            {hhmm.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Uhrzeit (Ende, optional)
          <select value={endAt} onChange={e=>setEndAt(e.target.value)}>
            <option value="">—</option>
            {hhmm.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Kunde (optional)
          <select value={customerId} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <label>Notiz (optional)
        <textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} />
      </label>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button type="button" className="btn" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-primary">Speichern</button>
      </div>

      <style jsx>{`
        .form{ display:grid; gap:12px; min-width: 320px; }
        .grid-2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        .grid-3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
        label{ display:grid; gap:6px; font-size:14px; }
        input, select, textarea{
          padding:8px; border-radius: var(--radius,8px); border:1px solid rgba(0,0,0,.15);
          background:var(--surface,#fff);
        }
      `}</style>
    </form>
  );
}

function EditEntryForm({ initial, customers, onDone }) {
  const [kind,setKind]=useState(initial.kind || "appointment");
  const [title,setTitle]=useState(initial.title || "");
  const [date,setDate]=useState(initial.date); // darf geändert werden
  const [startAt,setStartAt]=useState(initial.startAt?.slice(0,5) || "09:00");
  const [endAt,setEndAt]=useState(initial.endAt?.slice(0,5) || "");
  const [customerId,setCustomerId]=useState(initial.customerId || "");
  const [customerName,setCustomerName]=useState(initial.customerName || "");
  const [note,setNote]=useState(initial.note || "");
  const id = initial.id;

  useEffect(()=>{
    const found = customers.find(c=>String(c.id)===String(customerId));
    setCustomerName(found?.name || (initial.customerName || ""));
  },[customerId, customers]); // eslint-disable-line

  async function submit(e){
    e.preventDefault();
    const res = await fetch(`/api/appointments/${id}`,{
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        kind, title, date,
        startAt: startAt || "00:00",
        endAt: endAt || null,
        customerId: customerId || null,
        customerName: customerName || null,
        note
      })
    });
    if(!res.ok){ alert("Speichern fehlgeschlagen."); return; }
    onDone?.();
  }

  const hhmm = Array.from({length:48}, (_,i)=>{
    const h = Math.floor(i/2), m = (i%2)*30;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  });

  return (
    <form onSubmit={submit} className="form">
      <div className="grid-2">
        <label>Art
          <select value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="appointment">Termin</option>
            <option value="order">Auftrag</option>
          </select>
        </label>
        <label>Datum
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
      </div>

      <label>Bezeichnung
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
      </label>

      <div className="grid-3">
        <label>Uhrzeit (Start)
          <select value={startAt} onChange={e=>setStartAt(e.target.value)}>
            {hhmm.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Uhrzeit (Ende, optional)
          <select value={endAt} onChange={e=>setEndAt(e.target.value)}>
            <option value="">—</option>
            {hhmm.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Kunde (optional)
          <select value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <label>Notiz (optional)
        <textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} />
      </label>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button type="button" className="btn" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-primary">Speichern</button>
      </div>

      <style jsx>{`
        .form{ display:grid; gap:12px; min-width: 320px; }
        .grid-2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        .grid-3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
        label{ display:grid; gap:6px; font-size:14px; }
        input, select, textarea{
          padding:8px; border-radius: var(--radius,8px); border:1px solid rgba(0,0,0,.15);
          background:var(--surface,#fff);
        }
      `}</style>
    </form>
  );
}
