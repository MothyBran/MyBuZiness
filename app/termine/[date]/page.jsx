// app/termine/[date]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { useRouter } from "next/navigation";

/* === Slots/Timeline === */
const SLOT_MINUTES = 30;
const SLOT_HEIGHT  = 28;     // muss zur globals.css passen
const DAY_MINUTES  = 24*60;

/* === Datum-Utils === */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function formatDateDE(input){
  const d = toDate(input);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function hhmmToMinutes(hhmm){ const [h,m]=String(hhmm||"00:00").split(":").map(Number); return (h*60 + (m||0)); }
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

  useEffect(()=>{ 
    fetch(`/api/appointments?date=${date}`)
      .then(r=>r.json())
      .then(setItems)
      .catch(()=>setItems([]));
  },[date]);

  useEffect(()=>{ 
    fetch(`/api/customers`)
      .then(r=>r.json())
      .then(rows=>{
        const arr = Array.isArray(rows) ? rows : (rows?.rows || rows?.data || rows?.items || rows?.customers || []);
        const mapped = (arr||[]).map(c=>{
          const id = c.id ?? c.customerId ?? c.uuid ?? c._id ?? "";
          const name = c.name ?? c.fullName ?? c.company ?? c.title ?? "";
          return { id: String(id), name: String(name) };
        }).filter(x=>x.id && x.name);
        setCustomers(mapped);
      })
      .catch(()=>setCustomers([])); 
  },[]);

  const blocks = useMemo(()=>{
    return (items||[]).map(ev=>{
      const startMin = hhmmToMinutes(ev.startAt||"00:00");
      const endMin   = hhmmToMinutes(ev.endAt || ev.startAt || "00:00");
      const top = (startMin / SLOT_MINUTES) * SLOT_HEIGHT;
      const height = Math.max(SLOT_HEIGHT, Math.max(1, (endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT);
      return { ...ev, top, height };
    }).sort((a,b)=> a.top - b.top || a.title.localeCompare(b.title));
  },[items]);

  async function handleDelete(id, title){
    if (!window.confirm(`Diesen Eintrag wirklich löschen?\n\n${title}`)) return;
    const res = await fetch(`/api/appointments/${id}`, { method:"DELETE" });
    if(!res.ok){
      alert("Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="container grid-gap-16">
      <div className="surface">
        <div className="header-row" style={{marginBottom:12}}>
          <div>
            <h2 className="page-title" style={{margin:0}}>Tagesansicht – {formatDateDE(date)}</h2>
            <Link href="/termine" className="btn-ghost" style={{marginTop:8}}>← Zurück zum Kalender</Link>
          </div>
          <button className="btn" onClick={()=>setOpenNew(true)}>+ Neuer Eintrag</button>
        </div>

        <div className="day-grid">
          <div className="day-hours">
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="day-hour">{String(h).padStart(2,"0")}:00</div>
            ))}
          </div>

          <div className="day-timeline">
            {/* Rasterlinien */}
            {Array.from({length:(DAY_MINUTES/SLOT_MINUTES)}, (_,i)=>(
              <div key={i} className={`day-line ${i%2===0?"major":""}`} style={{ top: i*SLOT_HEIGHT }} />
            ))}

            {/* Balken */}
            {blocks.map(ev=>(
              <div
                key={ev.id}
                className={`day-block ${ev.kind==='order'?'accent':'info'}`}
                style={{ top: ev.top, height: ev.height }}
                title={`${ev.title} (${ev.startAt?.slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""})`}
              >
                <div className="day-block-inner">
                  <div className="day-block-left">
                    <b>{ev.kind==='order'?'Auftrag':'Termin'}</b>
                    <span>{ev.title}</span>
                    {ev.customerName && <span>· {ev.customerName}</span>}
                    <span className="day-block-time">· {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <Link href={`/termine/eintrag/${ev.id}`} className="btn-xxs">Details</Link>
                    <button className="btn-xxs" onClick={()=>{ setEditItem(ev); setOpenEdit(true); }}>⚙️</button>
                    <button className="btn-xxs btn-danger" onClick={()=>handleDelete(ev.id, ev.title)}>❌</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Containerhöhe sichern */}
            <div style={{ height: (DAY_MINUTES/SLOT_MINUTES)*SLOT_HEIGHT }} />
          </div>
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
    </div>
  );
}

/* --- Formulare (nutzen globale Buttons/Inputs) --- */
function NewEntryForm({ date, customers, onDone }) {
  const [kind,setKind]=useState("appointment");
  const [title,setTitle]=useState("");
  const [startAt,setStartAt]=useState("09:00");
  const [endAt,setEndAt]=useState("");
  const [customerId,setCustomerId]=useState("");
  const [customerName,setCustomerName]=useState("");
  const [note,setNote]=useState("");
  const [status] = useState("open");

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
        kind, title, date,
        startAt: startAt || "00:00",
        endAt: endAt || null,
        customerId: customerId || null,
        customerName: customerName || null,
        note, status
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
    <form onSubmit={submit} style={{display:"grid", gap:12, minWidth:340}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
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
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
      </label>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
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
        <button type="button" className="btn-ghost" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn">Speichern</button>
      </div>
    </form>
  );
}

function EditEntryForm({ initial, customers, onDone }) {
  const [kind,setKind]=useState(initial.kind || "appointment");
  const [title,setTitle]=useState(initial.title || "");
  const [date,setDate]=useState((()=>{ const d=toDate(initial.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })());
  const [startAt,setStartAt]=useState(initial.startAt?.slice(0,5) || "09:00");
  const [endAt,setEndAt]=useState(initial.endAt?.slice(0,5) || "");
  const [customerId,setCustomerId]=useState(initial.customerId || "");
  const [customerName,setCustomerName]=useState(initial.customerName || "");
  const [note,setNote]=useState(initial.note || "");
  const [status,setStatus]=useState(initial.status || "open");
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
        note, status
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
    <form onSubmit={submit} style={{display:"grid", gap:12, minWidth:340}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
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

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
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
        <label>Status
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="open">offen</option>
            <option value="cancelled">abgesagt</option>
            <option value="done">abgeschlossen</option>
          </select>
        </label>
      </div>

      <label>Kunde (optional)
        <select value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
          <option value="">—</option>
          {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <label>Notiz (optional)
        <textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} />
      </label>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button type="button" className="btn-ghost" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn">Speichern</button>
      </div>
    </form>
  );
}
