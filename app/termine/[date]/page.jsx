// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* Utils */
function toDate(input){ if (input instanceof Date) return input; if (/^\d{4}-\d{2}-\d{2}$/.test(input)){ const [y,m,d]=input.split("-").map(Number); return new Date(y,m-1,d,12,0,0,0);} const d=new Date(input||Date.now()); return isNaN(d)?new Date():d; }
function toYMD(d){ const z=toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function addDays(d, n){ const x=new Date(toDate(d)); x.setDate(x.getDate()+n); return x; }
function formatDateLong(d){ return new Intl.DateTimeFormat("de-DE",{weekday:"long", day:"2-digit", month:"long", year:"numeric"}).format(toDate(d)); }
const HHMM_STEPS = Array.from({length:24*2}, (_,i)=>`${String(Math.floor(i/2)).padStart(2,"0")}:${i%2?"30":"00"}`);

/* Höhe pro Stunde (muss zur CSS .day-block/.day-block-inner passen): 44px => 30min = 22px */
const PX_PER_HOUR = 44;
const PX_PER_MIN = PX_PER_HOUR/60;

export default function DayPage({ params }){
  const selectedDate = params?.date ?? toYMD(new Date());

  const [items, setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [prefill, setPrefill] = useState(null); // { date, startAt }

  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      fetch(`/api/appointments?date=${selectedDate}`, { cache:"no-store" })
        .then(async r=>{ if(!r.ok) throw new Error(await r.text()); return r.json(); }).catch(()=>[]),
      fetch(`/api/customers`, { cache:"no-store" })
        .then(r=>r.json()).then(js=>js?.data||[]).catch(()=>[])
    ]).then(([ev, cust])=>{
      if (!alive) return;
      setItems(Array.isArray(ev)?ev:[]);
      setCustomers(Array.isArray(cust)?cust:[]);
    }).catch(err=>{
      if (!alive) return;
      console.error(err);
      setError("Konnte Daten nicht laden.");
      setItems([]);
    }).finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[selectedDate]);

  const sorted = useMemo(()=>{
    return [...items].sort((a,b)=> (a.startAt||"").localeCompare(b.startAt||""));
  },[items]);

  function openNewAt(hhmm){
    setPrefill({ date: selectedDate, startAt: hhmm });
    setNewOpen(true);
  }
  function onSaved(){
    setNewOpen(false);
    // reload
    (async ()=>{
      const d = await fetch(`/api/appointments?date=${selectedDate}`, { cache:"no-store" }).then(r=>r.json()).catch(()=>[]);
      setItems(Array.isArray(d)?d:[]);
    })();
  }

  // Position/Height für Event‑Block (Start/Ende in Minuten seit 00:00)
  function calcPos(ev){
    const [sh, sm] = (ev.startAt||"00:00").split(":").map(Number);
    const startMin = sh*60 + sm;
    const [eh, em] = (ev.endAt||ev.startAt||"00:00").split(":").map(Number);
    const endMin = Math.max(startMin + 30, eh*60 + em); // min. 30min
    const top = startMin * PX_PER_MIN;
    const height = Math.max(28, (endMin - startMin) * PX_PER_MIN - 6); // -6 für Innenabstände
    return { top, height };
  }

  const dObj = toDate(selectedDate);
  const prev = toYMD(addDays(dObj,-1));
  const next = toYMD(addDays(dObj, 1));

  return (
    <div className="container">
      <div className="surface day-wrap">
        {/* Toolbar */}
        <div className="day-toolbar">
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <Link href="/termine" className="btn-ghost" aria-label="Zur Monatsansicht">← Kalender</Link>
            <h2 className="page-title" style={{margin:0}}>{formatDateLong(selectedDate)}</h2>
          </div>
          <div style={{display:"flex", gap:8}}>
            <Link href={`/termine/${prev}`} className="btn-ghost" aria-label="Vorheriger Tag">◀︎</Link>
            <Link href={`/termine/${toYMD(new Date())}`} className="btn" aria-label="Heute">Heute</Link>
            <Link href={`/termine/${next}`} className="btn-ghost" aria-label="Nächster Tag">▶︎</Link>
            <button className="btn" onClick={()=>openNewAt("09:00")}>+ Neuer Eintrag</button>
          </div>
        </div>

        {/* Stundenraster 00–24 Uhr in 30-Min-Schritten (je Stunde ein Block, Event absolut positioniert) */}
        <div className="day-grid" style={{ position:"relative" }}>
          <div style={{display:"grid", gridTemplateRows:`repeat(24, ${PX_PER_HOUR}px)`, gap:8}}>
            {Array.from({length:24}).map((_,h)=>(
              <div key={h} className="day-hour">{String(h).padStart(2,"0")}:00</div>
            ))}
          </div>

          <div style={{position:"relative"}}>
            {/* Klickbare Stundenraster (jede Stunde großer Klickbereich, damit UX gut ist) */}
            <div style={{display:"grid", gridTemplateRows:`repeat(24, ${PX_PER_HOUR}px)`, gap:8}}>
              {Array.from({length:24}).map((_,h)=>(
                <div key={h} className="day-block" onClick={()=>openNewAt(`${String(h).padStart(2,"0")}:00`)}>
                  <div className="day-block-inner" />
                </div>
              ))}
            </div>

            {/* Events über den Zeitraum */}
            {sorted.map(ev=>{
              const { top, height } = calcPos(ev);
              return (
                <div
                  key={ev.id}
                  className={`day-event ${ev.kind==='order'?'order':''}`}
                  style={{ top, height }}
                  onClick={()=>window.location.href=`/termine/eintrag/${ev.id}`}
                  title={`${ev.title} (${ev.startAt?.slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""})`}
                >
                  <span>{ev.kind==='order' ? "🧾" : "📅"}</span>
                  <span style={{fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {ev.title || "(ohne Titel)"}
                  </span>
                  <span className="subtle" style={{marginLeft:"auto"}}>
                    {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabelle darunter: Alle Einträge am Tag */}
        <div className="surface" style={{marginTop:8}}>
          <div className="header-row" style={{marginBottom:8}}>
            <div className="section-title">Alle Einträge am {formatDateLong(selectedDate)}</div>
            <button className="btn-ghost" onClick={()=>openNewAt("09:00")}>+ Neuer Eintrag</button>
          </div>
          <div className="appt-list">
            {sorted.map(ev=>{
              const display = (() => {
                if (ev.status === "cancelled") return "abgesagt";
                if (ev.status === "done") return "abgeschlossen";
                return "offen";
              })();
              return (
                <div
                  key={ev.id}
                  className="appt-item"
                  onClick={()=>window.location.href=`/termine/eintrag/${ev.id}`}
                  style={{cursor:"pointer"}}
                >
                  <div className={`appt-icon ${ev.kind==='order'?'appt-icon--order':''}`}>
                    {ev.kind==='order' ? "🧾" : "📅"}
                  </div>
                  <div style={{minWidth:0}}>
                    <div className="appt-title">{ev.title || "(ohne Titel)"}</div>
                    <div className="appt-meta">
                      {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                      {ev.customerName && <> · {ev.customerName}</>}
                    </div>
                  </div>
                  <div className="appt-actions">
                    <span className={`appt-badge ${
                      display==="offen" ? "is-offen" :
                      display==="abgesagt" ? "is-abgesagt" : "is-abgeschlossen"
                    }`}>{display}</span>
                  </div>
                </div>
              );
            })}
            {sorted.length===0 && (
              <div className="surface" style={{borderStyle:"dashed", textAlign:"center"}}>Keine Einträge.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Neuer Eintrag (Datum & Start vorausgefüllt) */}
      <Modal open={newOpen} onClose={()=>setNewOpen(false)} title="+ Neuer Eintrag">
        <AppointmentForm
          initial={{
            date: selectedDate,
            startAt: (prefill?.startAt || "09:00")+":00"
          }}
          customers={customers}
          onSaved={onSaved}
          onCancel={()=>setNewOpen(false)}
        />
      </Modal>
    </div>
  );
}
