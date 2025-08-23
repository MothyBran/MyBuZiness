// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===== Zeit/Datum-Utils =================================================== */
const ROW_H = 48; // px pro Stunde – muss zu CSS passen
function pad2(n){ return String(n).padStart(2,"0"); }
function toDate(value){
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y,m,d] = value.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(value || Date.now());
  return isNaN(d) ? new Date() : d;
}
function formatDateDE(value){
  const d = toDate(value);
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
}
function addDays(d, days){
  const x = toDate(d);
  x.setDate(x.getDate()+days);
  return x;
}
function toYMD(d){
  const z = toDate(d);
  z.setHours(12,0,0,0);
  return z.toISOString().slice(0,10);
}
function parseHHMM(hhmm){
  if(!hhmm || typeof hhmm!=="string") return 0;
  const [h,m] = hhmm.split(":").map(x=>parseInt(x||"0",10));
  return (h*60 + (m||0))|0;
}
function addMinutes(hhmm, minutes){
  const total = parseHHMM(hhmm) + minutes;
  const h = Math.max(0, Math.min(23, Math.floor(total/60)));
  const m = Math.max(0, Math.min(59, total%60));
  return `${pad2(h)}:${pad2(m)}`;
}

/* ===== Lanes für Überlappungen =========================================== */
function prepareLanes(list){
  // sortiert nach Start
  const items = (list||[]).map(e=>{
    const start = parseHHMM(e.startAt || "00:00");
    const end = Math.max(start + 30, parseHHMM(e.endAt || e.startAt || "00:00")); // mindestens 30 Min
    return { ...e, _startMin: start, _endMin: end };
  }).sort((a,b)=> a._startMin - b._startMin || a._endMin - b._endMin);

  const lanesEnd = []; // pro Lane: Ende in Minuten
  let maxLanes = 1;
  for(const it of items){
    let lane = 0;
    while(lanesEnd[lane] > it._startMin) lane++;
    lanesEnd[lane] = it._endMin;
    it._lane = lane;
    maxLanes = Math.max(maxLanes, lane+1);
  }
  return items.map(it => ({ ...it, _laneCount: maxLanes }));
}

