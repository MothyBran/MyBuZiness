// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ====================== Zeit/Datum Utils ====================== */
const ROW_H = 60;   // Höhe je Stunde (px) – :30 ist exakt die Mitte
const LABEL_W = 72; // Platz für das Stunden-Label innerhalb der Zeile (links)
const GAP_PCT = 1;  // kleiner Spalt zwischen Lanes in Prozent

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
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function addMinutes(hhmm, minutes){
  const t = minutesFromTime(hhmm) + minutes;
  const h = Math.max(0, Math.min(23, Math.floor(t/60)));
  const m = Math.max(0, Math.min(59, t%60));
  return `${pad2(h)}:${pad2(m)}`;
}

/* ================== Lane-Zuordnung (Überlappungen nebeneinander) ================== */
function placeInLanes(list){
  const items = (list||[]).map(e=>{
    const s = minutesFromTime(e.startAt);
    const eMin = Math.max(s + 30, minutesFromTime(e.endAt || e.startAt)); // mind. 30 Minuten
    return { ...e, _s: s, _e: eMin };
  }).sort((a,b)=> a._s - b._s || a._e - b._e);

  const laneEnds = []; // Ende in Minuten je Lane
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

/* ================== Events pro Stunde segmentieren ==================
   Für jede Stunde (0..23) wird ein Segment erzeugt, wenn das Event sie überlappt.
   top/height beziehen sich auf die jeweilige Stunden-Box (nicht auf den ganzen Tag).
===================================================================== */
function splitIntoHourSegments(placed){
  const byHour = Array.from({length:24}, ()=>[]);
  for (const ev of placed){
    const s = clamp(ev._s, 0, 24*60);
    const e = clamp(ev._e, 0, 24*60);
    const startHour = Math.floor(s / 60);
    const endHour   = Math.floor(Math.max(s, e-1) / 60); // e-1, damit 10:00 nicht mehr in 10:00-Stunde fällt
    for (let h = startHour; h <= endHour; h++){
      const hourStart = h * 60;
      const hourEnd   = (h+1) * 60;
      const segStart  = Math.max(s, hourStart);
      const segEnd    = Math.min(e, hourEnd);
      const topInHour = ((segStart - hourStart) / 60) * ROW_H;  // :00 = 0, :30 = ROW_H/2
      const height    = Math.max(4, ((segEnd - segStart) / 60) * ROW_H);
      byHour[h].push({
        ...ev,
        _segTop: topInHour,
        _segHeight: height
      });
    }
  }
  return byHour;
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
      <div className="surface" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <Link href="/termine" className="btn-ghost">← Monatsansicht</Link>
          <h2 className="page-title" style={{margin:0}}>Tagesansicht – {fmtDE(ymd)}</h2>
        </div>
        <div style={{display:"flex", gap:8}}>
          <Link className="btn-ghost" href={`/termine/${toYMD(addDays(dateObj,-1))}`}>◀︎</Link>
          <Link className="btn" href={`/termine/${toYMD(new Date())}`}>Heute</Link>
          <Link className="btn-ghost" href={`/termine/${toYMD(addDays(dateObj, 1))}`}>▶︎</Link>
          <button className="btn" onClick={()=>openNewAt(9)}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Timeline: nur eine Spalte, Stunde-Label IM Container links */}
      <div className="surface" style={{padding:0}}>
        <div className="timeline" style={{ minHeight: 24*ROW_H }}>
          {Array.from({length:24}, (_,h)=>(
            <div key={h} className="hourRow" style={{ height: ROW_H }}>
              {/* Label links im Container */}
              <div className="hourLabel">{pad2(h)}:00</div>

              {/* Hilfslinien :15 / :30 / :45 */}
              <div className="qline q15" />
              <div className="qline q30" />
              <div className="qline q45" />

              {/* Event-Segments dieser Stunde */}
              <div className="segments">
                {segmentsByHour[h].map(ev=>{
                  const laneW = 100 / ev._laneCount;
                  const leftPct = ev._lane * laneW;
                  const widthPct = laneW - GAP_PCT; // kleine Gasse
                  const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?` – ${String(ev.endAt).slice(0,5)}`:""}`;
                  const isOrder = ev.kind === "order";
                  return (
                    <Link
                      key={`${ev.id}-${h}`}
                      href={`/termine/eintrag/${ev.id}`}
                      className={`seg ${isOrder ? "order" : "appt"}`}
                      style={{
                        top: Math.round(ev._segTop),
                        height: Math.round(ev._segHeight),
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      title={`${ev.title || "(ohne Titel)"} • ${timeTxt}`}
                    >
                      <div className="seg-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                      <div className="seg-meta ellipsis">
                        {timeTxt}{ev.customerName?` · ${ev.customerName}`:""}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Klickfläche für volle Stunde */}
              <button
                type="button"
                className="hourClick"
                title={`+ Neuer Eintrag ${pad2(h)}:00`}
                onClick={()=>openNewAt(h)}
              />
            </div>
          ))}
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

      {/* Seiten-Styles: eckige Stunden-Container, Label im Container, Viertel-Linien, sichtbare Segmente */}
      <style jsx>{`
        .timeline{
          background:#fff;
          border:1px solid var(--color-border);
          border-radius: 0;
        }
        .hourRow{
          position: relative;
          border-top: 1px solid rgba(0,0,0,.12);
          background:#fff;
        }
        .hourRow:first-child{ border-top: none; }
        .hourLabel{
          position:absolute; left: 8px; top: 6px; width: ${LABEL_W - 16}px;
          font-size:12px; color: var(--color-muted); user-select:none; pointer-events:none;
        }
        .qline{
          position:absolute; left:0; right:0; border-top:1px dashed rgba(0,0,0,.08);
        }
        .q15{ top: ${ROW_H * 0.25}px; }
        .q30{ top: ${ROW_H * 0.50}px; }
        .q45{ top: ${ROW_H * 0.75}px; }

        .segments{
          position:absolute; top:0; bottom:0; right:8px; left:${LABEL_W}px;
        }
        .seg{
          position:absolute;
          display:block;
          background:#EFF6FF;
          border:1px solid var(--color-border);
          border-left:4px solid #3B82F6;
          border-radius:8px;
          padding:6px 8px;
          box-shadow: var(--shadow-sm);
          color:inherit; text-decoration:none;
          overflow:hidden;
        }
        .seg.order{
          background:#FEF3C7; border-left-color:#F59E0B;
        }
        .seg-title{ font-weight:700; font-size:14px; }
        .seg-meta{ font-size:12px; opacity:.85; }
        .hourClick{
          position:absolute; inset:0;
          background:transparent; border:0; cursor:pointer;
        }
        .hourClick:hover{ background: rgba(37,99,235,.045); }

        .ellipsis{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        @media (max-width: 640px){
          .segments{ right:6px; left:${LABEL_W - 8}px; }
        }
      `}</style>
    </div>
  );
}
