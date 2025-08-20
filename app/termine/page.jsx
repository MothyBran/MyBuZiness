// app/termine/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

function startOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d){ const x=new Date(d); x.setMonth(x.getMonth()+1,0); x.setHours(23,59,59,999); return x; }
function addMonths(d, m){ const x=new Date(d); x.setMonth(x.getMonth()+m); return x; }
function toYMD(d){ return d.toISOString().slice(0,10); }
function ym(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }

export default function TerminePage(){
  const [cursor,setCursor]=useState(()=>startOfMonth(new Date()));
  const [events,setEvents]=useState([]);
  const monthString = useMemo(()=>ym(cursor),[cursor]);

  useEffect(()=>{
    fetch(`/api/appointments?month=${monthString}`)
      .then(r=>r.json())
      .then(setEvents)
      .catch(()=>setEvents([]));
  },[monthString]);

  const days = useMemo(()=>{
    // Build calendar grid (Mon-Sun, 6 weeks)
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const start = new Date(first);
    const weekday = (first.getDay()+6)%7; // Mo=0..So=6
    start.setDate(first.getDate() - weekday);
    const out = [];
    for (let i=0;i<42;i++){
      const d=new Date(start); d.setDate(start.getDate()+i);
      out.push(d);
    }
    return out;
  },[cursor]);

  const byDate = useMemo(()=>{
    const map = {};
    for(const e of events){
      map[e.date] ||= [];
      map[e.date].push(e);
    }
    return map;
  },[events]);

  return (
    <div className="container" style={{display:"grid", gap:16}}>
      {/* Card 1: Monatskalender */}
      <div className="surface card">
        <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2>Kalender – {format(cursor, "LLLL yyyy", { locale: de })}</h2>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setCursor(addMonths(cursor,-1))}>◀︎</button>
            <button className="btn" onClick={()=>setCursor(startOfMonth(new Date()))}>Heute</button>
            <button className="btn" onClick={()=>setCursor(addMonths(cursor,1))}>▶︎</button>
          </div>
        </div>

        <div className="calendar-grid">
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map((h)=>(<div key={h} className="calendar-head">{h}</div>))}
          {days.map((d,i)=>{
            const inMonth = d.getMonth()===cursor.getMonth();
            const key = toYMD(d);
            const list = byDate[key]||[];
            return (
              <Link
                href={`/termine/${key}`}
                key={i}
                className={`calendar-cell ${inMonth?"":"muted"}`}
                title={`Details für ${format(d,"PPP",{locale:de})}`}
              >
                <div className="calendar-cell-top">
                  <span className="daynum">{d.getDate()}</span>
                </div>
                <div className="calendar-cell-events">
                  {list.slice(0,3).map(ev=>(
                    <div key={ev.id} className={`pill ${ev.kind==='order'?'pill-accent':'pill-info'}`}>
                      {ev.startAt?.slice(0,5)} {ev.title}
                    </div>
                  ))}
                  {list.length>3 && <div className="pill">{`+${list.length-3} weitere`}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Card 2: Monatsübersicht */}
      <div className="surface card">
        <div className="card-header">
          <h2>Termine / Aufträge – Übersicht ({format(cursor, "LLLL yyyy", { locale: de })})</h2>
        </div>
        <div className="table">
          <div className="table-row head">
            <div>Datum</div><div>Start</div><div>Art</div><div>Bezeichnung</div><div>Kunde</div><div>Status</div>
          </div>
          {events.map(ev=>(
            <div className="table-row" key={ev.id}>
              <div><Link href={`/termine/${ev.date}`}>{ev.date}</Link></div>
              <div>{ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</div>
              <div>{ev.kind==="order"?"Auftrag":"Termin"}</div>
              <div>{ev.title}</div>
              <div>{ev.customerName || "—"}</div>
              <div>{ev.status || "open"}</div>
            </div>
          ))}
          {events.length===0 && <div className="table-row"><div style={{gridColumn:"1/-1"}}>Keine Einträge im ausgewählten Monat.</div></div>}
        </div>
      </div>

      <style jsx>{`
        .calendar-grid{
          display:grid;
          grid-template-columns: repeat(7,1fr);
          gap:8px;
        }
        .calendar-head{
          font-weight:600;
          padding:8px;
          opacity:.8;
        }
        .calendar-cell{
          display:flex;
          flex-direction:column;
          gap:6px;
          padding:8px;
          border-radius: var(--radius, 8px);
          background: var(--surface, #fff);
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06));
          text-decoration:none;
          color: inherit;
        }
        .calendar-cell:hover{ outline:2px solid rgba(0,0,0,.06); }
        .muted{ opacity:.5; }
        .calendar-cell-top{ display:flex; justify-content:flex-end; }
        .daynum{ font-weight:700; }
        .calendar-cell-events{ display:flex; flex-direction:column; gap:4px; }
        .pill{
          border-radius: 999px;
          padding:2px 8px;
          font-size:12px;
          background: #e5e7eb;
        }
        .pill-info{ background: var(--chip-info, #DBEAFE); }
        .pill-accent{ background: var(--chip-accent, #FDE68A); }
        .table{ display:grid; }
        .table-row{ display:grid; grid-template-columns: 110px 74px 90px 1fr 1fr 90px; gap:8px; padding:8px; align-items:center; }
        .table-row.head{ font-weight:700; border-bottom:1px solid rgba(0,0,0,.1); }
        .card-header{ padding:8px; display:flex; align-items:center; justify-content:space-between; }
      `}</style>
    </div>
  );
}
