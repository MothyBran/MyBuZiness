// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ====== Datum-Utils ====== */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){ const z = toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function formatDateDE(input){
  const d = toDate(input);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function addDays(d, n){ const x = toDate(d); x.setDate(x.getDate() + n); return x; }

/* ====== Anzeige-Status ====== */
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

/* ====== Positions-/Layout-Utils ====== */
const HOUR_PX = 60; // Höhe einer Stunde (px) – sauber lesbar, ohne internes Scroll-Raster

function minutesOf(hhmm){
  if (!hhmm) return 0;
  const [h,m] = hhmm.split(":").map(x=>parseInt(x,10));
  return (h*60 + (m||0)) | 0;
}
function eventBoxMetrics(ev){
  const startMin = minutesOf(ev.startAt || "00:00");
  const endMin   = Math.max(startMin + 30, minutesOf(ev.endAt || ev.startAt || "00:00")); // mindestens 30 Min
  const top  = (startMin / 60) * HOUR_PX;
  const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_PX);
  return { top, height };
}

/* ====== Page ====== */
export default function DayPage({ params }){
  const ymd = decodeURIComponent(params.date);
  const [date, setDate] = useState(ymd);
  const [items, setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [draftInitial, setDraftInitial] = useState(null); // { date, startAt, kind? }

  // Load items for day
  useEffect(()=>{
    let alive = true;
    (async()=>{
      setLoading(true); setError("");
      try{
        const r = await fetch(`/api/appointments?date=${date}`, { cache:"no-store" });
        if (!r.ok) throw new Error(await r.text());
        const js = await r.json();
        if (alive) setItems(Array.isArray(js)?js:[]);
      }catch(err){
        console.error(err);
        if (alive){ setItems([]); setError("Konnte Einträge nicht laden."); }
      }finally{
        if (alive) setLoading(false);
      }
    })();
    return ()=>{ alive = false; };
  },[date]);

  // Load customers (optional – für Auswahl im Formular)
  useEffect(()=>{
    (async()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" });
        const js = await r.json().catch(()=>({ data: [] }));
        setCustomers(js.data || []);
      }catch{ setCustomers([]); }
    })();
  },[]);

  // Sortierte Darstellung
  const prepared = useMemo(()=>{
    return (items||[])
      .map(e => ({ ...e, _statusLabel: computeDisplayStatus(e) }))
      .sort((a,b)=> (a.startAt||"").localeCompare(b.startAt||""));
  },[items]);

  // Navigations-Buttons
  function go(n){
    setDate(toYMD(addDays(date, n)));
  }

  // Klick auf Stunden-Container -> "Neuer Eintrag" mit vorgefüllter Startzeit
  function clickHour(hour){
    const hh = String(hour).padStart(2,"0");
    setDraftInitial({ date, startAt: `${hh}:00`, kind: "appointment" });
    setOpenForm(true);
  }

  // Nach Speichern: Liste neu laden & Modal schließen
  async function handleSaved(){
    setOpenForm(false);
    const r = await fetch(`/api/appointments?date=${date}`, { cache:"no-store" });
    const js = await r.json().catch(()=>[]);
    setItems(Array.isArray(js)?js:[]);
  }

  return (
    <div className="container" style={{ gap: 14 }}>
      {/* Kopf mit Navigation */}
      <div className="surface" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <Link href="/termine" className="btn-ghost">← Zurück zur Monatsansicht</Link>
          <h2 className="page-title" style={{ margin: 0 }}>
            Tagesansicht – {formatDateDE(date)}
          </h2>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-ghost" onClick={()=>go(-1)}>◀︎</button>
          <button className="btn" onClick={()=>setDate(toYMD(new Date()))}>Heute</button>
          <button className="btn-ghost" onClick={()=>go(+1)}>▶︎</button>
        </div>
      </div>

      {/* Tagesraster (ohne internes Scrollen; Seite selbst kann lang sein) */}
      <div className="surface" style={{ padding: 0 }}>
        <div className="day-wrap">
          {/* Stunden-Spalte (links) */}
          <div className="day-rail">
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="day-hour">
                {String(h).padStart(2,"0")}:00
              </div>
            ))}
          </div>

          {/* Timeline (rechts) */}
          <div className="day-timeline">
            {/* Grid-Linien pro Stunde + Klickflächen je Stunde */}
            {Array.from({length:24}, (_,h)=>(
              <div key={h} className="day-slot" style={{ top: h * HOUR_PX }}>
                <div className="day-line" />
                <button
                  type="button"
                  className="day-hour-click"
                  aria-label={`Neuer Eintrag um ${String(h).padStart(2,"0")}:00`}
                  onClick={()=>clickHour(h)}
                  title="Klick: + Neuer Eintrag mit voller Stunde"
                />
                <div className="day-label">{String(h).padStart(2,"0")}:00</div>
              </div>
            ))}

            {/* Einträge (absolut positioniert; exakt auf Minuten-Höhe) */}
            {prepared.map(ev=>{
              const { top, height } = eventBoxMetrics(ev);
              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  className={`event-box ${ev.kind==='order'?'is-order':'is-appointment'}`}
                  style={{ top, height }}
                  title={`${ev.title || "(ohne Titel)"} • ${ev.startAt?.slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""}`}
                >
                  <div className="event-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                  <div className="event-meta">
                    {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                    {ev.customerName && <> · {ev.customerName}</>}
                    {" · "}
                    <span className={`status-pill ${ev._statusLabel}`}>{ev._statusLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabelle „Alle Einträge am …“ */}
      <div className="surface">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 10 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Alle Einträge am {formatDateDE(date)}</h3>
          <button className="btn" onClick={() => { setDraftInitial({ date, startAt: "09:00", kind:"appointment" }); setOpenForm(true); }}>
            + Neuer Eintrag
          </button>
        </div>

        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{ color:"#b91c1c" }}>{error}</div>}
        {!loading && !error && prepared.length === 0 && (
          <div className="surface" style={{ borderStyle:"dashed", textAlign:"center" }}>
            Keine Einträge an diesem Tag.
          </div>
        )}

        {!loading && !error && prepared.length > 0 && (
          <div className="appt-list">
            {prepared.map(ev=>(
              <Link key={ev.id} href={`/termine/eintrag/${ev.id}`} className="appt-item" style={{ textDecoration:"none", color:"inherit" }}>
                <div className={`appt-icon ${ev.kind==='order'?'appt-icon--order':''}`} title={ev.kind==='order'?'Auftrag':'Termin'}>
                  {ev.kind==='order' ? "🧾" : "📅"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="appt-title">{ev.title || "(ohne Titel)"}</div>
                  <div className="appt-meta">
                    {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                    {ev.customerName && <> · {ev.customerName}</>}
                  </div>
                </div>
                <div className="appt-actions">
                  <span className={`appt-badge readonly ${computeDisplayStatus(ev)==="abgesagt"?"is-abgesagt":computeDisplayStatus(ev)==="abgeschlossen"?"is-abgeschlossen":"is-offen"}`}>
                    {computeDisplayStatus(ev)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Neuer/Bearbeiten */}
      <Modal
        open={openForm}
        onClose={()=>setOpenForm(false)}
        title={draftInitial?.id ? "Eintrag bearbeiten" : "+ Neuer Eintrag"}
        maxWidth={720}
      >
        <AppointmentForm
          initial={draftInitial}
          customers={customers}
          onSaved={handleSaved}
          onCancel={()=>setOpenForm(false)}
        />
      </Modal>

      {/* Styles (nur für diese Seite) */}
      <style jsx>{`
        .day-wrap{
          display: grid;
          grid-template-columns: 80px 1fr;
          align-items: start;
          gap: 0;
          position: relative;
        }
        .day-rail{
          border-right: 1px solid rgba(0,0,0,.08);
          background: #fff;
        }
        .day-hour{
          height: ${HOUR_PX}px;
          display:flex; align-items:flex-start; justify-content:flex-end;
          padding: 4px 8px 0 0;
          font-size: 12px; color: var(--color-muted);
        }

        .day-timeline{
          position: relative;
          height: ${HOUR_PX * 24}px;
          background: #fff;
        }
        .day-slot{
          position: absolute;
          left: 0; right: 0;
          height: ${HOUR_PX}px;
        }
        .day-line{
          position: absolute; left: 0; right: 0; top: 0;
          border-top: 1px solid rgba(0,0,0,.08);
        }
        .day-label{
          position: absolute; left: 6px; top: -8px;
          font-size: 11px; color: #94a3b8; background: #fff; padding: 0 4px;
        }
        .day-hour-click{
          position:absolute; inset:0; opacity:0; cursor:pointer;
        }

        .event-box{
          position: absolute; left: 10px; right: 10px;
          background: #DBEAFE;
          border: 1px solid #BFDBFE;
          border-left-width: 4px;
          border-radius: 10px;
          padding: 8px 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,.06);
          text-decoration: none;
          color: inherit;
          display: flex; flex-direction: column; gap: 2px;
        }
        .event-box.is-order{
          background: #FEF3C7;  /* amber-100 */
          border-color: #FDE68A; /* amber-300 */
        }
        .event-title{ font-weight: 700; font-size: 14px; }
        .event-meta{ font-size: 12px; opacity: .85; }
        .status-pill{
          display:inline-block; border:1px solid rgba(0,0,0,.1); border-radius:999px; padding:1px 8px; margin-left: 4px;
          text-transform: lowercase;
        }
        .status-pill.offen{ background:#EFF6FF; border-color:#BFDBFE; }
        .status-pill.abgesagt{ background:#FEF2F2; border-color:#FECACA; }
        .status-pill.abgeschlossen{ background:#F0FDF4; border-color:#BBF7D0; }

        /* Liste unten (kompakt, klickbarer Container) */
        .appt-list{ display:grid; gap:10px; }
        .appt-item{
          display:grid; grid-template-columns: 40px 1fr auto; gap:12px;
          align-items:center; padding:12px; background:#fff; border:1px solid var(--color-border);
          border-radius: var(--radius); box-shadow: var(--shadow-sm);
        }
        .appt-icon{
          width:32px; height:32px; border-radius:999px; display:flex; align-items:center; justify-content:center;
          box-shadow: var(--shadow-sm); background:#DBEAFE; font-size:16px;
        }
        .appt-icon.appt-icon--order{ background:#FDE68A; }
        .appt-title{ font-weight:700; font-size:15px; }
        .appt-meta{ font-size:13px; color:#374151; opacity:.85; }
        .appt-actions{ display:flex; align-items:center; gap:8px; }
        .appt-badge.readonly{
          display:inline-flex; align-items:center; gap:6px; padding: 4px 10px; border-radius:999px; font-size:12px;
          border:1px solid var(--color-border); background:#fff; text-transform: lowercase;
          cursor: default;
        }
        .appt-badge.readonly.is-offen{ background:#EFF6FF; border-color:#BFDBFE; }
        .appt-badge.readonly.is-abgesagt{ background:#FEF2F2; border-color:#FECACA; }
        .appt-badge.readonly.is-abgeschlossen{ background:#F0FDF4; border-color:#BBF7D0; }

        .ellipsis{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
}