export default function DayPage(){
  const params = useParams();
  const router = useRouter();
  const dateParam = String(params?.date || "");
  const dateObj = toDate(dateParam);
  const ymd = toYMD(dateObj);

  const [events, setEvents] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [customers, setCustomers] = useState([]);

  // Termine laden
  async function load(){
    setLoading(true); setError("");
    try{
      const res = await fetch(`/api/appointments?date=${ymd}`, { cache:"no-store" });
      if(!res.ok) throw new Error(await res.text());
      const js = await res.json();
      setEvents(Array.isArray(js) ? js : []);
    }catch(err){
      console.error(err); setError("Konnte Einträge nicht laden."); setEvents([]);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, [ymd]);

  // Kundenliste (optional, falls vorhanden)
  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" });
        const js = await r.json().catch(()=>({ data: [] }));
        setCustomers(Array.isArray(js?.data) ? js.data : []);
      }catch(_){ setCustomers([]); }
    })();
  },[]);

  // Klick auf Stundenstreifen => Formular mit vorbelegter Zeit
  function openNewAt(hour){
    const start = `${pad2(hour)}:00`;
    const end = addMinutes(start, 30);
    setFormInitial({ kind:"appointment", title:"", date: ymd, startAt:start, endAt:end });
    setOpenForm(true);
  }

  // Navigation Tag zurück/Heute/weiter
  const prevYMD = toYMD(addDays(dateObj, -1));
  const nextYMD = toYMD(addDays(dateObj, +1));
  const todayYMD = toYMD(new Date());

  // Events inkl. Lane-Infos
  const prepared = useMemo(()=>prepareLanes(events), [events]);

  return (
    <div className="container">
      <div className="surface" style={{ display:"grid", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <Link href="/termine" className="btn-ghost">← Zur Monatsansicht</Link>
            <h2 className="page-title" style={{ margin:0 }}>Tagesansicht – {formatDateDE(ymd)}</h2>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Link className="btn-ghost" href={`/termine/${prevYMD}`}>◀︎</Link>
            <Link className="btn" href={`/termine/${todayYMD}`}>Heute</Link>
            <Link className="btn-ghost" href={`/termine/${nextYMD}`}>▶︎</Link>
          </div>
        </div>

        {/* Timeline */}
        <div className="dayview">
          {/* linke Spalte: EINMAL die Stunden */}
          <div className="dayview-hours">
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="dayview-hour">{pad2(h)}:00</div>
            ))}
          </div>

          {/* rechte Spalte: Gitter + Events */}
          <div className="dayview-grid" style={{ height: 24*ROW_H }}>
            {/* Klickflächen je Stunde */}
            {Array.from({length:24}, (_,h)=>(
              <div
                key={h}
                className="dayview-hourstrip"
                style={{ top: h*ROW_H, height: ROW_H }}
                onClick={()=>openNewAt(h)}
                title={`+ Neuer Eintrag um ${pad2(h)}:00`}
              />
            ))}

            {/* Events */}
            {prepared.map(ev=>{
              const top = (ev._startMin/60) * ROW_H;
              const height = Math.max(22, ((ev._endMin - ev._startMin)/60) * ROW_H);
              const laneW = 100 / ev._laneCount;
              const leftPct = ev._lane * laneW;
              const widthPct = laneW - 2; // kleine Gasse
              const isOrder = ev.kind === "order";
              const timeTxt = `${(ev.startAt||"").slice(0,5)}${ev.endAt?` – ${ev.endAt.slice(0,5)}`:""}`;

              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  className={`dayview-event ${isOrder?"is-order":"is-appt"}`}
                  style={{
                    top, height,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                >
                  <div className="dayview-event-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                  <div className="dayview-event-meta ellipsis">{timeTxt}{ev.customerName?` · ${ev.customerName}`:""}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Liste darunter (ganze Zeile klickbar) */}
        <div className="surface" style={{ padding:12 }}>
          <div className="section-title" style={{ marginBottom:8 }}>Alle Einträge am {formatDateDE(ymd)}</div>
          <div className="appt-list">
            {prepared.length === 0 && <div className="subtle">Keine Einträge.</div>}
            {prepared.map(ev=>{
              const timeTxt = `${(ev.startAt||"").slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""}`;
              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  className="appt-item"
                  style={{ textDecoration:"none" }}
                >
                  <div className={`appt-icon ${ev.kind==='order'?'appt-icon--order':''}`} title={ev.kind==='order'?'Auftrag':'Termin'}>
                    {ev.kind==='order' ? "🧾" : "📅"}
                  </div>
                  <div style={{minWidth:0}}>
                    <div className="appt-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                    <div className="appt-meta ellipsis">{timeTxt}{ev.customerName?` · ${ev.customerName}`:""}</div>
                  </div>
                  <div className="appt-actions">
                    {/* nur Label, kein Button */}
                    <span className="status-badge offen" style={{ textTransform:"none" }}>
                      {ev.status === "cancelled" ? "abgesagt" : ev.status === "done" ? "abgeschlossen" : "offen"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Neuer/Änderung */}
      <Modal
        open={openForm}
        onClose={()=>setOpenForm(false)}
        title="+ Neuer Eintrag"
        maxWidth={720}
      >
        <AppointmentForm
          initial={formInitial}
          customers={customers}
          onSaved={()=>{ setOpenForm(false); load(); }}
          onCancel={()=>setOpenForm(false)}
        />
      </Modal>

      {/* lokale Styles */}
      <style jsx>{`
        .dayview{
          --rowH: ${ROW_H}px;
          display:grid;
          grid-template-columns: 64px 1fr;
          gap: 12px;
        }
        .dayview-hours{
          position:relative;
          user-select:none;
        }
        .dayview-hour{
          height: var(--rowH);
          font-size: 12px;
          color: var(--color-muted);
          display:flex; align-items:flex-start; justify-content:flex-end;
          padding-top: 2px;
        }
        .dayview-grid{
          position:relative;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: #fff;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--rowH) - 1px),
            rgba(0,0,0,.06) calc(var(--rowH) - 1px),
            rgba(0,0,0,.06) var(--rowH)
          );
          overflow:hidden;
        }
        .dayview-hourstrip{
          position:absolute; left:0; right:0;
          cursor:pointer;
          background: transparent;
        }
        .dayview-hourstrip:hover{
          background: rgba(37,99,235,.04);
        }
        .dayview-event{
          position:absolute;
          padding: 6px 8px;
          border-radius: 10px;
          box-shadow: var(--shadow-sm);
          border-left: 4px solid #93C5FD;
          background: #EFF6FF;
          color: #0B1A33;
          text-decoration:none;
          display:block;
        }
        .dayview-event.is-order{
          border-left-color: #FBBF24;
          background: #FEF3C7;
        }
        .dayview-event-title{ font-weight:700; font-size:14px; }
        .dayview-event-meta{ font-size:12px; opacity:.8; }
        .ellipsis{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 640px){
          .dayview{ grid-template-columns: 52px 1fr; }
        }
      `}</style>
    </div>
  );
}
