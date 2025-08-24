// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===== Datum/Zeit Utils ===== */
const ROW_H = 44;   // Höhe je Stunde (px) – passt zur früheren Vorgabe (30 min = 22 px)
const LABEL_W = 72; // Platz für das Stundenlabel (links im Stunden-Container)
const LANE_GAP = 1; // % Spalt zwischen überlappenden Segmenten

const pad2 = (n) => String(n).padStart(2,"0");
function toDate(x){
  if (x instanceof Date) return x;
  if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)){
    const [y,m,d] = x.slice(0,10).split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d = new Date(x || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){ const z=toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function addDays(d, n){ const x=toDate(d); x.setDate(x.getDate()+n); return x; }
function fmtDE(d){ const x=toDate(d); return `${pad2(x.getDate())}.${pad2(x.getMonth()+1)}.${x.getFullYear()}`; }

/** robust: holt HH:MM auch aus "09:00:00+01" */
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

/* ===== Lanes (Überlappungen nebeneinander) ===== */
function placeInLanes(list){
  const items = (list||[]).map(e=>{
    const s = minutesFromTime(e.startAt);
    const eMin = Math.max(s + 30, minutesFromTime(e.endAt || e.startAt)); // mind. 30 Min
    return { ...e, _s: s, _e: eMin };
  }).sort((a,b)=> a._s - b._s || a._e - b._e);

  const laneEnds = [];
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

/* ===== pro Stunde segmentieren =====
   Für jede Stunde (0..23) wird der überlappende Teil eines Events als Segment berechnet.
   Das Segment wird im jeweiligen Stunden-Container relativ positioniert:
   - Oberkante = :00
   - Mitte     = :30
   - Viertel   = :15/:45 (Hilfslinien)
=================================================================== */
function splitIntoHourSegments(placed){
  const byHour = Array.from({length:24}, ()=>[]);
  for (const ev of placed){
    const s = Math.max(0, Math.min(24*60, ev._s));
    const e = Math.max(0, Math.min(24*60, ev._e));
    const hStart = Math.floor(s/60);
    const hEnd   = Math.floor(Math.max(s, e-1)/60); // e-1, damit 10:00 nicht mehr in 10:00 fällt
    for (let h = hStart; h <= hEnd; h++){
      const hourStart = h*60, hourEnd=(h+1)*60;
      const segStart  = Math.max(s, hourStart);
      const segEnd    = Math.min(e, hourEnd);
      const segTop    = ((segStart - hourStart)/60) * ROW_H;   // :00=0, :30=Row_H/2, :45=Row_H*0.75
      const segHeight = Math.max(6, ((segEnd - segStart)/60) * ROW_H);
      byHour[h].push({
        ...ev,
        _segTop: segTop,
        _segHeight: segHeight,
      });
    }
  }
  return byHour;
}

/* ===== Seite ===== */
export default function DayPage({ params }){
  const ymd = toYMD(params?.date || new Date());
  const dateObj = toDate(ymd);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

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
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setEvents(Array.isArray(js) ? js : []);
    }catch(err){
      console.error(err); setEvents([]); setError("Konnte Einträge nicht laden.");
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
  const segmentsByHour = useMemo(()=>splitIntoHourSegments(placed), [placed]);

  function openNewAt(hour){
    const start = `${pad2(hour)}:00`;
    const end = addMinutes(start, 60);
    setFormInitial({ date: ymd, startAt: start, endAt: end, kind:"appointment", status:"open" });
    setOpenForm(true);
  }
  function onSaved(){ setOpenForm(false); reload(); }

  return (
    <div className="container">
      {/* Kopf */}
      <div className="surface" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Link href="/termine" className="btn-ghost">← Monatsansicht</Link>
          <h2 className="page-title" style={{ margin:0 }}>Tagesansicht – {fmtDE(ymd)}</h2>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Link className="btn-ghost" href={`/termine/${prevYMD}`}>◀︎</Link>
          <Link className="btn" href={`/termine/${todayYMD}`}>Heute</Link>
          <Link className="btn-ghost" href={`/termine/${nextYMD}`}>▶︎</Link>
          <button className="btn" onClick={()=>openNewAt(9)}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Timeline – nutzt DEINE .surface / .day-block / .day-block-inner */}
      <div className="surface" style={{ padding: 0 }}>
        <div>
          {Array.from({length:24}, (_,h)=>(
            <div
              key={h}
              className="day-block"
              style={{ height: ROW_H, borderRadius: 0 /* eckig, berühren sich */ }}
              onClick={()=>openNewAt(h)}
              title={`+ Neuer Eintrag ${pad2(h)}:00`}
            >
              <div className="day-block-inner" style={{ position:"relative", height: "100%", paddingLeft: LABEL_W }}>
                {/* Stunden-Label links im Container */}
                <div
                  style={{
                    position:"absolute", left: 8, top: 6, width: LABEL_W-16,
                    fontSize:12, color:"var(--color-muted)", userSelect:"none", pointerEvents:"none"
                  }}
                >
                  {pad2(h)}:00
                </div>

                {/* Viertel-Hilfslinien :15 / :30 / :45 */}
                <div style={{ position:"absolute", left:0, right:0, top: ROW_H*0.25, borderTop:"1px dashed rgba(0,0,0,.08)" }} />
                <div style={{ position:"absolute", left:0, right:0, top: ROW_H*0.50, borderTop:"1px dashed rgba(0,0,0,.08)" }} />
                <div style={{ position:"absolute", left:0, right:0, top: ROW_H*0.75, borderTop:"1px dashed rgba(0,0,0,.08)" }} />

                {/* Segmente dieser Stunde – absolut innerhalb des Stunden-Containers */}
                <div style={{ position:"absolute", inset: 0, left: LABEL_W, right: 8 }}>
                  {segmentsByHour[h].map(ev=>{
                    const laneW = 100 / ev._laneCount;
                    const leftPct = ev._lane * laneW;
                    const widthPct = laneW - LANE_GAP;
                    const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?` – ${String(ev.endAt).slice(0,5)}`:""}`;
                    const isOrder = ev.kind === "order";
                    return (
                      <Link
                        key={`${ev.id}-${h}`}
                        href={`/termine/eintrag/${ev.id}`}
                        onClick={(e)=>e.stopPropagation()} // verhindert, dass die Stundenklick-Logik greift
                        className="seg"
                        style={{
                          position:"absolute",
                          top: Math.round(ev._segTop),
                          height: Math.round(ev._segHeight),
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: isOrder ? "#FEF3C7" : "#EFF6FF",
                          border: "1px solid var(--color-border)",
                          borderLeft: `4px solid ${isOrder ? "#F59E0B" : "#3B82F6"}`,
                          borderRadius: 8,
                          padding: "6px 8px",
                          boxShadow: "var(--shadow-sm)",
                          color: "inherit",
                          textDecoration: "none",
                          overflow: "hidden"
                        }}
                        title={`${ev.title || "(ohne Titel)"} • ${timeTxt}`}
                      >
                        <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {ev.title || "(ohne Titel)"}
                        </div>
                        <div style={{ fontSize:12, opacity:.85, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {timeTxt}{ev.customerName?` · ${ev.customerName}`:""}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liste darunter (unverändert deine globalen Styles) */}
      <div className="surface">
        <div className="section-title" style={{ marginBottom: 8 }}>Alle Einträge am {fmtDE(ymd)}</div>
        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{ color:"#b91c1c" }}>{error}</div>}
        {!loading && !error && placed.length===0 && <div className="subtle">Keine Einträge.</div>}
        {!loading && !error && placed.length>0 && (
          <div className="list">
            {placed.map(ev=>{
              const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""}`;
              return (
                <Link key={ev.id} href={`/termine/eintrag/${ev.id}`} className="list-item" style={{ textDecoration:"none" }}>
                  <div className={`item-icon ${ev.kind==='order'?'accent':''}`}>{ev.kind==='order'?"🧾":"📅"}</div>
                  <div style={{ minWidth:0 }}>
                    <div className="item-title">{ev.title || "(ohne Titel)"}</div>
                    <div className="item-meta">{timeTxt}{ev.customerName?` · ${ev.customerName}`:""}</div>
                  </div>
                  <div className="item-actions">
                    <span className={`status-badge ${
                      ev.status==="cancelled" ? "abgesagt" :
                      ev.status==="done" ? "abgeschlossen" : "offen"
                    }`} style={{ textTransform:"none" }}>
                      {ev.status==="cancelled"?"abgesagt":ev.status==="done"?"abgeschlossen":"offen"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
