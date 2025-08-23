// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===================== Datum-Utils ===================== */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){
  const z = toDate(d);
  z.setHours(12,0,0,0);
  return z.toISOString().slice(0,10);
}
function formatDateDE(input){
  const d = toDate(input);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function addDays(d, n){
  const x = toDate(d);
  x.setDate(x.getDate()+n);
  return x;
}
const TODAY_YMD = toYMD(new Date());

/* ===================== Anzeige-/Status-Logik ===================== */
function computeDisplayStatus(e){
  const now = new Date();
  const start = toDate(`${e.date}T${(e.startAt||"00:00")}:00`);
  const end   = toDate(`${e.date}T${(e.endAt||e.startAt||"00:00")}:00`);
  const isPast = end < now;
  if (e.status === "cancelled") return "abgesagt";
  if (e.status === "done") return "abgeschlossen";
  if (e.status === "open" && isPast) return "abgeschlossen";
  return "offen";
}
function hhmmToMinutes(hhmm){
  if (!hhmm) return 0;
  const [h,m] = hhmm.split(":").map(Number);
  return (h*60)+(m||0);
}

/* ===================== Seite ===================== */
export default function DayPage({ params }){
  const paramDate = (params?.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) ? params.date : TODAY_YMD;
  const [date, setDate] = useState(paramDate);

  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [openNew, setOpenNew] = useState(false);
  const [customers, setCustomers] = useState([]);

  // Kunden (optional – wenn /api/customers vorhanden; sonst leer)
  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" });
        if (!r.ok) return; // still ok – wir arbeiten ohne Kundenliste
        const js = await r.json().catch(()=>({ data: [] }));
        if (alive) setCustomers(js?.data || []);
      }catch{ /* ignore */ }
    })();
    return ()=>{ alive = false; };
  },[]);

  // Tages-Daten laden
  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?date=${date}`, { cache:"no-store" })
      .then(async r => { if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(data => { if(alive) setItems(Array.isArray(data) ? data : []); })
      .catch(err => { if(alive){ console.error(err); setError("Konnte Tages-Einträge nicht laden."); setItems([]);} })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false; };
  },[date]);

  // Navigation (vor/zurück/heute)
  const prevDate = toYMD(addDays(date, -1));
  const nextDate = toYMD(addDays(date, +1));
  const isToday  = date === TODAY_YMD;

  // Events nach Startzeit sortieren + nach Stunde gruppieren
  const eventsSorted = useMemo(()=>{
    const arr = [...items];
    arr.sort((a,b)=> (a.startAt||"").localeCompare(b.startAt||""));
    return arr.map(x => ({ ...x, _displayStatus: computeDisplayStatus(x) }));
  },[items]);

  const byHour = useMemo(()=>{
    const map = {};
    for (const e of eventsSorted){
      const min = hhmmToMinutes(e.startAt || "00:00");
      const hr = Math.floor(min/60);
      (map[hr] ||= []).push(e);
    }
    return map;
  },[eventsSorted]);

  async function refresh(){ // nach Speichern neu laden
    try{
      const js = await fetch(`/api/appointments?date=${date}`, { cache:"no-store" }).then(r=>r.json());
      setItems(Array.isArray(js)?js:[]);
    }catch{/* noop */}
  }

  async function cycleStatus(ev){
    // offen -> abgesagt -> abgeschlossen -> offen
    const display = computeDisplayStatus(ev);
    const next = display==="offen" ? "abgesagt" : display==="abgesagt" ? "abgeschlossen" : "offen";
    const map = { "offen":"open", "abgesagt":"cancelled", "abgeschlossen":"done" };
    const res = await fetch(`/api/appointments/${ev.id}`,{
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status: map[next] })
    });
    if(!res.ok){ alert("Status konnte nicht geändert werden."); return; }
    setItems(prev => prev.map(p => p.id===ev.id ? { ...p, status: map[next] } : p));
  }

  /* ===================== Render ===================== */
  return (
    <div className="container" style={{ width:"100%" }}>
      {/* Kopfzeile */}
      <div className="surface" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <Link className="btn-ghost" href={`/termine/${prevDate}`} aria-label="Voriger Tag">◀︎</Link>
          <h2 className="page-title" style={{ margin: 0 }}>
            {isToday ? "Heute" : "Tagesansicht"} · {formatDateDE(date)}
          </h2>
          <Link className="btn-ghost" href={`/termine/${nextDate}`} aria-label="Nächster Tag">▶︎</Link>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {!isToday && <Link className="btn-ghost" href={`/termine/${TODAY_YMD}`}>Heute</Link>}
          <button className="btn" onClick={()=>setOpenNew(true)}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Tages-Grid */}
      <div className="surface" style={{ display:"grid", gap:12 }}>
        <div className="day-grid">
          {/* linke Stunden-Spalte */}
          <div style={{ display:"grid", gap:8 }}>
            {Array.from({length:24},(_,h)=>(
              <div key={h} className="day-hour">{String(h).padStart(2,"0")}:00</div>
            ))}
          </div>

          {/* rechte Blocks-Spalte */}
          <div style={{ display:"grid", gap:8 }}>
            {Array.from({length:24},(_,h)=>{
              const list = byHour[h] || [];
              return (
                <div key={h} className="day-block">
                  <div className="day-block-inner" style={{ display:"grid", gap:8 }}>
                    {list.length === 0 && (
                      <div className="subtle" style={{ fontSize:12 }}>—</div>
                    )}
                    {list.map(ev => (
                      <div
                        key={ev.id}
                        style={{
                          display:"grid", gap:4, padding:8,
                          border:"1px solid var(--color-border)", borderRadius:10, background:"#fff"
                        }}
                      >
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                            <span
                              title={ev.kind==='order'?'Auftrag':'Termin'}
                              style={{
                                width:24, height:24, borderRadius:999,
                                display:"inline-flex", alignItems:"center", justifyContent:"center",
                                background: ev.kind==='order' ? "#FDE68A" : "#DBEAFE"
                              }}
                            >
                              {ev.kind==='order' ? "🧾" : "📅"}
                            </span>
                            <div className="ellipsis" style={{ fontWeight:700 }}>
                              <Link href={`/termine/eintrag/${ev.id}`} style={{ color:"inherit", textDecoration:"none" }}>
                                {ev.title || "(ohne Titel)"}
                              </Link>
                            </div>
                          </div>
                          <button
                            className={`status-badge ${ev._displayStatus}`}
                            onClick={()=>cycleStatus(ev)}
                            title="Status ändern"
                          >
                            {ev._displayStatus}
                          </button>
                        </div>
                        <div className="subtle" style={{ fontSize:13 }}>
                          {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}{ev.customerName?` · ${ev.customerName}`:""}
                        </div>
                        {ev.note && <div style={{ fontSize:13 }}>{ev.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading && <p className="subtle">Lade Einträge…</p>}
        {error && !loading && <p style={{ color:"#b91c1c" }}>{error}</p>}
      </div>

      {/* Liste (kompakt) */}
      <div className="surface">
        <h3 className="section-title" style={{ marginTop:0, marginBottom:10 }}>Alle Einträge am {formatDateDE(date)}</h3>
        {(!loading && !error && eventsSorted.length===0) && (
          <div className="surface" style={{ borderStyle:"dashed", textAlign:"center" }}>Kein Eintrag vorhanden.</div>
        )}
        <div className="list">
          {eventsSorted.map(ev=>(
            <div key={ev.id} className="list-item">
              <div className={`item-icon ${ev.kind==='order'?'accent':''}`} title={ev.kind==='order'?'Auftrag':'Termin'}>
                {ev.kind==='order' ? "🧾" : "📅"}
              </div>
              <div style={{ minWidth:0 }}>
                <div className="item-title">
                  <Link href={`/termine/eintrag/${ev.id}`} style={{ color:"inherit", textDecoration:"none" }}>
                    {ev.title || "(ohne Titel)"}
                  </Link>
                </div>
                <div className="item-meta">
                  {formatDateDE(ev.date)} · {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}{ev.customerName?` · ${ev.customerName}`:""}
                </div>
              </div>
              <div className="item-actions">
                <button
                  className={`status-badge ${ev._displayStatus}`}
                  onClick={()=>cycleStatus(ev)}
                  title="Status ändern"
                >
                  {ev._displayStatus}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Neuer Eintrag */}
      <Modal open={openNew} onClose={()=>setOpenNew(false)} title="+ Neuer Eintrag" maxWidth={720}>
        <AppointmentForm
          initial={{ date, startAt: "09:00", endAt: "" }}
          customers={customers}
          onSaved={async ()=>{ setOpenNew(false); await refresh(); }}
          onCancel={()=>setOpenNew(false)}
        />
      </Modal>

      {/* Lokale Styles nur für diese Seite (kleine Verfeinerungen) */}
      <style jsx>{`
        .status-badge.offen{ background:#EFF6FF; border-color:#BFDBFE; }
        .status-badge.abgesagt{ background:#FEF2F2; border-color:#FECACA; }
        .status-badge.abgeschlossen{ background:#F0FDF4; border-color:#BBF7D0; }
      `}</style>
    </div>
  );
}
