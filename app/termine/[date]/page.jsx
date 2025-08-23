// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* --- Date/Time Utils --- */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input==="string"){
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)){
      const [y,m,d]=input.split("-").map(Number);
      return new Date(y, m-1, d, 12,0,0,0);
    }
    // ISO
    const d=new Date(input);
    if (!Number.isNaN(d)) return d;
  }
  const d=new Date();
  return d;
}
function toYMD(d){
  const z = toDate(d);
  z.setHours(12,0,0,0);
  return z.toISOString().slice(0,10);
}
function addDays(d, n){ const x=new Date(toDate(d)); x.setDate(x.getDate()+n); return x; }
function formatDateDE(input){ const d=toDate(input); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; }

/* --- Anzeige/Status --- */
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

/* --- Geometrie: 60px pro Stunde => 1px pro Minute --- */
const HOUR_PX = 60;
const MINUTE_PX = HOUR_PX / 60; // = 1

/* Position und Höhe der Events berechnen (minutengenau) */
function getTopPx(hhmm){
  if (!hhmm) return 0;
  const [h,m] = hhmm.split(":").map(Number);
  const total = (h*60 + (m||0));
  return Math.max(0, Math.min(24*60, total)) * MINUTE_PX;
}
function getHeightPx(start, end){
  const s = getTopPx(start);
  const e = end ? getTopPx(end) : s + (60 * MINUTE_PX); // default 60min, falls kein Ende
  return Math.max(18, Math.max(0, e - s)); // min. sichtbare Höhe
}

