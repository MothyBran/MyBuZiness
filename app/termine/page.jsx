"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Page, PageHeader, PageGrid, Col, Card, Button, Badge, StatusPill, Modal
} from "../components/UI";
import AppointmentForm from "../components/AppointmentForm";

/* Date Utils */
function toDate(input){
  if (input instanceof Date) return new Date(input.getTime());
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
  const [viewMode, setViewMode] = useState("calendar");
  const [cursor,setCursor]=useState(()=>startOfMonth(new Date()));
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const monthString = useMemo(()=>ym(cursor),[cursor]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [appointmentSettings, setAppointmentSettings] = useState({ workdays: [1,2,3,4,5], start: "08:00", end: "18:00" });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(()=>{
    let alive = true;
    setLoading(true); setError("");
    fetch(`/api/appointments?month=${monthString}`, { cache:"no-store" })
      .then(async r=>{ if(!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(data=>{ if(alive) setEvents(Array.isArray(data)?data:[]); })
      .catch(err=>{ if(alive){ console.error(err); setError("Konnte Termine nicht laden."); setEvents([]);} })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive=false; };
  },[monthString, refreshKey]);

  useEffect(()=>{
    fetch("/api/customers").then(r=>r.json()).then(d=>setCustomers(d.data||[])).catch(()=>{});
    fetch("/api/mitarbeiter").then(r=>r.json()).then(d=>setEmployees(d.data||[])).catch(()=>{});
    fetch("/api/settings").then(r=>r.json()).then(d=>{
      if (d?.data?.appointmentSettings) {
        setAppointmentSettings(d.data.appointmentSettings);
      }
    }).catch(()=>{});
  },[]);

  async function saveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentSettings })
      });
      setSettingsOpen(false);
      setRefreshKey(k=>k+1);
    } catch(err) {
      console.error(err);
      alert("Fehler beim Speichern der Einstellungen");
    } finally {
      setSavingSettings(false);
    }
  }

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
        title="Termine"
        actions={
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Button variant="ghost" onClick={() => setSettingsOpen(true)} title="Kalender Einstellungen" style={{ fontSize: "1.2rem", padding: "4px 8px" }}>
              ⚙️
            </Button>
            <div className="segmented-control" style={{ display: "flex", background: "var(--panel-2)", padding: 4, borderRadius: 8 }}>
              <button
                onClick={() => setViewMode("calendar")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: viewMode === "calendar" ? "var(--panel)" : "transparent",
                  boxShadow: viewMode === "calendar" ? "var(--shadow-sm)" : "none",
                  border: "none",
                  fontWeight: 500,
                  cursor: "pointer",
                  color: "var(--text)"
                }}
              >
                Kalender
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: viewMode === "list" ? "var(--panel)" : "transparent",
                  boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none",
                  border: "none",
                  fontWeight: 500,
                  cursor: "pointer",
                  color: "var(--text)"
                }}
              >
                Liste
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Button variant="ghost" onClick={(e) => { e.preventDefault(); setCursor(addMonths(cursor,-1)); }} aria-label="Vormonat">◀︎</Button>
              <div
                style={{ fontWeight: 600, minWidth: 140, textAlign: "center", cursor: "pointer", userSelect: "none" }}
                onClick={() => {
                  setPickerYear(cursor.getFullYear());
                  setPickerOpen(true);
                }}
                title="Monat/Jahr wählen"
              >
                {new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(cursor)}
              </div>
              <Button variant="ghost" onClick={(e) => { e.preventDefault(); setCursor(addMonths(cursor,1)); }} aria-label="Folgemonat">▶︎</Button>
            </div>

            <Button variant="primary" icon="plus" onClick={()=>setCreateOpen(true)}>Neu</Button>
          </div>
        }
      />

      <PageGrid>
        {/* Monatskalender */}
        {viewMode === "calendar" && (
          <Col span={12}>
            <Card title="Monatsansicht">
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
                        background: inMonth ? "var(--panel)" : "var(--panel-2)",
                        opacity: inMonth ? 1 : 0.6,
                        minHeight: 80
                      }}
                    >
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                        <div style={{ fontWeight:700, fontSize:"1.1em" }}>{d.getDate()}</div>
                        {isToday && <div style={{ fontSize: "0.7em", color: "var(--brand)", fontWeight: 700 }}>HEUTE</div>}
                      </div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {list.slice(0,4).map(x=>(
                          <Badge key={x.id} tone={x.kind==='order'?'warning':'info'}>
                            {x.startAt ? x.startAt.slice(0,5) : "•"}
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
        )}

        {/* Monatsliste */}
        {viewMode === "list" && (
          <Col span={12}>
            <Card title="Übersicht">
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
        )}
      </PageGrid>

      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title="Neuer Eintrag">
        <AppointmentForm
          customers={customers}
          onSaved={()=>{ setCreateOpen(false); setRefreshKey(k=>k+1); }}
          onCancel={()=>setCreateOpen(false)}
        />
      </Modal>

      <Modal open={settingsOpen} onClose={()=>setSettingsOpen(false)} title="Kalender Einstellungen" footer={null}>
        <form onSubmit={saveSettings} className="form">
          <label className="field">
            <span className="label">Arbeitstage</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
                const isSelected = appointmentSettings.workdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setAppointmentSettings(prev => ({
                        ...prev,
                        workdays: isSelected
                          ? prev.workdays.filter(d => d !== day)
                          : [...prev.workdays, day]
                      }));
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: isSelected ? "var(--brand)" : "transparent",
                      color: isSelected ? "#fff" : "var(--text)",
                      cursor: "pointer"
                    }}
                  >
                    {dayNames[day]}
                  </button>
                );
              })}
            </div>
          </label>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <label className="field" style={{ flex: 1 }}>
              <span className="label">Geschäftszeit Beginn</span>
              <input
                type="time"
                className="input"
                value={appointmentSettings.start}
                onChange={e => setAppointmentSettings({...appointmentSettings, start: e.target.value})}
                required
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span className="label">Geschäftszeit Ende</span>
              <input
                type="time"
                className="input"
                value={appointmentSettings.end}
                onChange={e => setAppointmentSettings({...appointmentSettings, end: e.target.value})}
                required
              />
            </label>
          </div>
          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <Button variant="ghost" type="button" onClick={() => setSettingsOpen(false)}>Abbrechen</Button>
            <Button type="submit" disabled={savingSettings}>{savingSettings ? "Speichert..." : "Speichern"}</Button>
          </div>
        </form>
      </Modal>

      {/* Monat/Jahr Picker Modal */}
      <Modal open={pickerOpen} onClose={()=>setPickerOpen(false)} title="Monat / Jahr wählen">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button variant="ghost" onClick={() => setPickerYear(y => y - 1)}>◀︎ {pickerYear - 1}</Button>
            <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{pickerYear}</div>
            <Button variant="ghost" onClick={() => setPickerYear(y => y + 1)}>{pickerYear + 1} ▶︎</Button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"].map((m, i) => (
              <Button
                key={m}
                variant={cursor.getMonth() === i && cursor.getFullYear() === pickerYear ? "primary" : "ghost"}
                onClick={() => {
                  const d = new Date(pickerYear, i, 1, 12, 0, 0, 0);
                  setCursor(d);
                  setPickerOpen(false);
                }}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    </Page>
  );
}
