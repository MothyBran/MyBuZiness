// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Page, PageHeader, PageGrid, Col, Card, Button, Modal, StatusPill, Badge
} from "../../components/UI";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===== Konfiguration ===== */
const ROW_H = 44;          // Höhe je Stunde (px) – :30 liegt in der Mitte
const LABEL_W = 72;        // Breite für das Stundenlabel links
const LANE_GAP = 1;        // % Spalt zwischen überlappenden Events
const EVENT_WIDTH_FACTOR = 0.30; // 0..1 (0.30 = 30% der Lane-Breite)
const EVENT_ALIGN = "center";    // "left" | "center" | "right"

/* ===== Datum/Zeit Utils ===== */
const pad2 = (n) => String(n).padStart(2, "0");
function toDate(x){
  if (x instanceof Date) return x;
  if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)){
    const [y,m,d] = x.slice(0,10).split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d = new Date(x || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){ const z = toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function addDays(d, n){ const x = toDate(d); x.setDate(x.getDate()+n); return x; }
function fmtDE(d){ const x = toDate(d); return `${pad2(x.getDate())}.${pad2(x.getMonth()+1)}.${x.getFullYear()}`; }
function minutesFromTime(val){
  const m = String(val ?? "").match(/^\s*(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const h  = Math.max(0, Math.min(23, parseInt(m[1],10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
  return h*60 + mm;
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
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
    return { ...e, _s:s, _e:eMin };
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

export default function DayPage({ params }){
  const ymd = toYMD(params?.date || new Date());
  const dateObj = toDate(ymd);

  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [openForm, setOpenForm]       = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [customers, setCustomers]     = useState([]);

  const prevYMD  = toYMD(addDays(dateObj, -1));
  const nextYMD  = toYMD(addDays(dateObj, +1));
  const todayYMD = toYMD(new Date());

  const reload = useCallback(async ()=>{
    setLoading(true); setError("");
    try{
      const r  = await fetch(`/api/appointments?date=${ymd}`, { cache:"no-store" });
      if(!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setEvents(Array.isArray(js) ? js : []);
    }catch(err){
      console.error(err);
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
    const end   = addMinutes(start, 60); // Standard 60 Min
    setFormInitial({ date: ymd, startAt: start, endAt: end, kind:"appointment", status:"open" });
    setOpenForm(true);
  }
  function onSaved(){ setOpenForm(false); reload(); }

  /* Klick auf Timeline → volle Stunde aus Y-Position ermitteln */
  const timelineRef = useRef(null);
  function handleOverlayClick(e){
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y    = e.clientY - rect.top;
    const hour = clamp(Math.floor(y / ROW_H), 0, 23);
    openNewAt(hour);
  }

  return (
    <Page>
      <PageHeader
        title={`Tagesansicht – ${fmtDE(ymd)}`}
        actions={
          <>
            <Link className="btn btn--ghost" href="/termine">← Monatsansicht</Link>
            <Link className="btn btn--ghost" href={`/termine/${prevYMD}`}>◀︎</Link>
            <Link className="btn" href={`/termine/${todayYMD}`}>Heute</Link>
            <Link className="btn btn--ghost" href={`/termine/${nextYMD}`}>▶︎</Link>
          </>
        }
      />

      <PageGrid>
        {/* Timeline */}
        <Col span={12}>
          <Card title="Zeitplan">
            <div
              ref={timelineRef}
              style={{ position:"relative", height: 24*ROW_H }}
            >
              {/* Stunden-Hintergrund */}
              {Array.from({length:24}, (_,h)=>(
                <div
                  key={h}
                  style={{
                    position:"absolute", left:0, right:0, top: h*ROW_H, height: ROW_H,
                    borderBottom: "1px solid var(--border)"
                  }}
                  title={`${pad2(h)}:00`}
                >
                  <div style={{ position:"relative", height:"100%", paddingLeft: LABEL_W }}>
                    {/* Label */}
                    <div
                      style={{
                        position:"absolute", left:8, top:6, width: LABEL_W-16,
                        fontSize:12, color:"var(--muted)",
                        userSelect:"none", pointerEvents:"none"
                      }}
                    >
                      {pad2(h)}:00
                    </div>

                    {/* Hilfslinien */}
                    <div style={{ position:"absolute", left:0, right:0, top: ROW_H*0.25, borderTop:"1px dashed rgba(148,163,184,.35)" }} />
                    <div style={{ position:"absolute", left:0, right:0, top: ROW_H*0.50, borderTop:"1px dashed rgba(148,163,184,.35)" }} />
                    <div style={{ position:"absolute", left:0, right:0, top: ROW_H*0.75, borderTop:"1px dashed rgba(148,163,184,.35)" }} />

                    {/* Klickfläche (volle Stunde) */}
                    <button
                      type="button"
                      onClick={()=>openNewAt(h)}
                      title={`+ Neuer Eintrag ${pad2(h)}:00`}
                      style={{ position:"absolute", inset:0, background:"transparent", border:0, cursor:"pointer" }}
                    />
                  </div>
                </div>
              ))}

              {/* Events-Layer */}
              <div
                onClick={handleOverlayClick}
                style={{
                  position:"absolute", inset:0,
                  paddingLeft: LABEL_W, paddingRight: 8,
                  zIndex:2, cursor:"pointer"
                }}
              >
                {placed.map(ev=>{
                  const s = clamp(minutesFromTime(ev.startAt), 0, 24*60);
                  const e = clamp(Math.max(s + 30, minutesFromTime(ev.endAt || ev.startAt)), 0, 24*60);
                  const top    = (s/60) * ROW_H;
                  const height = Math.max(12, ((e - s)/60) * ROW_H);

                  const laneW    = 100 / ev._laneCount;
                  const rawW     = Math.max(0, laneW - LANE_GAP);
                  const widthPct = rawW * EVENT_WIDTH_FACTOR;
                  let leftPct    = ev._lane * laneW;
                  if (EVENT_ALIGN === "center") {
                    leftPct += (rawW - widthPct) / 2;
                  } else if (EVENT_ALIGN === "right") {
                    leftPct += (rawW - widthPct);
                  }

                  const isOrder  = ev.kind === "order";
                  const timeTxt  = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?` – ${String(ev.endAt).slice(0,5)}`:""}`;

                  return (
                    <Link
                      key={ev.id}
                      href={`/termine/eintrag/${ev.id}`}
                      onClick={(e)=>e.stopPropagation()}
                      className="card"
                      style={{
                        position:"absolute",
                        top, height,
                        left: `${leftPct}%`, width: `${widthPct}%`,
                        borderLeft: `4px solid ${isOrder ? "#F59E0B" : "#3B82F6"}`,
                        padding: "6px 8px",
                        overflow: "hidden",
                        textDecoration:"none",
                      }}
                      title={`${ev.title || "(ohne Titel)"} • ${timeTxt}`}
                    >
                      <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {ev.title || "(ohne Titel)"}
                      </div>
                      <div className="muted" style={{ fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {timeTxt}{ev.customerName?` · ${ev.customerName}`:""}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </Card>
        </Col>

        {/* Liste darunter */}
        <Col span={12}>
          <Card title={`Alle Einträge – ${fmtDE(ymd)}`}>
            {loading && <div className="muted">Lade…</div>}
            {!loading && error && <div className="error">{error}</div>}
            {!loading && !error && placed.length===0 && <div className="muted">Keine Einträge.</div>}
            {!loading && !error && placed.length>0 && (
              <div style={{ display:"grid", gap:8 }}>
                {placed.map(ev=>{
                  const timeTxt = `${String(ev.startAt||"").slice(0,5)}${ev.endAt?`–${String(ev.endAt).slice(0,5)}`:""}`;
                  const status = ev.status==="cancelled" ? "abgesagt" : ev.status==="done" ? "abgeschlossen" : "offen";
                  return (
                    <Link
                      key={ev.id}
                      href={`/termine/eintrag/${ev.id}`}
                      className="card"
                      style={{ textDecoration:"none", padding:10, display:"grid", gridTemplateColumns:"auto 1fr auto", gap:10, alignItems:"center" }}
                    >
                      <div style={{ fontSize:20 }}>{ev.kind==='order'?"🧾":"📅"}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {ev.title || "(ohne Titel)"}
                        </div>
                        <div className="muted" style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {timeTxt}{ev.customerName?` · ${ev.customerName}`:""}
                        </div>
                      </div>
                      <StatusPill status={status} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </PageGrid>

      {/* Modal: Neuer Eintrag */}
      <Modal
        open={openForm}
        onClose={()=>setOpenForm(false)}
        title="+ Neuer Eintrag"
        footer={null}
      >
        <AppointmentForm
          initial={formInitial}
          customers={customers}
          onSaved={onSaved}
          onCancel={()=>setOpenForm(false)}
        />
      </Modal>
    </Page>
  );
}
