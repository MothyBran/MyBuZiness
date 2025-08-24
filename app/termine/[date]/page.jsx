// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ====================== Zeit/Datum Utils ====================== */
const ROW_H = 60;   // Höhe je Stunde (px) – :30 liegt genau in der Mitte
const LABEL_W = 72; // Platz für die Stunden-Labels innerhalb der Stunde (links)

const pad2 = (n) => String(n).padStart(2,"0");
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input==="string" && /^\d{4}-\d{2}-\d{2}/.test(input)){
    const [y,m,d] = input.slice(0,10).split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){ const z = toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function addDays(d, n){ const x = toDate(d); x.setDate(x.getDate()+n); return x; }
function fmtDE(d){ const x=toDate(d); return `${pad2(x.getDate())}.${pad2(x.getMonth()+1)}.${x.getFullYear()}`; }

/** robust: liest HH:MM auch aus "09:00:00+01" heraus */
function minutesFromTime(val){
  const m = String(val ?? "").match(/^\s*(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const h = Math.max(0, Math.min(23, parseInt(m[1],10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
  return h*60 + mm;
}
function addMinutes(hhmm, minutes){
  const t = minutesFromTime(hhmm) + minutes;
  const h = Math.max(0, Math.min(23, Math.floor(t/60)));
  const m = Math.max(0, Math.min(59, t%60));
  return `${pad2(h)}:${pad2(m)}`;
}

/* ================== Überlappungen: Lanes ====================== */
function placeInLanes(list){
  const items = (list||[]).map(e=>{
    const s = minutesFromTime(e.startAt);
    const eMin = Math.max(s + 30, minutesFromTime(e.endAt || e.startAt)); // mind. 30 Minuten
    return { ...e, _s: s, _e: eMin };
  }).sort((a,b)=> a._s - b._s || a._e - b._e);

  const laneEnds = []; // pro Lane: letztes Ende (in Min)
  let laneCount = 1;
  for (const it of items){
    let lane = 0;
    while (laneEnds[lane] > it._s) lane++;
    laneEnds[lane] = it._e;
    it._lane = lane;
    laneCount = Math.max(laneCount, lane+1);
  }
  return items.map(it => ({ ...it, _laneCount: laneCount }));
}

/* ============================ Seite ============================ */
export default function DayPage({ params }){
  const ymd = toYMD(params?.date || new Date());
  const dateObj = toDate(ymd);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [customers, setCustomers] = useState([]);

  const prevYMD = toYMD(addDays(dateObj,-1));
  const nextYMD = toYMD(addDays(dateObj,+1));
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
    // Standarddauer 60 Min
    const end = addMinutes(start, 60);
    setFormInitial({ date: ymd, startAt: start, endAt: end, kind:"appointment", status:"open" });
    setOpenForm(true);
  }
  function onSaved(){ setOpenForm(false); reload(); }

  return (
    <div className="container">
      {/* Kopf */}
      <div className="surface" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
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

      {/* Timeline: nur eine Spalte, Stunden-Label IM Container links */}
      <div className="surface" style={{padding:0}}>
        <div className="timeline" style={{ height: 24*ROW_H, paddingLeft: LABEL_W }}>
          {/* Stunde-Container: berühren sich, eckig, jeweils :00 oben / :30 Mitte / :59 unten */}
          {Array.from({length:24}, (_,h)=>(
            <div key={h} className="tl-hour" style={{ top: h*ROW_H, height: ROW_H }}>
              <div className="tl-hour-label">{pad2(h)}:00</div>

              {/* Hilfslinien für :15 / :30 / :45 */}
              <div className="tl-q q15" />
              <div className="tl-q q30" />
              <div className="tl-q q45" />

              {/* Klickfläche für die volle Stunde */}
              <button
                type="button"
                className="tl-hour-click"
                title={`+ Neuer Eintrag ${pad2(h)}:00`}
                onClick={(e)=>{ e.stopPropagation(); openNewAt(h); }}
              />
            </div>
          ))}

          {/* Events (minutengenau positioniert, laufen über mehrere Stunden) */}
          <div className="events-layer">
            {placed.map(ev=>{
              const s = minutesFromTime(ev.startAt);
              const e = Math.max(s+30, minutesFromTime(ev.endAt || ev.startAt));
              const top = (s/60) * ROW_H;                         // :00 = Oberkante, :30 = Mitte, etc.
              const height = Math.max(20, ((e-s)/60) * ROW_H);    // Dauer als Höhe
              const laneW = 100 / ev._laneCount;
              const leftPct = ev._lane * laneW;
              const widthPct = laneW - 1; // kleine Gasse

              const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?` – ${String(ev.endAt).slice(0,5)}`:""}`;
              const isOrder = ev.kind === "order";

              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  className={`tl-event ${isOrder ? "is-order" : "is-appt"}`}
                  style={{ top, height, left: `${leftPct}%`, width: `${widthPct}%` }}
                  onClick={(e)=>e.stopPropagation()}
                  title={`${ev.title || "(ohne Titel)"} • ${timeTxt}`}
                >
                  <div className="tl-event-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                  <div className="tl-event-meta ellipsis">
                    {timeTxt}{ev.customerName ? ` · ${ev.customerName}` : ""}
                  </div>
                </Link>
              );
            })}
          </div>
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

      {/* Modal */}
      <Modal
        open={openForm}
        onClose={()=>setOpenForm(false)}
        title="+ Neuer Eintrag"
        maxWidth={720}
      >
        <AppointmentForm
          initial={formInitial}
          customers={customers}
          onSaved={onSaved}
          onCancel={()=>setOpenForm(false)}
        />
      </Modal>

      {/* Seiten-Styles: eckige Stunden-Container, Labels im Container, Viertel-Linien */}
      <style jsx>{`
        .timeline{
          position: relative;
          background: #fff;
          border: 1px solid var(--color-border);
          border-radius: 0;              /* eckig */
          overflow: hidden;
        }
        .tl-hour{
          position: absolute;
          left: 0; right: 0;
          border-top: 1px solid rgba(0,0,0,.10); /* klare Trennung, Container berühren sich */
          background: #fff;
        }
        .tl-hour:first-child{ border-top: none; }
        .tl-hour-label{
          position: absolute;
          left: 8px;
          top: 6px;
          width: ${LABEL_W - 16}px;
          font-size: 12px;
          color: var(--color-muted);
          user-select: none;
          pointer-events: none;
        }
        .tl-q{
          position: absolute; left: 0; right: 0;
          border-top: 1px dashed rgba(0,0,0,.07);
        }
        .tl-q.q15{ top: ${ROW_H * 0.25}px; }
        .tl-q.q30{ top: ${ROW_H * 0.50}px; }
        .tl-q.q45{ top: ${ROW_H * 0.75}px; }

        .tl-hour-click{
          position: absolute; inset: 0;
          background: transparent; border: 0; cursor: pointer;
        }
        .tl-hour-click:hover{ background: rgba(37,99,235,.045); }

        .events-layer{
          position: absolute;
          inset: 0;
          padding-left: ${LABEL_W}px;   /* Events starten rechts vom Label */
          padding-right: 8px;
          z-index: 2;
        }
        .tl-event{
          position: absolute;
          border: 1px solid var(--color-border);
          border-left-width: 4px;
          background: #EFF6FF;          /* Termin */
          border-left-color: #3B82F6;
          border-radius: 8px;
          padding: 8px 10px;
          box-shadow: var(--shadow-sm);
          text-decoration: none;
          color: inherit;
          overflow: hidden;
        }
        .tl-event.is-order{
          background: #FEF3C7; border-left-color: #F59E0B;
        }
        .tl-event-title{ font-weight:700; font-size:14px; }
        .tl-event-meta{ font-size:12px; opacity:.85; }
        .ellipsis{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        @media (max-width: 640px){
          .timeline{ border-left-width: 0; border-right-width: 0; }
          .events-layer{ padding-left: ${LABEL_W - 8}px; padding-right: 6px; }
        }
      `}</style>
    </div>
  );
}
