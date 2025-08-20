// app/termine/page.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* === Datum-Utils (robust) === */
function toDate(input) {
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
function fmtMonthYear(d){ return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(toDate(d)); }
function fmtLong(d){ return new Intl.DateTimeFormat("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(toDate(d)); }

/* === Kalender-Helper === */
function startOfMonth(d){ const x=toDate(d); x.setDate(1); x.setHours(12,0,0,0); return x; }
function addMonths(d,m){ const x=toDate(d); x.setMonth(x.getMonth()+m); return x; }
function toYMD(d){ const z=toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function ym(d){ const x=toDate(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; }

const TODAY_YMD = toYMD(new Date());

/* === Status-Logik === */
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
function nextStatus(display){ return display==="offen" ? "abgesagt" : display==="abgesagt" ? "abgeschlossen" : "offen"; }

export default function TerminePage(){
  const router = useRouter();
  const [cursor,setCursor]=useState(()=>startOfMonth(new Date()));
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const monthString = useMemo(()=>ym(cursor),[cursor]);

  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?month=${monthString}`)
      .then(async r => { if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(data => { if(alive) setEvents(Array.isArray(data)?data:[]); })
      .catch(err => { if(alive){ setEvents([]); setError("Konnte Termine nicht laden."); console.error(err); } })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[monthString]);

  const days = useMemo(()=>{
    const first = startOfMonth(cursor);
    const weekday = (first.getDay()+6)%7; // Mo=0..So=6
    const start = new Date(first);
    start.setDate(first.getDate()-weekday);
    return Array.from({length:42}, (_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d; });
  },[cursor]);

  const byDate = useMemo(()=>{
    const map = {};
    for (const e of events) { const key = toYMD(e.date); (map[key] ||= []).push(e); }
    Object.values(map).forEach(list => list.sort((a,b)=> (a.startAt??"").localeCompare(b.startAt??"")));
    return map;
  },[events]);

  async function cycleStatus(ev){
    const display = computeDisplayStatus(ev);
    const to = nextStatus(display);
    const map = { "offen":"open", "abgesagt":"cancelled", "abgeschlossen":"done" };
    const res = await fetch(`/api/appointments/${ev.id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status: map[to] })
    });
    if(!res.ok){ alert("Status konnte nicht geändert werden."); return; }
    router.refresh();
  }

  return (
    <div className="container grid-gap-16">
      {/* Card 1: Monatskalender */}
      <div className="surface">
        <div className="header-row" style={{marginBottom:12}}>
          <h2 className="page-title" style={{margin:0}}>Kalender – {fmtMonthYear(cursor)}</h2>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-ghost" onClick={()=>setCursor(addMonths(cursor,-1))} aria-label="Vorheriger Monat">◀︎</button>
            <button className="btn" onClick={()=>setCursor(startOfMonth(new Date()))}>Heute</button>
            <button className="btn-ghost" onClick={()=>setCursor(addMonths(cursor,1))} aria-label="Nächster Monat">▶︎</button>
          </div>
        </div>

        <div className="cal-grid">
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(h=>(
            <div key={h} className="cal-head">{h}</div>
          ))}
          {days.map((d,i)=>{
            const inMonth = d.getMonth()===cursor.getMonth();
            const key = toYMD(d);
            const list = byDate[key]||[];
            const isToday = key===TODAY_YMD;
            return (
              <Link
                key={i}
                href={`/termine/${key}`}
                className={`cal-cell ${inMonth?"":"muted"} ${isToday?"today":""}`}
                title={`Details für ${fmtLong(d)}`}
              >
                <div className="cal-daynum-wrap">
                  <span className="cal-daynum">{d.getDate()}</span>
                </div>
                <div className="cal-markers">
                  {list.slice(0,4).map(x=>(
                    <span key={x.id} className={`cal-dot ${x.kind==='order'?'cal-dot-accent':'cal-dot-info'}`} />
                  ))}
                  {list.length>4 && <span className="cal-dot cal-dot-more" title={`+${list.length-4} weitere`} />}
                </div>
              </Link>
            );
          })}
        </div>

        {loading && <p className="subtle" style={{marginTop:8}}>Lade Termine…</p>}
        {error && !loading && <p style={{color:"#b91c1c", marginTop:8}}>{error}</p>}
      </div>

      {/* Card 2: Monatsübersicht */}
      <div className="surface">
        <div className="header-row" style={{marginBottom:12}}>
          <h2 className="page-title" style={{margin:0}}>Termine / Aufträge – Übersicht ({fmtMonthYear(cursor)})</h2>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Datum</th><th>Start</th><th>Art</th><th>Bezeichnung</th><th>Kunde</th><th>Status</th></tr>
            </thead>
            <tbody>
              {events.map(ev=>{
                const href = `/termine/eintrag/${ev.id}`;
                const displayStatus = computeDisplayStatus(ev);
                return (
                  <tr key={ev.id} className="row-clickable" onClick={()=>location.href = href} style={{cursor:"pointer"}}>
                    <td>{formatDateDE(ev.date)}</td>
                    <td>{ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</td>
                    <td>{ev.kind==="order"?"Auftrag":"Termin"}</td>
                    <td className="ellipsis">{ev.title}</td>
                    <td className="ellipsis">{ev.customerName || "—"}</td>
                    <td>
                      <button
                        onClick={async (e)=>{ e.stopPropagation(); await cycleStatus(ev); }}
                        className={`status-badge ${displayStatus}`}
                        title="Status ändern"
                      >
                        {displayStatus}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!loading && !error && events.length===0) && (
                <tr><td colSpan={6}>Keine Einträge im ausgewählten Monat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
