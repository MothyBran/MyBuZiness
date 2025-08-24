// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ====================== Zeit/Datum Utils ====================== */
const ROW_H = 56;   // Höhe je Stunde (px) – passt die vertikale Skala
const LABEL_W = 72; // Platz für die Stunden-Labels innerhalb der Zeile (links)

function pad2(n){ return String(n).padStart(2,"0"); }
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string"){
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)){
      const [y,m,d] = input.split("-").map(Number);
      return new Date(y, m-1, d, 12,0,0,0);
    }
    const d = new Date(input);
    if (!Number.isNaN(d)) return d;
  }
  const d = new Date();
  return d;
}
function toYMD(d){
  const z = toDate(d);
  z.setHours(12,0,0,0);
  return z.toISOString().slice(0,10);
}
function addDays(d, n){ const x=new Date(toDate(d)); x.setDate(x.getDate()+n); return x; }
function formatDateDE(input){
  const d=toDate(input);
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
}
function parseMinutes(t){
  // akzeptiert HH:MM oder HH:MM:SS
  if (!t || typeof t!=="string") return 0;
  const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(t.trim());
  if (!m) return 0;
  const h = parseInt(m[1],10), mi = parseInt(m[2],10);
  return h*60 + mi;
}
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

/* ========== Lane-Berechnung (Überlappungen nebeneinander anzeigen) ========== */
function placeInLanes(list){
  // sortiert nach Start (dann Ende)
  const items = (list||[]).map(e=>{
    const s = parseMinutes(e.startAt?.slice(0,5) || "00:00");
    const eMin = Math.max(s + 30, parseMinutes(e.endAt?.slice(0,5) || e.startAt?.slice(0,5) || "00:00"));
    return { ...e, _s: s, _e: eMin };
  }).sort((a,b)=> a._s - b._s || a._e - b._e);

  const laneEnds = []; // letzten End-Minute je Lane
  let laneCount = 1;

  for(const it of items){
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
  const dateParam = String(params?.date || toYMD(new Date()));
  const ymd = toYMD(dateParam);
  const dateObj = toDate(ymd);

  const [events, setEvents] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const [openForm,setOpenForm] = useState(false);
  const [formInitial,setFormInitial] = useState(null);
  const [customers,setCustomers] = useState([]);

  const prevYMD = toYMD(addDays(dateObj, -1));
  const nextYMD = toYMD(addDays(dateObj, +1));
  const todayYMD = toYMD(new Date());

  // Laden
  async function reload(){
    setLoading(true); setError("");
    try{
      const r = await fetch(`/api/appointments?date=${ymd}`, { cache:"no-store" });
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setEvents(Array.isArray(js)?js:[]);
    }catch(err){
      console.error(err); setEvents([]); setError("Konnte Einträge nicht laden.");
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ reload(); }, [ymd]);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" });
        const js = await r.json().catch(()=>({ data: [] }));
        setCustomers(Array.isArray(js?.data)?js.data:[]);
      }catch{ setCustomers([]); }
    })();
  },[]);

  function openNewAt(hour){
    const start = `${pad2(hour)}:00`;
    setFormInitial({ date: ymd, startAt: start, endAt: null, kind: "appointment", status: "open" });
    setOpenForm(true);
  }
  function onSaved(){
    setOpenForm(false);
    reload();
  }

  const placed = useMemo(()=>placeInLanes(events), [events]);

  return (
    <div className="container">
      {/* Kopf */}
      <div className="surface" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <Link href="/termine" className="btn-ghost">← Monatsansicht</Link>
          <h2 className="page-title" style={{margin:0}}>Tagesansicht – {formatDateDE(ymd)}</h2>
        </div>
        <div style={{display:"flex", gap:8}}>
          <Link className="btn-ghost" href={`/termine/${prevYMD}`}>◀︎</Link>
          <Link className="btn" href={`/termine/${todayYMD}`}>Heute</Link>
          <Link className="btn-ghost" href={`/termine/${nextYMD}`}>▶︎</Link>
          <button className="btn" onClick={()=>openNewAt(9)}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Timeline: nur eine Spalte; Stunde steht im jeweiligen Container links innen */}
      <div className="surface" style={{padding:0}}>
        <div className="daylane" style={{ height: 24*ROW_H, paddingLeft: LABEL_W }}>
          {/* Stunden-Container als Hintergrund + Klickflächen */}
          {Array.from({length:24}, (_,h)=>(
            <div key={h} className="hourRow" style={{ top: h*ROW_H, height: ROW_H }}>
              {/* Label links im Container */}
              <div className="hourLabel">{pad2(h)}:00</div>
              {/* Klickfläche für neue Einträge (volle Stunde) */}
              <button
                type="button"
                className="hourClick"
                title={`+ Neuer Eintrag ${pad2(h)}:00`}
                onClick={()=>openNewAt(h)}
              />
            </div>
          ))}

          {/* Events-Layer */}
          <div className="eventsLayer">
            {placed.map(ev=>{
              const startMin = clamp(ev._s, 0, 24*60);
              const endMin   = clamp(ev._e, 0, 24*60);
              const top = Math.round((startMin/60) * ROW_H);
              const height = Math.max(20, Math.round(((endMin - startMin)/60) * ROW_H));
              const laneW = 100 / ev._laneCount;
              const leftPct = ev._lane * laneW;
              const widthPct = laneW - 1; // kleine Gasse zwischen Lanes

              const timeTxt = `${(ev.startAt||"").slice(0,5)}${ev.endAt ? ` – ${ev.endAt.slice(0,5)}` : ""}`;
              const isOrder = ev.kind === "order";

              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  className={`eventBox ${isOrder ? "isOrder":"isAppt"}`}
                  style={{
                    top, height,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                  title={`${ev.title || "(ohne Titel)"} • ${timeTxt}`}
                >
                  <div className="eventTitle ellipsis">{ev.title || "(ohne Titel)"}</div>
                  <div className="eventMeta ellipsis">
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
        <div className="section-title" style={{marginBottom:8}}>Alle Einträge am {formatDateDE(ymd)}</div>
        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{color:"#b91c1c"}}>{error}</div>}
        {!loading && !error && placed.length===0 && <div className="subtle">Keine Einträge.</div>}
        {!loading && !error && placed.length>0 && (
          <div className="list">
            {placed.map(ev=>{
              const timeTxt = `${(ev.startAt||"").slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""}`;
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

      {/* Seitenlokale Styles speziell für die Timeline */}
      <style jsx>{`
        .daylane{
          position: relative;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .hourRow{
          position: absolute;
          left: 0; right: 0;
          border-top: 1px solid rgba(0,0,0,.06);
          background-image: linear-gradient(to right, rgba(0,0,0,.03), rgba(0,0,0,0));
        }
        .hourRow:last-child{
          border-bottom: 1px solid rgba(0,0,0,.06);
        }
        .hourLabel{
          position: absolute;
          left: 8px;
          top: 6px;
          width: ${LABEL_W - 16}px;
          font-size: 12px;
          color: var(--color-muted);
          user-select: none;
          pointer-events: none;
        }
        .hourClick{
          position: absolute;
          left: 0; right: 0; top: 0; bottom: 0;
          background: transparent;
          border: 0;
          cursor: pointer;
        }
        .hourClick:hover{
          background: rgba(37,99,235,.045);
        }

        .eventsLayer{
          position: absolute;
          inset: 0;
          padding-left: 8px;   /* kleine Innenluft rechts vom Label */
          padding-right: 8px;
        }
        .eventBox{
          position: absolute;
          border-radius: 10px;
          padding: 8px 10px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          text-decoration: none;
          color: inherit;
          overflow: hidden;
        }
        .eventBox.isAppt{
          background: #EFF6FF;
          border-left: 4px solid #3B82F6;
        }
        .eventBox.isOrder{
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
        }
        .eventTitle{ font-weight: 700; font-size: 14px; }
        .eventMeta{ font-size: 12px; opacity: .85; }
        .ellipsis{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @media (max-width: 640px){
          .eventsLayer{ padding-left: 6px; padding-right: 6px; }
        }
      `}</style>
    </div>
  );
}
