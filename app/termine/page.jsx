// app/termine/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* Date Utils */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input==="string" && /^\d{4}-\d{2}-\d{2}$/.test(input)){
    const [y,m,d]=input.split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d=new Date(input||Date.now());
  return isNaN(d)?new Date():d;
}
function formatDateDE(input){
  const d=toDate(input);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function startOfMonth(d){ const x=toDate(d); x.setDate(1); x.setHours(12,0,0,0); return x; }
function addMonths(d,m){ const x=toDate(d); x.setMonth(x.getMonth()+m); return x; }
function toYMD(d){ const z=toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function ym(d){ const x=toDate(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; }
const TODAY_YMD = toYMD(new Date());

/* Status */
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
function nextStatus(display){
  return display==="offen" ? "abgesagt" : display==="abgesagt" ? "abgeschlossen" : "offen";
}

export default function TerminePage(){
  const [cursor,setCursor]=useState(()=>startOfMonth(new Date()));
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const monthString = useMemo(()=>ym(cursor),[cursor]);

  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?month=${monthString}`, { cache:"no-store" })
      .then(async r=>{ if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(data=>{ if(alive) setEvents(Array.isArray(data)?data:[]); })
      .catch(err=>{ if(alive){ console.error(err); setError("Konnte Termine nicht laden."); setEvents([]);} })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[monthString]);

  const days = useMemo(()=>{
    const first = startOfMonth(cursor);
    const weekday = (first.getDay()+6)%7; // Mo=0..So=6
    const start = new Date(first); start.setDate(first.getDate()-weekday);
    return Array.from({length:42}, (_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d; });
  },[cursor]);

  const byDate = useMemo(()=>{
    const map={};
    for(const e of events){ const key=toYMD(e.date); (map[key] ||= []).push(e); }
    Object.values(map).forEach(list => list.sort((a,b)=> (a.startAt??"").localeCompare(b.startAt??"")));
    return map;
  },[events]);

  async function cycleStatus(ev){
    const display = computeDisplayStatus(ev);
    const to = nextStatus(display);
    const map = { "offen":"open", "abgesagt":"cancelled", "abgeschlossen":"done" };
    const res = await fetch(`/api/appointments/${ev.id}`,{
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status: map[to] })
    });
    if(!res.ok){ alert("Status konnte nicht geändert werden."); return; }
    setEvents(prev => prev.map(p => p.id===ev.id ? { ...p, status: map[to] } : p));
  }

  function MonthCalendar(){
    return (
      <div className="surface">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", marginBottom: 10, gap:8, flexWrap:"wrap"}}>
          <h2 className="page-title" style={{margin:0}}>
            Kalender – {new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(cursor)}
          </h2>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-ghost" onClick={()=>setCursor(addMonths(cursor,-1))}>◀︎</button>
            <button className="btn" onClick={()=>setCursor(startOfMonth(new Date()))}>Heute</button>
            <button className="btn-ghost" onClick={()=>setCursor(addMonths(cursor,1))}>▶︎</button>
          </div>
        </div>

        {/* Kopfzeile (Wochentage) */}
        <div className="cal-grid" style={{marginBottom:6}}>
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(h=>(
            <div key={h} className="cal-head">{h}</div>
          ))}
        </div>

        {/* Monatstage */}
        <div className="cal-grid">
          {days.map((d,i)=>{
            const inMonth = d.getMonth()===cursor.getMonth();
            const key = toYMD(d);
            const list = byDate[key]||[];
            const isToday = key===TODAY_YMD;
            return (
              <Link
                key={i}
                href={`/termine/${key}`}
                className={`cal-cell ${inMonth? "": "muted"} ${isToday? "today": ""}`}
              >
                <div className="cal-daynum-wrap">
                  <span className="cal-daynum">{d.getDate()}</span>
                </div>
                <div className="cal-markers">
                  {list.slice(0,4).map(x=>(
                    <span
                      key={x.id}
                      className={`cal-dot ${x.kind==='order' ? 'cal-dot-accent' : ''}`}
                      title={x.kind==='order' ? 'Auftrag' : 'Termin'}
                    />
                  ))}
                  {list.length>4 && (
                    <span className="cal-dot-more" title={`+${list.length-4} weitere`}>+{list.length-4}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {loading && <p className="subtle" style={{marginTop:8}}>Lade Termine…</p>}
        {error && !loading && <p style={{color:"#b91c1c", marginTop:8}}>{error}</p>}

        {/* Heute rot einkreisen (überschreibt Standardfarbe aus globals.css) */}
        <style jsx>{`
          .cal-cell.today .cal-daynum { outline: 2px solid #dc2626; }
        `}</style>
      </div>
    );
  }

  function MonthList(){
    return (
      <div className="surface" style={{ marginTop: 12 }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", marginBottom: 10, gap:8, flexWrap:"wrap"}}>
          <h2 className="page-title" style={{margin:0}}>Termine / Aufträge – Übersicht</h2>
        </div>

        {(!loading && !error && events.length===0) && (
          <div className="surface" style={{borderStyle:"dashed", textAlign:"center"}}>Keine Einträge im ausgewählten Monat.</div>
        )}

        <div style={{ display:"grid", gap:10 }}>
          {events.map(ev=>{
            const displayStatus = computeDisplayStatus(ev);
            return (
              <div key={ev.id} className="list-item">
                <div className={`item-icon ${ev.kind==='order'?'accent':''}`} title={ev.kind==='order'?'Auftrag':'Termin'}>
                  {ev.kind==='order' ? "🧾" : "📅"}
                </div>
                <div style={{minWidth:0}}>
                  <div className="item-title">
                    <Link href={`/termine/eintrag/${ev.id}`} style={{color:"inherit", textDecoration:"none"}}>{ev.title || "(ohne Titel)"}</Link>
                  </div>
                  <div className="item-meta">
                    <Link href={`/termine/${(typeof ev.date==='string' && ev.date.length>10) ? ev.date.slice(0,10) : ev.date}`} style={{color:"inherit", textDecoration:"none"}}>
                      {formatDateDE(ev.date)} · {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                    </Link>
                    {ev.customerName && <> · {ev.customerName}</>}
                  </div>
                </div>
                <div className="item-actions">
                  <span className={`status-badge ${displayStatus}`}>{displayStatus}</span>
                  <button
                    className="btn-xxs"
                    onClick={()=>cycleStatus(ev)}
                    title="Status ändern"
                  >
                    Status
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <MonthCalendar />
      <MonthList />
    </div>
  );
}
