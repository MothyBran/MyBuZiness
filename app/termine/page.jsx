// app/termine/page.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// ---- Locale-Formatter (de-DE) ohne externe Lib ----
const fmtMonthYear = (d) =>
  new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(d);
const fmtDateDE = (ymd) => {
  if (!ymd || ymd.length < 10) return ymd || "";
  const [y,m,d] = ymd.split("-");
  return `${d}.${m}.${y}`;
};
const fmtLong = (d) =>
  new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(d);

// ---- Datums-Helper ----
function startOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function addMonths(d, m){ const x=new Date(d); x.setMonth(x.getMonth()+m); return x; }
function toYMD(d){ const z=new Date(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function ym(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
const TODAY = toYMD(new Date());

// ---- Status-Logik (Anzeige) ----
function computeDisplayStatus(e){
  const now = new Date();
  const start = new Date(`${e.date}T${(e.startAt||"00:00")}:00`);
  const end = new Date(`${e.date}T${(e.endAt||e.startAt||"00:00")}:00`);
  const isPast = (end < now);
  if (e.status === "cancelled") return "abgesagt";
  if (e.status === "done") return "abgeschlossen";
  if (e.status === "open" && isPast) return "abgeschlossen";
  return "offen";
}
function nextStatus(currentDisplay){
  if (currentDisplay === "offen") return "abgesagt";
  if (currentDisplay === "abgesagt") return "abgeschlossen";
  return "offen";
}

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
    for(const e of events){ (map[e.date] ||= []).push(e); }
    Object.values(map).forEach(list => list.sort((a,b)=> (a.startAt??"").localeCompare(b.startAt??"")));
    return map;
  },[events]);

  async function cycleStatus(ev){
    const display = computeDisplayStatus(ev);
    const to = nextStatus(display);
    const map = { "offen":"open", "abgesagt":"cancelled", "abgeschlossen":"done" };
    const status = map[to] || "open";
    const res = await fetch(`/api/appointments/${ev.id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status })
    });
    if(!res.ok){ alert("Status konnte nicht geändert werden."); return; }
    router.refresh();
  }

  return (
    <div className="container" style={{display:"grid", gap:16}}>
      {/* Card 1: Monatskalender */}
      <div className="surface card">
        <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2>Kalender – {fmtMonthYear(cursor)}</h2>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setCursor(addMonths(cursor,-1))} aria-label="Vorheriger Monat">◀︎</button>
            <button className="btn" onClick={()=>setCursor(startOfMonth(new Date()))}>Heute</button>
            <button className="btn" onClick={()=>setCursor(addMonths(cursor,1))} aria-label="Nächster Monat">▶︎</button>
          </div>
        </div>

        <div className="calendar-grid">
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map((h)=>(<div key={h} className="calendar-head">{h}</div>))}
          {days.map((d,i)=>{
            const inMonth = d.getMonth()===cursor.getMonth();
            const key = toYMD(d);
            const list = byDate[key]||[];
            const isToday = key === TODAY;
            return (
              <Link
                href={`/termine/${key}`}
                key={i}
                className={`calendar-cell ${inMonth?"":"muted"} ${isToday?"today":""}`}
                title={`Details für ${fmtLong(d)}`}
              >
                <div className="daynum-wrap">
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

        {loading && <div className="info-row">Lade Termine…</div>}
        {error && !loading && <div className="info-row" style={{color:"var(--danger, #b91c1c)"}}>{error}</div>}
      </div>

      {/* Card 2: Monatsübersicht */}
      <div className="surface card">
        <div className="card-header"><h2>Termine / Aufträge – Übersicht ({fmtMonthYear(cursor)})</h2></div>

        <div className="table">
          <div className="table-row head">
            <div>Datum</div><div>Start</div><div>Art</div><div>Bezeichnung</div><div>Kunde</div><div>Status</div>
          </div>

          {events.map(ev=>{
            const href = `/termine/eintrag/${ev.id}`; // <-- Detailansicht pro Termin
            const displayStatus = computeDisplayStatus(ev);
            return (
              <Link
                href={href}
                key={ev.id}
                className="table-row click-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 88px 100px 1fr 1fr 120px",
                  gap: 8, padding: 10, alignItems: "center",
                  borderBottom: "1px solid rgba(0,0,0,.06)",
                  textDecoration:"none", color:"inherit"
                }}
              >
                <div>{fmtDateDE(ev.date)}</div>
                <div>{ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</div>
                <div>{ev.kind==="order"?"Auftrag":"Termin"}</div>
                <div>{ev.title}</div>
                <div>{ev.customerName || "—"}</div>
                <div>
                  <button
                    onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); cycleStatus(ev); }}
                    className={`status-badge ${displayStatus}`}
                    title="Status ändern"
                  >
                    {displayStatus}
                  </button>
                </div>
              </Link>
            );
          })}

          {(!loading && !error && events.length===0) && (
            <div className="table-row"><div style={{gridColumn:"1/-1"}}>Keine Einträge im ausgewählten Monat.</div></div>
          )}
        </div>
      </div>

      <style jsx>{`
        .calendar-grid{
          display:grid;
          grid-template-columns: repeat(7,1fr);
          gap:10px;
        }
        .calendar-head{
          font-weight:700;
          padding:6px 4px;
          text-align:center;
          opacity:.85;
        }
        .calendar-cell{
          display:flex;
          flex-direction:column;
          gap:8px;
          padding:8px;
          border-radius: var(--radius, 12px);
          background: var(--surface, #fff);
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06));
          text-decoration:none;
          color: inherit;
          min-height: 110px;
          border:1px solid rgba(0,0,0,.12);   /* sichtbarer Rahmen */
        }
        .calendar-cell:hover{ outline:2px solid rgba(0,0,0,.06); }
        .muted{ opacity:.55; }
        .daynum-wrap{ display:flex; justify-content:center; align-items:center; }
        .daynum{
          font-weight:800; width:36px; height:36px; display:flex; align-items:center; justify-content:center;
          border-radius: 999px;
        }
        .today .daynum{ outline: 3px solid var(--color-primary, #0ea5e9); } /* HEUTE markiert */
        .calendar-cell-events{ display:flex; flex-direction:column; gap:6px; }
        .pill{
          border-radius: 999px;
          padding:2px 8px;
          font-size:12px;
          background: #e5e7eb;
          white-space: nowrap; overflow:hidden; text-overflow: ellipsis;
        }
        .pill-info{ background: var(--chip-info, #DBEAFE); }
        .pill-accent{ background: var(--chip-accent, #FDE68A); }

        .table{ display:grid; }
        .table-row{ display:grid; grid-template-columns: 120px 88px 100px 1fr 1fr 120px; gap:8px; padding:10px; align-items:center; }
        .table-row.head{ font-weight:800; border-bottom:1px solid rgba(0,0,0,.1); }
        .click-row:hover{ background: rgba(0,0,0,.02); }
        .card-header{ padding:8px; display:flex; align-items:center; justify-content:space-between; }
        .info-row{ padding:8px 0 0 0; opacity:.8; font-size:14px; }

        .status-badge{
          text-transform: capitalize;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px; border:1px solid rgba(0,0,0,.12);
          background: #fff;
          cursor:pointer;
        }
        .status-badge.offen{ border-color:#60a5fa; }
        .status-badge.abgesagt{ border-color:#f87171; }
        .status-badge.abgeschlossen{ border-color:#34d399; }
      `}</style>
    </div>
  );
}
