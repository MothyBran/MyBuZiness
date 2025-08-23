// app/components/DashboardAppointments.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ===== Datum-Utils (robust für YYYY-MM-DD oder ISO) ======================= */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(input);
  return isNaN(d) ? new Date() : d;
}
function formatDateDE(input){
  const d = toDate(input);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/* ===== Anzeige-/Status-Logik ============================================= */
const LABEL = { appointment: "Termin", order: "Auftrag" };
const STATUS_LABEL = { open: "offen", cancelled: "abgesagt", done: "abgeschlossen" };
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

export default function DashboardAppointments(){
  const [items, setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?upcoming=true&limit=3`)
      .then(async r => { if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(data => { if(alive) setItems(Array.isArray(data) ? data : []); })
      .catch(err => { if(alive){ setItems([]); setError("Konnte Termine nicht laden."); console.error(err);} })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false; };
  },[]);

  const prepared = useMemo(()=>{
    return (items||[]).map(x => ({
      ...x,
      _displayStatus: computeDisplayStatus(x)
    }));
  },[items]);

  async function quickStatus(id, to){
    const res = await fetch(`/api/appointments/${id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status: to })
    });
    if(!res.ok){ alert("Status konnte nicht geändert werden."); return; }
    // neu laden
    const d = await fetch(`/api/appointments?upcoming=true&limit=3`).then(r=>r.json()).catch(()=>[]);
    setItems(Array.isArray(d)?d:[]);
  }

  return (
    <div className="surface" style={{ padding: 14, borderRadius: "var(--radius,12px)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: .2 }}>Nächste Termine / Aufträge</h3>
        <Link href="/termine" className="btn-ghost">Alle ansehen →</Link>
      </div>

      {/* Lade-/Fehlerzustände */}
      {loading && (
        <div style={{ display:"grid", gap:8 }}>
          <SkeletonRow/><SkeletonRow/><SkeletonRow/>
        </div>
      )}
      {!loading && error && (
        <div className="subtle" style={{ color:"#b91c1c" }}>{error}</div>
      )}

      {/* Inhalte */}
      {!loading && !error && prepared.length === 0 && (
        <EmptyState />
      )}

      {!loading && !error && prepared.length > 0 && (
        <div style={{ display:"grid", gap: 10 }}>
          {prepared.map(ev => (
            <div key={ev.id} className="dash-row">
              {/* Art-Icon */}
              <div className={`dash-chip ${ev.kind==='order'?'accent':'info'}`} title={LABEL[ev.kind] || ""}>
                {ev.kind==='order' ? "🧾" : "📅"}
              </div>

              {/* Textblock */}
              <div className="dash-main">
                <div className="dash-title ellipsis">
                  <Link href={`/termine/eintrag/${ev.id}`} className="dash-link">
                    {ev.title || "(ohne Titel)"}
                  </Link>
                </div>
                <div className="dash-meta">
                  <span>{formatDateDE(ev.date)} · {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}</span>
                  {ev.customerName && <span> · {ev.customerName}</span>}
                </div>
              </div>

              {/* Status & Quick Actions */}
              <div className="dash-actions">
                <span className={`status-badge ${ev._displayStatus}`}>{ev._displayStatus}</span>
                <div className="dash-btns">
                  {/* Quick-Set: fertig/abgesagt/offen */}
                  {ev._displayStatus !== "abgeschlossen" && (
                    <button className="btn-xxs" onClick={()=>quickStatus(ev.id,"done")} title="Als abgeschlossen markieren">✓</button>
                  )}
                  {ev._displayStatus !== "abgesagt" && (
                    <button className="btn-xxs" onClick={()=>quickStatus(ev.id,"cancelled")} title="Absagen">✖</button>
                  )}
                  {ev._displayStatus !== "offen" && (
                    <button className="btn-xxs" onClick={()=>quickStatus(ev.id,"open")} title="Wieder öffnen">⟲</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .dash-row{
          display:grid;
          grid-template-columns: 42px 1fr auto;
          gap: 10px;
          align-items:center;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 12px;
          padding: 10px;
          background: #fff;
        }
        .dash-chip{
          width: 32px; height: 32px; border-radius: 999px;
          display:flex; align-items:center; justify-content:center;
          font-size: 16px; box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06));
          background: #e5e7eb;
        }
        .dash-chip.info{ background: #DBEAFE; }   /* Termin */
        .dash-chip.accent{ background: #FDE68A; } /* Auftrag */

        .dash-main{ display:flex; flex-direction:column; gap: 2px; min-width:0; }
        .dash-title{ font-weight: 700; font-size: 15px; }
        .dash-link{ color: inherit; text-decoration: none; }
        .dash-link:hover{ text-decoration: underline; }
        .dash-meta{ font-size: 13px; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .dash-actions{ display:flex; align-items:center; gap:10px; }
        .dash-btns{ display:flex; gap:6px; }
        .btn-xxs{
          font-size: 12px; padding: 4px 8px; border-radius: 8px;
          background: #fff; border:1px solid rgba(0,0,0,.12);
        }
        .btn-xxs:hover{ background:#fafafa; }
        .ellipsis{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
}

function SkeletonRow(){
  return (
    <div style={{display:"grid", gridTemplateColumns:"42px 1fr 140px", gap:10, alignItems:"center"}}>
      <div style={{width:32,height:32,borderRadius:999,background:"#eee"}} />
      <div>
        <div style={{height:12,background:"#eee",borderRadius:6,marginBottom:6,width:"65%"}} />
        <div style={{height:10,background:"#f0f0f0",borderRadius:6,width:"45%"}} />
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <div style={{height:24,width:88,background:"#eee",borderRadius:999}} />
        <div style={{height:24,width:28,background:"#eee",borderRadius:8}} />
      </div>
    </div>
  );
}

function EmptyState(){
  return (
    <div style={{
      padding:14, border: "1px dashed rgba(0,0,0,.15)", borderRadius: 12,
      background:"#fafafa", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"
    }}>
      <div>
        <div style={{fontWeight:800, marginBottom:4}}>Keine anstehenden Einträge</div>
        <div className="subtle">Lege jetzt deinen ersten Termin oder Auftrag an.</div>
      </div>
      <Link href="/termine" className="btn">+ Neuer Eintrag</Link>
    </div>
  );
}
