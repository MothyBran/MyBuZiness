// app/termine/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Page, PageHeader, PageGrid, Col, Card, Button, Badge, StatusPill
} from "../components/UI";

/* Date Utils */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input==="string" && /^\d{4}-\d{2}-\d{2}$/.test(input)){
    const [y,m,d]=input.split("-").map(Number);
    return new Date(y, m-1, d, 12,0,0,0);
  }
  const d=new Date(input||Date.now());
  return isNaN(d)?new Date():d;
}
function formatDateDE(input){
  const d=toDate(input);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function startOfMonth(d){ const x=toDate(d); x.setDate(1); x.setHours(12,0,0,0); return x; }
function addMonths(d,m){ const x=toDate(d); x.setMonth(x.getMonth()+m); return x; }
function toYMD(d){ const z=toDate(d); z.setHours(12,0,0,0); return z.toISOString().slice(0,10); }
function ym(d){ const x=toDate(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; }
const TODAY_YMD = toYMD(new Date());

/* Status */
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

export default function TerminePage(){
  const [cursor,setCursor]=useState(()=>startOfMonth(new Date()));
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const monthString = useMemo(()=>ym(cursor),[cursor]);

  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?month=${monthString}`, { cache:"no-store" })
      .then(async r=>{ if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(data=>{ if(alive) setEvents(Array.isArray(data)?data:[]); })
      .catch(err=>{ if(alive){ console.error(err); setError("Konnte Termine nicht laden."); setEvents([]);} })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[monthString]);

  const days = useMemo(()=>{
    const first = startOfMonth(cursor);
    const weekday = (first.getDay()+6)%7; // Mo=0..So=6
    const start = new Date(first); start.setDate(first.getDate()-weekday);
    return Array.from({length:42}, (_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d; });
  },[cursor]);

  const byDate = useMemo(()=>{
    const map={};
    for(const e of events){ const key=toYMD(e.date); (map[key] ||= []).push(e); }
    Object.values(map).forEach(list => list.sort((a,b)=> (a.startAt??"").localeCompare(b.startAt??"")));
    return map;
  },[events]);

  return (
    <Page>
      <PageHeader
        title="Termine – Monatsansicht"
        actions={
          <>
            <Button variant="ghost" onClick={()=>setCursor(addMonths(cursor,-1))} aria-label="Vormonat">◀︎</Button>
            <Button variant="ghost" onClick={()=>setCursor(addMonths(cursor,1))} aria-label="Folgemonat">▶︎</Button>
          </>
        }
      />

      <PageGrid>
        {/* Monatskalender */}
        <Col span={12}>
          <Card title="Kalender">
            <div className="form" style={{ marginBottom: 8 }}>
              <div className="muted">
                {new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(cursor)}
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
              {["Mo","Di","Mi","Do","Fr","Sa","So"].map(h=>(
                <div key={h} className="muted" style={{ fontWeight:700, padding:"6px 4px" }}>{h}</div>
              ))}
              {days.map((d,i)=>{
                const inMonth = d.getMonth()===cursor.getMonth();
                const key = toYMD(d);
                const list = byDate[key]||[];
                const isToday = key===TODAY_YMD;
                return (
                  <Link
                    key={i}
                    href={`/termine/${key}`}
                    className="card"
                    style={{
                      padding: 8, textDecoration:"none",
                      borderStyle: isToday ? "solid" : "solid",
                      borderColor: isToday ? "var(--brand)" : "var(--border)",
                      background: "var(--panel-2)"
                    }}
                  >
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4 }}>
                      <div style={{ fontWeight:700, fontSize:"1.2em" }}>{d.getDate()}</div>
                    </div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {list.slice(0,4).map(x=>(
                        <Badge key={x.id} tone={x.kind==='order'?'warning':'info'}>
                          {x.kind==='order'?'Auftrag':'Termin'}
                        </Badge>
                      ))}
                      {list.length>4 && <Badge tone="muted">+{list.length-4}</Badge>}
                    </div>
                  </Link>
                );
              })}
            </div>

            {loading && <p className="muted" style={{marginTop:10}}>Lade Termine…</p>}
            {error && !loading && <p className="error" style={{marginTop:10}}>{error}</p>}
          </Card>
        </Col>

        {/* Monatsliste */}
        <Col span={12}>
          <Card title="Termine / Aufträge – Übersicht" scrollX>
            {(!loading && !error && events.length===0) && (
              <div className="card" style={{borderStyle:"dashed", padding:16, textAlign:"center"}}>
                Keine Einträge im ausgewählten Monat.
              </div>
            )}

            <div style={{ display:"grid", gap:8 }}>
              {events.map(ev=>{
                const displayStatus = computeDisplayStatus(ev);
                return (
                  <div
                    key={ev.id}
                    className="card"
                    style={{ padding: 10, display:"grid", gridTemplateColumns:"auto 1fr auto", gap:10, alignItems:"center" }}
                  >
                    <div style={{ fontSize:20 }} title={ev.kind==='order'?'Auftrag':'Termin'}>
                      {ev.kind==='order' ? "🧾" : "📅"}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        <Link href={`/termine/eintrag/${ev.id}`} style={{ color:"inherit", textDecoration:"none" }}>
                          {ev.title || "(ohne Titel)"}
                        </Link>
                      </div>
                      <div className="muted" style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        <Link href={`/termine/${(typeof ev.date==='string' && ev.date.length>10) ? ev.date.slice(0,10) : ev.date}`} style={{ color:"inherit", textDecoration:"none" }}>
                          {formatDateDE(ev.date)} · {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                        </Link>
                        {ev.customerName && <> · {ev.customerName}</>}
                      </div>
                    </div>
                    <div>
                      <StatusPill status={displayStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </PageGrid>
    </Page>
  );
}
