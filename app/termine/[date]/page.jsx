// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===== Helpers ===== */
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function toMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fmtDateDE(ymd) {
  const [y,m,d] = ymd.split("-").map(Number);
  const dt = new Date(y, m-1, d);
  return new Intl.DateTimeFormat("de-DE", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" }).format(dt);
}
function labelTime(h){ return `${String(h).padStart(2,"0")}:00`; }
function safeYMD(input){
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date();
  return d.toISOString().slice(0,10);
}

const H_START = 6;   // Beginn der Darstellung (06:00)
const H_END   = 22;  // Ende der Darstellung   (22:00)
const DAY_MIN = (H_END - H_START) * 60;

export default function DayPage({ params }) {
  const day = safeYMD(params?.date);

  const [items, setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  // Modal „Neuer Eintrag“
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState({ date: day, startAt: "09:00" });

  // Kunden (optional für Formular – wenn API fehlt, bleibt es einfach leer)
  const [customers, setCustomers] = useState([]);

  // Load appointments for the day
  async function load() {
    setLoading(true); setError("");
    try{
      const r = await fetch(`/api/appointments?date=${day}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setItems(Array.isArray(js) ? js : []);
    }catch(e){
      console.error(e);
      setError("Konnte Einträge nicht laden.");
      setItems([]);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [day]);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" }).catch(()=>null);
        const js = r && r.ok ? await r.json() : { data: [] };
        setCustomers(js?.data || []);
      }catch{ setCustomers([]); }
    })();
  },[]);

  /** Für die Timeline: Position und Höhe der Event-Blöcke berechnen */
  const placed = useMemo(()=>{
    // Basierend auf Minuten ab Tagesbeginn (H_START)
    return items.map((e, idx) => {
      const startMin = toMinutes(e.startAt ?? "00:00");
      const endMin   = toMinutes(e.endAt   ?? e.startAt ?? "00:00");
      const s = clamp(startMin - H_START*60, 0, DAY_MIN);
      const minDur = 30; // mindestens 30 Minuten sichtbar
      const duration = Math.max(endMin - startMin, minDur);
      const d = clamp(duration, 15, DAY_MIN - s);
      const top = (s / DAY_MIN) * 100;
      const height = (d / DAY_MIN) * 100;
      return { ...e, _top: top, _height: height, _key:`blk-${idx}` };
    });
  }, [items]);

  /** Klick auf Stundenraster => neues Modal mit vorbelegter Startzeit */
  function clickHour(h) {
    const hh = String(h).padStart(2,"0");
    setCreateDefaults({ date: day, startAt: `${hh}:00` });
    setCreateOpen(true);
  }

  /** Neueintrag gespeichert -> Modal zu, neu laden */
  function onSavedNew(){
    setCreateOpen(false);
    load();
  }

  return (
    <div className="container">
      {/* Kopfzeile */}
      <div className="surface" style={{display:"grid", gap:12}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
          <h2 className="page-title" style={{margin:0}}>
            {fmtDateDE(day)}
          </h2>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <Link href="/termine" className="btn-ghost">← Zur Kalenderansicht</Link>
            <button
              className="btn"
              onClick={() => { setCreateDefaults({ date: day, startAt: "09:00" }); setCreateOpen(true); }}
            >
              + Neuer Eintrag
            </button>
          </div>
        </div>

        {/* Tagesraster + Timeline */}
        <div className="surface" style={{position:"relative", overflow:"hidden"}}>
          <div className="day-grid">
            {/* linke Spalte: Stunde-Labels */}
            <div style={{display:"grid", gridTemplateRows:`repeat(${H_END-H_START}, minmax(40px, 1fr))`, gap:8}}>
              {Array.from({length:(H_END - H_START)}, (_,i)=>H_START+i).map(h=>(
                <div key={h} className="day-hour" style={{display:"flex", alignItems:"flex-start", paddingTop:2}}>
                  {labelTime(h)}
                </div>
              ))}
            </div>

            {/* rechte Spalte: klickbare Blöcke je Stunde + absolute Event-Layer */}
            <div style={{position:"relative"}}>
              {/* Stunden-Klick-Zonen */}
              <div style={{display:"grid", gridTemplateRows:`repeat(${H_END-H_START}, minmax(40px, 1fr))`, gap:8}}>
                {Array.from({length:(H_END - H_START)}, (_,i)=>H_START+i).map(h=>(
                  <button
                    key={h}
                    type="button"
                    onClick={()=>clickHour(h)}
                    title={`${labelTime(h)} – neuen Eintrag anlegen`}
                    className="day-block"
                    style={{width:"100%", textAlign:"left", cursor:"pointer"}}
                  >
                    <div className="day-block-inner" style={{opacity:.5}}>
                      + Eintrag ab {labelTime(h)}
                    </div>
                  </button>
                ))}
              </div>

              {/* Event-Layer */}
              <div
                aria-hidden
                style={{
                  position:"absolute",
                  left:0, right:0, top:0, bottom:0,
                  pointerEvents:"none" // Blöcke selbst klicken wir trotzdem (s. Link innen)
                }}
              >
                {placed.map(ev=>(
                  <div
                    key={ev._key}
                    style={{
                      position:"absolute",
                      top: `${ev._top}%`,
                      height: `${ev._height}%`,
                      left: 6, right: 6,
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      boxShadow: "var(--shadow-sm)",
                      background: ev.kind === "order" ? "#FDE68A" : "#DBEAFE",
                      overflow:"hidden",
                      display:"flex",
                      alignItems:"center"
                    }}
                  >
                    <Link
                      href={`/termine/eintrag/${ev.id}`}
                      title="Details öffnen"
                      style={{
                        display:"block", width:"100%",
                        padding:"6px 10px",
                        color:"inherit", textDecoration:"none",
                        pointerEvents:"auto" // Link wieder klickbar
                      }}
                    >
                      <div style={{fontWeight:700, fontSize:14, lineHeight:1.2}} className="ellipsis">
                        {ev.title || "(ohne Titel)"}
                      </div>
                      <div style={{fontSize:12, opacity:.82}}>
                        {ev.startAt?.slice(0,5)}{ev.endAt ? ` – ${ev.endAt.slice(0,5)}` : ""}{ev.customerName ? ` · ${ev.customerName}` : ""}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Statuszeile */}
        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{color:"#b91c1c"}}>{error}</div>}

        {/* Alle Einträge des Tages als Liste/Tabelle */}
        <div className="surface" style={{display:"grid", gap:10}}>
          <div className="section-title">Alle Einträge am {fmtDateDE(day)}</div>
          {(!loading && items.length === 0) && (
            <div className="surface" style={{borderStyle:"dashed", textAlign:"center"}}>Keine Einträge.</div>
          )}
          <div className="list">
            {items.map(ev=>(
              <div key={ev.id} className="list-item">
                <div className={`item-icon ${ev.kind==='order'?'accent':''}`} title={ev.kind==='order'?'Auftrag':'Termin'}>
                  {ev.kind==='order' ? "🧾" : "📅"}
                </div>
                <div style={{minWidth:0}}>
                  <div className="item-title">
                    <Link href={`/termine/eintrag/${ev.id}`} style={{textDecoration:"none", color:"inherit"}}>
                      {ev.title || "(ohne Titel)"}
                    </Link>
                  </div>
                  <div className="item-meta ellipsis">
                    {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}{ev.customerName?` · ${ev.customerName}`:""}
                  </div>
                </div>
                <div className="item-actions">
                  <Link href={`/termine/eintrag/${ev.id}`} className="btn-ghost">Details →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Neuer Eintrag */}
      <Modal
        open={createOpen}
        onClose={()=>setCreateOpen(false)}
        title="+ Neuer Eintrag"
        maxWidth={640}
      >
        <AppointmentForm
          initial={{ date: createDefaults.date, startAt: createDefaults.startAt }}
          customers={customers}
          onSaved={onSavedNew}
          onCancel={()=>setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}
