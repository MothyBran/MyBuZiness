// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ====== kleine Zeit-/Datum-Utils ======================================== */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function toYMD(d){
  const z = toDate(d);
  z.setHours(12,0,0,0);
  return z.toISOString().slice(0,10);
}
function formatDateDE(input){
  const d = toDate(input);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function parseHHMM(hhmm){ if(!hhmm) return 0; const [h,m]=hhmm.split(":").map(Number); return (h*60 + (m||0)); }
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

/* Anzeige-Status aus Backend-Status ableiten (Label nur zur Anzeige) */
function displayStatus(e){
  const now = new Date();
  const start = toDate(`${e.date}T${(e.startAt||"00:00")}:00`);
  const end   = toDate(`${e.date}T${(e.endAt||e.startAt||"00:00")}:00`);
  const isPast = end < now;
  if (e.status === "cancelled") return "abgesagt";
  if (e.status === "done") return "abgeschlossen";
  if (e.status === "open" && isPast) return "abgeschlossen";
  return "offen";
}

/* ======================================================================== */

export default function DayPage({ params }){
  const ymdParam = (params?.date || "").slice(0,10); // YYYY-MM-DD
  const [dateYMD, setDateYMD] = useState(ymdParam);
  const [items, setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  // Kundenliste optional für Formular (Name-Autofill)
  const [customers, setCustomers] = useState([]);

  // Modal „Neuer Eintrag“
  const [openNew, setOpenNew] = useState(false);
  const [prefillStart, setPrefillStart] = useState("09:00");

  // UI‑Konstanten für die Skala (1px = 1 Minute)
  const PX_PER_HOUR = 60;
  const PX_PER_MIN  = PX_PER_HOUR / 60; // = 1
  const DAY_HEIGHT  = 24 * PX_PER_HOUR; // 1440px

  // Datum ableiten
  const day = useMemo(()=> toDate(dateYMD), [dateYMD]);
  const prevDay = useMemo(()=> addDays(day, -1), [day]);
  const nextDay = useMemo(()=> addDays(day, 1), [day]);
  const todayYMD = useMemo(()=> toYMD(new Date()), []);

  // Laden: Einträge für diesen Tag + Kunden
  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      fetch(`/api/appointments?date=${dateYMD}`, { cache:"no-store" })
        .then(async r=>{ if(!r.ok) throw new Error(await r.text()); return r.json(); })
        .catch(()=>[]),
      fetch(`/api/customers`, { cache:"no-store" })
        .then(r=>r.json()).then(js=>Array.isArray(js?.data)?js.data:[])
        .catch(()=>[])
    ])
    .then(([evts, cust])=>{
      if(!alive) return;
      setItems(Array.isArray(evts)?evts:[]);
      setCustomers(cust);
    })
    .catch(err=>{
      if(!alive) return;
      console.error(err);
      setError("Konnte Einträge nicht laden.");
      setItems([]);
    })
    .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[dateYMD]);

  // vorbereiten: Positionen für Timeline berechnen
  const positioned = useMemo(()=>{
    return (items||[]).map(e=>{
      const startMin = parseHHMM(e.startAt?.slice(0,5) || "00:00");
      const endMinRaw = e.endAt ? parseHHMM(e.endAt.slice(0,5)) : (startMin + 30); // default 30min
      const endMin = Math.max(endMinRaw, startMin + 15); // min. 15min sichtbar
      const top = clamp(Math.round(startMin * PX_PER_MIN), 0, DAY_HEIGHT);
      const height = clamp(Math.round((endMin - startMin) * PX_PER_MIN), 15, DAY_HEIGHT - top);
      return { ...e, _top: top, _height: height, _status: displayStatus(e) };
    }).sort((a,b)=> (a._top - b._top) || (parseHHMM(a.endAt||a.startAt) - parseHHMM(b.endAt||b.startAt)));
  },[items]);

  function openNewAt(hour){
    const h = String(hour).padStart(2,"0");
    setPrefillStart(`${h}:00`);
    setOpenNew(true);
  }

  async function reloadDay(){
    try{
      const r = await fetch(`/api/appointments?date=${dateYMD}`, { cache:"no-store" });
      const js = await r.json().catch(()=>[]);
      setItems(Array.isArray(js)?js:[]);
    }catch(_){}
  }

  const hours = Array.from({length:24}, (_,h)=>h);

  return (
    <div className="container" style={{ display:"grid", gap:16 }}>
      {/* Kopfzeile + Navigation */}
      <div className="surface" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
        <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
          <Link href="/termine" className="btn-ghost">← Zurück zum Kalender</Link>
          <h2 className="page-title" style={{margin:0}}>
            Tagesansicht – {formatDateDE(day)}
          </h2>
        </div>
        <div style={{display:"flex", gap:8}}>
          <Link href={`/termine/${toYMD(prevDay)}`} className="btn-ghost" prefetch={false}>◀︎</Link>
          <Link href={`/termine/${todayYMD}`} className="btn" prefetch={false}>Heute</Link>
          <Link href={`/termine/${toYMD(nextDay)}`} className="btn-ghost" prefetch={false}>▶︎</Link>
        </div>
      </div>

      {/* Timeline-Ansicht */}
      <div className="surface" style={{ overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr", gap:8 }}>
          {/* linke Stundenleiste */}
          <div style={{ position:"relative" }}>
            {hours.map(h => (
              <div key={h}
                   className="day-hour"
                   style={{
                     height: PX_PER_HOUR,
                     borderTop: "1px solid rgba(0,0,0,.08)",
                     display:"flex",
                     alignItems:"flex-start",
                     justifyContent:"flex-end",
                     paddingTop: 2,
                     paddingRight: 6,
                     fontSize: 12,
                     color: "var(--color-muted)"
                   }}>
                {String(h).padStart(2,"0")}:00
              </div>
            ))}
            {/* untere Abschlusslinie */}
            <div style={{ borderTop:"1px solid rgba(0,0,0,.08)" }} />
          </div>

          {/* rechte Canvas-Spalte */}
          <div style={{ position:"relative", height: DAY_HEIGHT, background:"#F8FAFC", border:"1px dashed var(--color-border)", borderRadius:10 }}>
            {/* horizontale Linien (jede Stunde) */}
            {hours.map(h => (
              <div key={h}
                   style={{
                     position:"absolute",
                     top: h * PX_PER_HOUR,
                     left: 0, right: 0,
                     borderTop:"1px solid rgba(0,0,0,.06)"
                   }}
              />
            ))}

            {/* Klickflächen je Stunde: öffnet „Neuer Eintrag“ mit Start = :00 */}
            {hours.map(h => (
              <button
                key={`btn-${h}`}
                type="button"
                aria-label={`Neuer Eintrag um ${String(h).padStart(2,"0")}:00`}
                onClick={()=>openNewAt(h)}
                style={{
                  position:"absolute",
                  top: h * PX_PER_HOUR,
                  left: 0, right: 0,
                  height: PX_PER_HOUR,
                  background:"transparent",
                  outline:"none",
                  border:"none",
                  cursor:"crosshair"
                }}
                title="+ Neuer Eintrag"
              />
            ))}

            {/* Einträge – exakt von Start bis Ende positioniert */}
            {positioned.map(ev => {
              const isOrder = ev.kind === "order";
              return (
                <Link
                  key={ev.id}
                  href={`/termine/eintrag/${ev.id}`}
                  prefetch={false}
                  className="surface"
                  style={{
                    position:"absolute",
                    top: ev._top,
                    left: 6,
                    right: 6,
                    height: ev._height,
                    borderLeft: `4px solid ${isOrder ? "#F59E0B" : "#3B82F6"}`,
                    boxShadow:"var(--shadow-sm)",
                    textDecoration:"none",
                    color:"inherit",
                    padding: 8,
                    borderRadius: 10,
                    display:"flex",
                    flexDirection:"column",
                    gap: 4,
                    overflow:"hidden"
                  }}
                >
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                    <div style={{ fontWeight: 700, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {isOrder ? "🧾" : "📅"} {ev.title || "(ohne Titel)"}
                    </div>
                    {/* Status nur als Label (kein Button) */}
                    <span
                      className={`status-badge ${ev._status}`}
                      style={{ textTransform:"lowercase", pointerEvents:"none" }}
                    >
                      {ev._status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, opacity:.85 }}>
                    {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                    {ev.customerName ? ` · ${ev.customerName}` : ""}
                  </div>
                  {ev.note && (
                    <div style={{ fontSize:12, color:"#374151", opacity:.9, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {ev.note}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabelle „Alle Einträge am …“ */}
      <div className="surface">
        <div className="section-title" style={{ marginBottom: 8 }}>
          Alle Einträge am {formatDateDE(day)}
        </div>
        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{color:"#b91c1c"}}>{error}</div>}
        {!loading && !error && positioned.length === 0 && (
          <div className="surface" style={{ borderStyle:"dashed", textAlign:"center" }}>
            Keine Einträge an diesem Tag.
          </div>
        )}
        {!loading && !error && positioned.length > 0 && (
          <div className="list">
            {positioned.map(ev => (
              <Link
                key={ev.id}
                href={`/termine/eintrag/${ev.id}`}
                className="list-item"
                style={{ textDecoration:"none", color:"inherit" }}
                prefetch={false}
              >
                <div className={`item-icon ${ev.kind==='order'?'accent':''}`} aria-hidden="true">
                  {ev.kind === "order" ? "🧾" : "📅"}
                </div>
                <div style={{ minWidth:0 }}>
                  <div className="item-title ellipsis">{ev.title || "(ohne Titel)"}</div>
                  <div className="item-meta ellipsis">
                    {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                    {ev.customerName ? ` · ${ev.customerName}` : ""}
                  </div>
                </div>
                <div className="item-actions">
                  <span className={`status-badge ${ev._status}`}>{ev._status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* + Neuer Eintrag (Modal) */}
      <Modal
        open={openNew}
        onClose={()=>setOpenNew(false)}
        title="+ Neuer Eintrag"
        maxWidth={720}
      >
        <AppointmentForm
          initial={{ date: dateYMD, startAt: prefillStart, endAt: "" }}
          customers={customers}
          onSaved={async ()=>{
            setOpenNew(false);
            await reloadDay();
          }}
          onCancel={()=>setOpenNew(false)}
        />
      </Modal>

      {/* Schnell-Aktion unten */}
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button className="btn" onClick={()=>{ setPrefillStart("09:00"); setOpenNew(true); }}>
          + Neuer Eintrag
        </button>
      </div>

      {/* Zusätzliche Styles nur für diese Seite */}
      <style jsx>{`
        /* Status-Farben angleichen, falls global nicht vorhanden */
        .status-badge.offen{ background:#EFF6FF; border-color:#BFDBFE; }
        .status-badge.abgesagt{ background:#FEF2F2; border-color:#FECACA; }
        .status-badge.abgeschlossen{ background:#F0FDF4; border-color:#BBF7D0; }
      `}</style>
    </div>
  );
}