/* Klick auf Raster: nächste/gleiche Viertelstunde zurückgeben */
function toQuarter(hhmm){
  const [h,m]=hhmm.split(":").map(Number);
  const q = Math.floor((m||0)/15)*15;
  return `${String(h).padStart(2,"0")}:${String(q).padStart(2,"0")}`;
}
/* Von Y‑Offset (px) in Zeit (HH:MM) zurück (für Click im großen Block, optional) */
function offsetToHHMM(offsetPx){
  const minutes = Math.max(0, Math.min(24*60, Math.round(offsetPx / MINUTE_PX)));
  const h = Math.floor(minutes/60);
  const m = minutes % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

export default function DayPage({ params }){
  const dateParam = params?.date; // YYYY-MM-DD
  const date = toYMD(dateParam || new Date());

  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  const [openForm,setOpenForm] = useState(false);
  const [formInitial,setFormInitial] = useState(null);

  // (Optional) Kundenliste laden – falls deine API existiert, ansonsten leer.
  const [customers, setCustomers] = useState([]);
  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" });
        if (!r.ok) throw new Error();
        const js = await r.json();
        if (alive) setCustomers(Array.isArray(js?.data)?js.data:[]);
      }catch(_){
        if (alive) setCustomers([]);
      }
    })();
    return ()=>{ alive = false; };
  },[]);

  /* Termine für den Tag laden */
  const reload = useCallback(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?date=${date}`, { cache:"no-store" })
      .then(async r => { if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(js => { if(alive) setItems(Array.isArray(js)?js:[]); })
      .catch(err => { console.error(err); if(alive){ setItems([]); setError("Konnte Einträge nicht laden."); } })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[date]);

  useEffect(()=>reload(),[reload]);

  const prepared = useMemo(()=>{
    return (items||[]).map(ev => ({
      ...ev,
      _displayStatus: computeDisplayStatus(ev),
      _top: getTopPx(ev.startAt?.slice(0,5) || "00:00"),
      _height: getHeightPx(ev.startAt?.slice(0,5) || "00:00", ev.endAt?.slice(0,5) || null),
    }));
  },[items]);

  /* Neuer Eintrag – vorbefüllen */
  function openNewAt(startHHMM){
    const s = toQuarter(startHHMM || "09:00");
    const [h,m]=s.split(":").map(Number);
    const endH = Math.min(23, h + 1);
    const init = {
      date,
      startAt: s,
      endAt: `${String(endH).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
      kind: "appointment",
      status: "open",
      title: "",
    };
    setFormInitial(init);
    setOpenForm(true);
  }

  /* Klick auf Stundenzeile – exakt diese Stunde setzen */
  function handleHourClick(hour){
    const start = `${String(hour).padStart(2,"0")}:00`;
    openNewAt(start);
  }

  /* Klick in den großen Block (zwischen den Stundenlinien) – errechne Zeit aus Mausposition */
  const dayBlockRef = useRef(null);
  function onBlockClick(e){
    if (!dayBlockRef.current) return;
    const rect = dayBlockRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + dayBlockRef.current.scrollTop; // auch bei Scroll
    const hhmm = offsetToHHMM(y);
    openNewAt(hhmm);
  }

  /* Nach Speichern neu laden und Modal schließen */
  function handleSaved(){
    setOpenForm(false);
    setFormInitial(null);
    reload();
  }

  const d = toDate(date);
  const prev = toYMD(addDays(d,-1));
  const next = toYMD(addDays(d, 1));
  const today = toYMD(new Date());

  return (
    <div className="container" style={{ gap: 16 }}>
      {/* Kopfzeile */}
      <div className="surface" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <Link href="/termine" className="btn-ghost">← Zur Monatsansicht</Link>
          <h2 className="page-title" style={{ margin: 0 }}>
            {formatDateDE(date)} – Tagesansicht
          </h2>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Link href={`/termine/${prev}`} className="btn-ghost">◀︎</Link>
          <Link href={`/termine/${today}`} className="btn">Heute</Link>
          <Link href={`/termine/${next}`} className="btn-ghost">▶︎</Link>
          <button className="btn" onClick={()=>openNewAt("09:00")}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Tagesraster + Events */}
      <div className="surface" style={{ padding: 0 }}>
        <div
          style={{
            display:"grid",
            gridTemplateColumns:"80px 1fr",
            alignItems:"stretch",
            minHeight: 360
          }}
        >
          {/* Stunden-Spalte */}
          <div style={{ borderRight:"1px solid var(--color-border)", background:"#fff" }}>
            {Array.from({length:24},(_,h)=>(
              <div
                key={h}
                className="hour-label"
                style={{
                  height: HOUR_PX,
                  borderBottom: "1px solid rgba(0,0,0,.05)",
                  position:"relative",
                  display:"flex",
                  alignItems:"flex-start",
                  justifyContent:"flex-end",
                  paddingRight: 8,
                  fontSize:12,
                  color:"var(--color-muted)",
                  cursor:"pointer",
                  userSelect:"none"
                }}
                title={`Neuen Eintrag um ${String(h).padStart(2,"0")}:00 anlegen`}
                onClick={()=>handleHourClick(h)}
              >
                <span style={{ position:"sticky", top:6 }}>{String(h).padStart(2,"0")}:00</span>
              </div>
            ))}
          </div>

          {/* Block-Spalte mit absolut positionierten Events */}
          <div
            ref={dayBlockRef}
            className="day-col"
            style={{
              position:"relative",
              background:"#fff",
              overflow: "auto",
              maxHeight: "70vh",
              cursor:"crosshair"
            }}
            onClick={onBlockClick}
          >
            {/* Hintergrund-Raster: Stundenlinien + 15-Minuten Hilfslinien */}
            <div
              aria-hidden
              style={{ position:"absolute", inset:0, pointerEvents:"none" }}
            >
              {Array.from({length:24},(_,h)=>(
                <div key={`h-${h}`} style={{
                  position:"absolute",
                  left:0, right:0,
                  top: h*HOUR_PX,
                  height: HOUR_PX,
                  borderBottom:"1px solid rgba(0,0,0,.06)"
                }}>
                  {/* Viertelstunden */}
                  {([15,30,45]).map((m)=>(
                    <div key={m}
                      style={{
                        position:"absolute",
                        left:0, right:0,
                        top: Math.round((h*60+m)*MINUTE_PX),
                        borderTop: "1px dashed rgba(0,0,0,.05)"
                      }}
                    />
                  ))}
                </div>
              ))}
              {/* ganzer Tag Höhe */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height: 24*HOUR_PX }} />
            </div>

            {/* Events-Layer (klickbar) */}
            <div style={{ position:"relative", minHeight: 24*HOUR_PX }}>
              {prepared.map(ev=>{
                const isOrder = ev.kind === "order";
                const label = `${ev.startAt?.slice(0,5) || ""}${ev.endAt ? " – " + ev.endAt.slice(0,5) : ""}`;
                return (
                  <Link
                    href={`/termine/eintrag/${ev.id}`}
                    key={ev.id}
                    className="day-event"
                    style={{
                      position:"absolute",
                      left: 8,
                      right: 8,
                      top: Math.round(ev._top),
                      height: Math.round(ev._height),
                      background: isOrder ? "#FEF3C7" : "#DBEAFE",
                      border: "1px solid var(--color-border)",
                      borderLeft: `4px solid ${isOrder ? "#F59E0B" : "#3B82F6"}`,
                      borderRadius: 10,
                      padding: "6px 10px",
                      boxShadow: "var(--shadow-sm)",
                      color: "inherit",
                      textDecoration:"none",
                      display:"grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems:"start",
                      gap: 6
                    }}
                    title={`${label} • ${ev.title || ""}`}
                  >
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {ev.title || "(ohne Titel)"}
                      </div>
                      <div style={{ fontSize:12, opacity:.85 }}>
                        {label}{ev.customerName ? ` · ${ev.customerName}` : ""}
                      </div>
                    </div>
                    <span
                      className={`status-badge ${ev._displayStatus}`}
                      style={{ pointerEvents:"none", alignSelf:"start", textTransform:"lowercase" }}
                    >
                      {ev._displayStatus}
                    </span>
                  </Link>
                );
              })}
              {/* Hinweis bei leerem Tag */}
              {!loading && !error && prepared.length===0 && (
                <div
                  style={{
                    position:"absolute", top: 12, left: 12, right: 12,
                    padding: 12, border:"1px dashed rgba(0,0,0,.15)", borderRadius: 12, background:"#fafafa"
                  }}
                >
                  Keine Einträge – klicke ins Raster oder nutze „+ Neuer Eintrag“.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabelle: Alle Einträge am ... */}
      <div className="surface">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8 }}>
          <h3 className="section-title" style={{ margin:0 }}>Alle Einträge am {formatDateDE(date)}</h3>
        </div>

        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{ color:"#b91c1c" }}>{error}</div>}
        {!loading && !error && (
          <div className="list">
            {prepared.map(ev=>{
              const isOrder = ev.kind==="order";
              const label = `${ev.startAt?.slice(0,5)||""}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""}`;
              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  className="list-item"
                  style={{ textDecoration:"none", color:"inherit", cursor:"pointer" }}
                >
                  <div className={`item-icon ${isOrder ? "accent":"info"}`}>{isOrder ? "🧾":"📅"}</div>
                  <div style={{ minWidth:0 }}>
                    <div className="item-title">{ev.title || "(ohne Titel)"}</div>
                    <div className="item-meta">
                      {label}{ev.customerName ? ` · ${ev.customerName}` : ""}
                    </div>
                  </div>
                  <div className="item-actions">
                    <span className={`status-badge ${ev._displayStatus}`}>{ev._displayStatus}</span>
                  </div>
                </Link>
              );
            })}
            {prepared.length===0 && !loading && !error && (
              <div className="surface" style={{ borderStyle:"dashed", textAlign:"center" }}>
                Keine Einträge.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Neuer/Bearbeiten */}
      <Modal
        open={openForm}
        onClose={()=>setOpenForm(false)}
        title={formInitial?.id ? "Eintrag bearbeiten" : "Neuer Eintrag"}
        maxWidth={720}
      >
        <AppointmentForm
          initial={formInitial}
          customers={customers}
          onSaved={handleSaved}
          onCancel={()=>setOpenForm(false)}
        />
      </Modal>

      {/* Styles (nur für diese Seite) */}
      <style jsx>{`
        .hour-label:hover{
          background: #f9fafb;
        }
        .day-event:hover{
          filter: brightness(0.98);
        }
        @media (max-width: 640px){
          .day-col{ max-height: 60vh; }
        }
      `}</style>
    </div>
  );
}
