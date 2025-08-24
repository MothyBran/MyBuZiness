// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===== Helpers: Datum/Zeit ================================================= */
const ROW_H = 56;   // px pro Stunde (vertikale Skala)
const LABEL_W = 72; // Platz für Stunden-Label innerhalb der Zeile (links)

const pad2 = (n) => String(n).padStart(2, "0");
function toDate(x){
  if (x instanceof Date) return x;
  if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)) {
    const [y,m,d] = x.slice(0,10).split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d = new Date(x || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){ const z = toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function addDays(d, n){ const x = toDate(d); x.setDate(x.getDate()+n); return x; }
function fmtDE(d){ const x=toDate(d); return `${pad2(x.getDate())}.${pad2(x.getMonth()+1)}.${x.getFullYear()}`; }

function minutesFromTime(val){
  const m = String(val ?? "").match(/^(\d{1,2}):(\d{2})/); // robust: nimmt nur HH:MM am Anfang
  if (!m) return 0;
  const h = Math.max(0, Math.min(23, parseInt(m[1],10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
  return h*60 + mm;
}

/* ===== Lanes für Überlappungen ============================================ */
function placeInLanes(input){
  const arr = (input||[]).map(e=>{
    const s = minutesFromTime(e.startAt);
    const eMin = Math.max(s + 30, minutesFromTime(e.endAt || e.startAt)); // min. 30 Min
    return { ...e, _s:s, _e:eMin };
  }).sort((a,b)=> a._s - b._s || a._e - b._e);

  const laneEnds = [];
  let laneCount = 1;
  for (const it of arr){
    let lane = 0;
    while (laneEnds[lane] > it._s) lane++;
    laneEnds[lane] = it._e;
    it._lane = lane;
    laneCount = Math.max(laneCount, lane+1);
  }
  return arr.map(it => ({ ...it, _laneCount: laneCount }));
}

/* ===== Page ================================================================= */
export default function DayPage({ params }){
  const ymd = toYMD(params?.date || new Date());
  const dateObj = toDate(ymd);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [customers, setCustomers] = useState([]);

  const prevYMD = toYMD(addDays(dateObj, -1));
  const nextYMD = toYMD(addDays(dateObj, +1));
  const todayYMD = toYMD(new Date());

  const reload = useCallback(async ()=>{
    setLoading(true); setError("");
    try{
      const r = await fetch(`/api/appointments?date=${ymd}`, { cache:"no-store" });
      if(!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setEvents(Array.isArray(js) ? js : []);
    }catch(e){
      console.error(e);
      setEvents([]); setError("Konnte Einträge nicht laden.");
    }finally{
      setLoading(false);
    }
  },[ymd]);

  useEffect(()=>{ reload(); }, [reload]);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" });
        const js = await r.json().catch(()=>({ data:[] }));
        setCustomers(Array.isArray(js?.data) ? js.data : []);
      }catch{ setCustomers([]); }
    })();
  },[]);

  const placed = useMemo(()=>placeInLanes(events), [events]);

  function openNewAt(hour){
    const start = `${pad2(hour)}:00`;
    setFormInitial({ date: ymd, startAt: start, endAt: null, kind: "appointment", status: "open" });
    setOpenForm(true);
  }
  function onSaved(){ setOpenForm(false); reload(); }

  // Klick überall im Raster: auf volle Stunde runden
  function onTimelineClick(e){
    const host = e.currentTarget;
    const rect = host.getBoundingClientRect();
    const y = e.clientY - rect.top;             // Scroll gibt es innerhalb nicht; Seite darf normal scrollen
    const h = Math.max(0, Math.min(23, Math.floor(y / ROW_H)));
    openNewAt(h);
  }

  return (
    <div className="container">
      {/* Kopf */}
      <div className="surface" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
          <Link href="/termine" className="btn-ghost">← Monatsansicht</Link>
          <h2 className="page-title" style={{margin:0}}>Tagesansicht – {fmtDE(ymd)}</h2>
        </div>
        <div style={{display:"flex", gap:8}}>
          <Link className="btn-ghost" href={`/termine/${prevYMD}`}>◀︎</Link>
          <Link className="btn" href={`/termine/${todayYMD}`}>Heute</Link>
          <Link className="btn-ghost" href={`/termine/${nextYMD}`}>▶︎</Link>
          <button className="btn" onClick={()=>openNewAt(9)}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Timeline (keine linke Leiste; Stunde steht im Container links innen) */}
      <div className="surface" style={{padding:0}}>
        <div
          className="timeline"
          style={{ height: 24*ROW_H, paddingLeft: LABEL_W }}
          onClick={onTimelineClick}
        >
          {/* Stunden-Zeilen (Hintergrund & Label) */}
          {Array.from({length:24}, (_,h)=>(
            <div key={h} className="tl-hour" style={{ top: h*ROW_H, height: ROW_H }}>
              <div className="tl-hour-label">{pad2(h)}:00</div>
            </div>
          ))}

          {/* Events (absolut positioniert, minutengenau) */}
          {placed.map(ev=>{
            const s = Math.max(0, Math.min(24*60, minutesFromTime(ev.startAt)));
            const e = Math.max(s+30, Math.min(24*60, minutesFromTime(ev.endAt || ev.startAt)));
            const top = (s/60) * ROW_H;
            const height = Math.max(20, ((e-s)/60) * ROW_H);
            const laneW = 100 / ev._laneCount;
            const leftPct = ev._lane * laneW;
            const widthPct = laneW - 1;

            const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?` – ${String(ev.endAt).slice(0,5)}`:""}`;
            const isOrder = ev.kind === "order";

            return (
              <Link
                key={ev.id}
                href={`/termine/eintrag/${ev.id}`}
                className={`tl-event ${isOrder ? "is-order" : "is-appt"}`}
                style={{ top, height, left: `${leftPct}%`, width: `${widthPct}%` }}
                onClick={(e)=>e.stopPropagation()} // verhindert, dass der Timeline-Klick mit feuert
                title={`${ev.title || "(ohne Titel)"} • ${timeTxt}`}
              >
                <div className="tl-event-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                <div className="tl-event-meta ellipsis">{timeTxt}{ev.customerName?` · ${ev.customerName}`:""}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Liste darunter */}
      <div className="surface">
        <div className="section-title" style={{marginBottom:8}}>Alle Einträge am {fmtDE(ymd)}</div>
        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{color:"#b91c1c"}}>{error}</div>}
        {!loading && !error && placed.length===0 && <div className="subtle">Keine Einträge.</div>}
        {!loading && !error && placed.length>0 && (
          <div className="list">
            {placed.map(ev=>{
              const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?`–${String(ev.endAt).slice(0,5)}`:""}`;
              return (
                <Link key={ev.id} href={`/termine/eintrag/${ev.id}`} className="list-item" style={{textDecoration:"none"}}>
                  <div className={`item-icon ${ev.kind==='order'?'accent':''}`}>{ev.kind==='order'?"🧾":"📅"}</div>
                  <div style={{minWidth:0}}>
                    <div className="item-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                    <div className="item-meta ellipsis">{timeTxt}{ev.customerName?` · ${ev.customerName}`:""}</div>
                  </div>
                  <div className="item-actions">
                    <span className={`status-badge ${
                      ev.status==="cancelled" ? "abgesagt" :
                      ev.status==="done" ? "abgeschlossen" : "offen"
                    }`} style={{textTransform:"none"}}>
                      {ev.status==="cancelled"?"abgesagt":ev.status==="done"?"abgeschlossen":"offen"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Neuer Eintrag */}
      <Modal open={openForm} onClose={()=>setOpenForm(false)} title="+ Neuer Eintrag" maxWidth={720}>
        <AppointmentForm initial={formInitial} customers={customers} onSaved={onSaved} onCancel={()=>setOpenForm(false)} />
      </Modal>

      {/* Seiten-spezifische Styles */}
      <style jsx>{`
        .timeline{
          position: relative;
          background: #fff;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer; /* Klick auf Stundenzeile */
        }
        .tl-hour{
          position: absolute; left: 0; right: 0;
          border-top: 1px solid rgba(0,0,0,.06);
          background-image: linear-gradient(to right, rgba(0,0,0,.03), rgba(0,0,0,0));
        }
        .tl-hour:last-child{ border-bottom: 1px solid rgba(0,0,0,.06); }
        .tl-hour-label{
          position: absolute; left: 8px; top: 6px; width: ${LABEL_W - 16}px;
          font-size: 12px; color: var(--color-muted); user-select:none; pointer-events:none;
        }

        .tl-event{
          position: absolute;
          border-radius: 10px;
          padding: 8px 10px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          text-decoration: none;
          color: inherit;
          overflow: hidden;
          background: #EFF6FF;              /* default Termin */
          border-left: 4px solid #3B82F6;
          z-index: 2;                        /* liegt über Raster, stört aber Timeline-Klick nicht dank stopPropagation */
        }
        .tl-event.is-order{
          background: #FEF3C7; border-left-color: #F59E0B;
        }
        .tl-event-title{ font-weight:700; font-size:14px; }
        .tl-event-meta{ font-size:12px; opacity:.85; }
        .ellipsis{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      `}</style>
    </div>
  );
}
