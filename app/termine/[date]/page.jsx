// app/termine/[date]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { useRouter } from "next/navigation";

const SLOT_MINUTES = 30;         // Rasterbreite
const SLOT_HEIGHT  = 28;         // px pro 30 Minuten
const DAY_MINUTES  = 24*60;

const fmtDateDE = (ymd)=> ymd && ymd.length>=10 ? ymd.split("-").reverse().join(".") : (ymd||"");
const STATUS_LABEL = { open: "offen", cancelled: "abgesagt", done: "abgeschlossen" };

// 30-Minuten-Liste für Dropdowns
function times(){ const out=[]; for(let h=0;h<24;h++){ for(let m of [0,30]) out.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);} return out; }
function hhmmToMinutes(hhmm){ const [h,m]=String(hhmm||"00:00").split(":").map(Number); return (h*60 + (m||0)); }

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

  // Load customers robust
  useEffect(()=>{ 
    fetch(`/api/customers`)
      .then(r=>r.json())
      .then(rows=>{
        const arr = Array.isArray(rows) ? rows
          : rows?.rows || rows?.data || rows?.items || rows?.customers || [];
        const mapped = (arr||[]).map(c=>{
          const id = c.id ?? c.customerId ?? c.uuid ?? c._id ?? "";
          const name = c.name ?? c.fullName ?? c.company ?? c.title ?? "";
          return { id: String(id), name: String(name) };
        }).filter(x=>x.id && x.name);
        setCustomers(mapped);
      })
      .catch(()=>setCustomers([])); 
  },[]);

  // Absolut positionierte Balken (top/height in px)
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
            <h2>Tagesansicht – {fmtDateDE(date)}</h2>
            <Link href="/termine" className="btn" style={{marginTop:8}}>← Zurück zum Kalender</Link>
          </div>
          <button className="btn btn-primary" onClick={()=>setOpenNew(true)}>+ Neuer Eintrag</button>
        </div>

        {/* Grid: linke Stundenleiste + Timeline */}
        <div className="day-grid">
          <div className="hours">
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="hour">{String(h).padStart(2,"0")}:00</div>
            ))}
          </div>

          <div className="timeline">
            {/* Stunden-/Halbstunden-Linien */}
            {Array.from({length:(DAY_MINUTES/SLOT_MINUTES)}, (_,i)=>(
              <div
                key={i}
                className={`line ${i%2===0?"major":"minor"}`}
                style={{ top: i*SLOT_HEIGHT }}
              />
            ))}

            {/* Termin-Balken */}
            {blocks.map(ev=>(
              <div
                key={ev.id}
                className={`block ${ev.kind==='order'?'accent':'info'}`}
                style={{ top: ev.top, height: ev.height }}
                title={`${ev.title} (${ev.startAt?.slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""})`}
              >
                <div className="block-inner">
                  <div className="block-left">
                    <b>{ev.kind==='order'?'Auftrag':'Termin'}</b>
                    <span>{ev.title}</span>
                    {ev.customerName && <span>· {ev.customerName}</span>}
                    <span className="block-time">· {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</span>
                  </div>
                  <div className="block-actions">
                    <Link href={`/termine/eintrag/${ev.id}`} className="btn btn-xxs">Details</Link>
                    <button className="btn btn-xxs" onClick={()=>{ setEditItem(ev); setOpenEdit(true); }}>⚙️</button>
                    <button className="btn btn-xxs btn-danger" onClick={()=>handleDelete(ev.id, ev.title)}>❌</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Containerhöhe */}
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

      <style jsx>{`
        .day-grid{
          display:grid;
          grid-template-columns: 80px 1fr;
          gap:0;
          border:1px solid rgba(0,0,0,.08);
          border-radius: var(--radius,12px);
          overflow:hidden;
        }
        .hours{
          background: #fafafa;
          border-right:1px solid rgba(0,0,0,.08);
        }
        .hour{
          height: ${SLOT_HEIGHT*2}px; /* 60 Minuten */
          display:flex; align-items:flex-start; justify-content:center;
          padding-top: 6px;
          font-size:12px; opacity:.8;
          border-bottom:1px solid rgba(0,0,0,.06);
        }
        .timeline{
          position:relative;
          background: #fff;
        }
        .line{
          position:absolute; left:0; right:0;
          border-bottom:1px dashed rgba(0,0,0,.06);
        }
        .line.major{ border-bottom:1px solid rgba(0,0,0,.09); }
        .block{
          position:absolute; left:8px; right:8px;
          border-radius: 12px;
          background:#e5e7eb;
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06));
          display:flex; align-items:center;
        }
        .block.info{ background: var(--chip-info, #DBEAFE); }
        .block.accent{ background: var(--chip-accent, #FDE68A); }
        .block-inner{ width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 8px; }
        .block-left{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .block-time{ opacity:.7; }
        .block-actions{ display:flex; gap:6px; }
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
        .form{ display:grid; gap:12px; min-width: 340px; }
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
  const [date,setDate]=useState(initial.date);
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
        note,
        status
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
        <button type="button" className="btn" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-primary">Speichern</button>
      </div>

      <style jsx>{`
        .form{ display:grid; gap:12px; min-width: 340px; }
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
