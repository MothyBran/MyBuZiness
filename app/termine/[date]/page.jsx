// app/termine/[date]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

/* ===== Date/Time Utils ===== */
function toDate(input){ if (input instanceof Date) return input; if (typeof input==="string" && /^\d{4}-\d{2}-\d{2}$/.test(input)){ const [y,m,d]=input.split("-").map(Number); return new Date(y, m-1, d, 12,0,0,0);} const d=new Date(input||Date.now()); return isNaN(d)?new Date():d; }
function toYMD(d){ const z=toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function formatDateDE(input){ const d=toDate(input); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; }
function minutesOf(t){ if(!t) return 0; const [h,m]=t.split(":").map(Number); return (h||0)*60+(m||0); }

const MINUTE_PX = 1;           // 1 Minute = 1px => 1440px Gesamthöhe (scrollbar)
const LANE_HEIGHT = 24*60*MINUTE_PX;

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

export default function DayPage({ params }){
  const day = params?.date; // YYYY-MM-DD
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const [customers,setCustomers] = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [formInitial,setFormInitial] = useState(null);

  // Laden
  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      fetch(`/api/appointments?date=${day}`, { cache:"no-store" }).then(r=>r.json()).catch(()=>[]),
      fetch(`/api/customers`, { cache:"no-store" }).then(r=>r.json()).catch(()=>({ data:[] }))
    ])
    .then(([ev, c])=>{
      if (!alive) return;
      setItems(Array.isArray(ev)?ev:[]);
      setCustomers(c?.data || []);
    })
    .catch(err=>{ if(alive){ console.error(err); setError("Konnte Einträge nicht laden."); setItems([]);} })
    .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[day]);

  const sorted = useMemo(()=>{
    return [...items].sort((a,b)=>(a.startAt??"").localeCompare(b.startAt??""));
  },[items]);

  // Stundenreiter (0..23) – Klick öffnet Formular mit Startzeit dieser Stunde (00)
  const hours = useMemo(()=> Array.from({length:24},(_,h)=>`${String(h).padStart(2,"0")}:00`),[]);

  function openNewAt(startHHMM){
    setFormInitial({
      date: day,
      startAt: startHHMM,
      endAt: "" // leer – Benutzer kann wählen, End-Optionen sind bereits im Formular eingeschränkt
    });
    setShowForm(true);
  }

  async function afterSaved(){
    setShowForm(false);
    // Reload des Tages
    const ev = await fetch(`/api/appointments?date=${day}`, { cache:"no-store" }).then(r=>r.json()).catch(()=>[]);
    setItems(Array.isArray(ev)?ev:[]);
  }

  // Block-Positionierung
  function blockStyle(e){
    const startM = minutesOf(e.startAt || "00:00");
    const endM   = minutesOf(e.endAt || e.startAt || "00:00");
    const durM   = Math.max(30, Math.max(0, endM - startM)); // mind. 30 min sichtbar
    return {
      position: "absolute",
      left: 8,
      right: 8,
      top: startM * MINUTE_PX,
      height: durM * MINUTE_PX,
      borderRadius: 10,
      padding: 8,
      border: "1px solid var(--color-border)",
      background: e.kind === "order" ? "#FEF9C3" : "#EFF6FF",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      cursor: "pointer"
    };
  }

  return (
    <div className="container">
      <div className="surface" style={{ display:"grid", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
          <h2 className="page-title" style={{ margin:0 }}>Tagesansicht – {formatDateDE(day)}</h2>
          <Link href="/termine" className="btn-ghost">← Zur Monatsansicht</Link>
        </div>

        {/* Tagesraster */}
        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr", gap:8 }}>
          {/* Stundenleiste – Klick auf die Stunde öffnet Formular */}
          <div style={{ position:"relative" }}>
            {hours.map(hh => (
              <div
                key={hh}
                role="button"
                onClick={()=>openNewAt(hh)}
                title={`+ Neuer Eintrag ${hh}`}
                style={{ height: 60*MINUTE_PX, borderBottom:"1px dashed var(--color-border)", display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:8, cursor:"pointer", userSelect:"none" }}
              >
                <div className="day-hour">{hh}</div>
              </div>
            ))}
          </div>

          {/* Lane mit absoluten Blöcken */}
          <div style={{ position:"relative", height: LANE_HEIGHT, background:"#F8FAFC", border:"1px dashed var(--color-border)", borderRadius:10 }}>
            {/* horizontale Hilfslinien je Stunde */}
            {hours.map((hh, idx)=>(
              <div key={hh} style={{
                position:"absolute", left:0, right:0, top: idx*60*MINUTE_PX,
                borderTop: "1px dashed var(--color-border)",
                opacity: .6
              }} />
            ))}

            {/* Blöcke */}
            {sorted.map(ev=>{
              const href = `/termine/eintrag/${ev.id}`;
              const timeLabel = `${ev.startAt?.slice(0,5)}${ev.endAt?`–${ev.endAt.slice(0,5)}`:""}`;
              const displayStatus = computeDisplayStatus(ev);
              return (
                <Link key={ev.id} href={href} style={{ textDecoration:"none", color:"inherit" }}>
                  <div style={blockStyle(ev)} title={`${timeLabel} · ${ev.title || ""}`}>
                    <div style={{ fontSize:12, opacity:.8 }}>{timeLabel} · {ev.customerName || (ev.kind==='order' ? "Auftrag" : "Termin")}</div>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {ev.title || "(ohne Titel)"}
                    </div>
                    <div style={{ marginTop:6 }}>
                      <span className={`status-badge ${displayStatus}`}>{displayStatus}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Liste darunter: Alle Einträge am … (ganzer Container klickbar) */}
        <div>
          <div className="section-title" style={{ marginBottom:8 }}>Alle Einträge am {formatDateDE(day)}</div>
          {loading && <div className="subtle">Lade …</div>}
          {!loading && error && <div style={{ color:"#b91c1c" }}>{error}</div>}
          {!loading && !error && sorted.length === 0 && (
            <div className="surface" style={{ borderStyle:"dashed", textAlign:"center" }}>Keine Einträge.</div>
          )}
          <div style={{ display:"grid", gap:10 }}>
            {sorted.map(ev=>{
              const href = `/termine/eintrag/${ev.id}`;
              const displayStatus = computeDisplayStatus(ev);
              return (
                <Link key={ev.id} href={href} style={{ textDecoration:"none", color:"inherit" }}>
                  <div className="list-item" style={{ gridTemplateColumns:"40px 1fr auto" }}>
                    <div className={`item-icon ${ev.kind==='order'?'accent':''}`} title={ev.kind==='order'?'Auftrag':'Termin'}>
                      {ev.kind==='order' ? "🧾" : "📅"}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div className="item-title">{ev.title || "(ohne Titel)"}</div>
                      <div className="item-meta">
                        {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                        {ev.customerName && <> · {ev.customerName}</>}
                      </div>
                    </div>
                    <div className="item-actions">
                      <span className={`status-badge ${displayStatus}`}>{displayStatus}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Button "+ Neuer Eintrag" oben rechts optional */}
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button className="btn" onClick={()=>openNewAt("09:00")}>+ Neuer Eintrag</button>
        </div>
      </div>

      {/* Modal: Neuer/Bearbeiten */}
      <Modal open={showForm} onClose={()=>setShowForm(false)} title="+ Neuer Eintrag">
        <AppointmentForm
          initial={formInitial}
          customers={customers}
          onSaved={afterSaved}
          onCancel={()=>setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
