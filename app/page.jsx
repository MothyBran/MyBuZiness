// app/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

/* ===== Robuste Datums-Utilities (YYYY-MM-DD & ISO) ======================== */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0); // 12:00 gegen TZ-Shift
  }
  const d = new Date(input);
  return isNaN(d) ? new Date() : d;
}
function fmtDateDE(input){
  const d = toDate(input);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/* ===== Anzeige-/Status-Logik ============================================== */
const LABEL_KIND = { appointment: "Termin", order: "Auftrag" };
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

/* ===== Widget: Nächste Termine / Aufträge (3) ============================= */
function UpcomingAppointments(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load() {
    try{
      setLoading(true); setError("");
      const r = await fetch(`/api/appointments?upcoming=true&limit=3`, { cache: "no-store" });
      if(!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    }catch(e){
      console.error(e);
      setItems([]);
      setError("Konnte Termine nicht laden.");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); },[]);

  const prepared = useMemo(()=> (items||[]).map(x=>({
    ...x,
    _displayStatus: computeDisplayStatus(x)
  })),[items]);

  async function quickStatus(id, to){
    const res = await fetch(`/api/appointments/${id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status: to })
    });
    if(!res.ok){ alert("Status konnte nicht geändert werden."); return; }
    load();
  }

  return (
    <div className="surface card" style={{padding:12}}>
      <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0}}>Nächste Termine / Aufträge</h2>
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
      {!loading && !error && prepared.length===0 && (
        <div style={{
          padding:12, border:"1px dashed rgba(0,0,0,.15)", borderRadius:12,
          background:"#fafafa", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"
        }}>
          <div>
            <div style={{fontWeight:800, marginBottom:4}}>Keine anstehenden Einträge</div>
            <div className="subtle">Lege jetzt deinen ersten Termin oder Auftrag an.</div>
          </div>
          <Link href="/termine" className="btn">+ Neuer Eintrag</Link>
        </div>
      )}

      {/* Inhalte */}
      {!loading && !error && prepared.length>0 && (
        <div style={{ display:"grid", gap:10 }}>
          {prepared.map(ev=>(
            <div key={ev.id} className="dash-row" style={{
              display:"grid", gridTemplateColumns:"42px 1fr auto", gap:10, alignItems:"center",
              border:"1px solid rgba(0,0,0,.08)", borderRadius:12, padding:10, background:"#fff"
            }}>
              {/* Art-Icon */}
              <div className={`dash-chip ${ev.kind==='order'?'accent':'info'}`} title={LABEL_KIND[ev.kind]||""} style={{
                width:32,height:32,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16, boxShadow:"var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06))",
                background: ev.kind==='order' ? "#FDE68A" : "#DBEAFE"
              }}>
                {ev.kind==='order' ? "🧾" : "📅"}
              </div>

              {/* Textblock */}
              <div style={{ display:"flex",flexDirection:"column",gap:2,minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  <Link href={`/termine/eintrag/${ev.id}`} className="dash-link" style={{color:"inherit",textDecoration:"none"}}>
                    {ev.title || "(ohne Titel)"}
                  </Link>
                </div>
                <div className="subtle" style={{ fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  <Link href={`/termine/${(typeof ev.date==='string' && ev.date.length>10) ? ev.date.slice(0,10) : ev.date}`} style={{color:"inherit", textDecoration:"none"}}>
                    {fmtDateDE(ev.date)} · {ev.startAt?.slice(0,5)}{ev.endAt?`–${ev.endAt.slice(0,5)}`:""}
                  </Link>
                  {ev.customerName && <span> · {ev.customerName}</span>}
                </div>
              </div>

              {/* Status + Quick-Buttons */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span className={`status-badge ${ev._displayStatus}`} style={{
                  textTransform:"capitalize", borderRadius:999, padding:"4px 10px",
                  fontSize:12, border:"1px solid rgba(0,0,0,.12)", background:"#fff"
                }}>
                  {ev._displayStatus}
                </span>
                <div style={{ display:"flex", gap:6 }}>
                  {ev._displayStatus!=="abgeschlossen" && (
                    <button className="btn-xxs" onClick={()=>quickStatus(ev.id,"done")} title="Als abgeschlossen markieren"
                      style={btnXxsStyle}>✓</button>
                  )}
                  {ev._displayStatus!=="abgesagt" && (
                    <button className="btn-xxs" onClick={()=>quickStatus(ev.id,"cancelled")} title="Absagen"
                      style={btnXxsStyle}>✖</button>
                  )}
                  {ev._displayStatus!=="offen" && (
                    <button className="btn-xxs" onClick={()=>quickStatus(ev.id,"open")} title="Wieder öffnen"
                      style={btnXxsStyle}>⟲</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnXxsStyle = {
  fontSize:12, padding:"4px 8px", borderRadius:8,
  background:"#fff", border:"1px solid rgba(0,0,0,.12)"
};

/* ===== Dashboard-Seite ===================================================== */
export default function DashboardPage() {
  const [totals, setTotals] = useState({ today: 0, last7: 0, last30: 0 });
  const [counts, setCounts] = useState({ customers: 0, products: 0, invoices: 0, receipts: 0 });
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [currency, setCurrency] = useState("EUR");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const js = await res.json();
        if (!js.ok) throw new Error(js.error || "Fehler beim Laden");

        setTotals(js.data.totals || {});
        setCounts(js.data.counts || {});
        setRecentReceipts(js.data.recentReceipts || []);
        setRecentInvoices(js.data.recentInvoices || []);
        setCurrency(js.data.settings?.currencyDefault || "EUR");
        setSettings(js.data.settings || null);

        // Design-Variablen aus Settings setzen
        if (js.data.settings) {
          const s = js.data.settings;
          const root = document.documentElement;
          if (s.primaryColor)   root.style.setProperty("--color-primary", s.primaryColor);
          if (s.secondaryColor) root.style.setProperty("--color-secondary", s.secondaryColor);
          if (s.fontFamily)     root.style.setProperty("--font-family", s.fontFamily);
          if (s.fontColor)      root.style.setProperty("--color-text", s.fontColor);
        }
      } catch (e) {
        console.error("Dashboard error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div>⏳ Lade Dashboard…</div>;
  }

  return (
    <div className="grid-gap-16">
      {/* Umsatz-Karten */}
      <section className="grid-gap-16 grid-1-3">
        <Card><div className="card-title">Heute</div><div className="card-value">{money(totals.today, currency)}</div></Card>
        <Card><div className="card-title">Letzte 7 Tage</div><div className="card-value">{money(totals.last7, currency)}</div></Card>
        <Card><div className="card-title">Letzte 30 Tage</div><div className="card-value">{money(totals.last30, currency)}</div></Card>
      </section>

      {/* Zähler */}
      <section className="grid-gap-16 grid-2-4">
        <Card><div className="card-title">Kunden</div><div className="card-value">{counts.customers}</div></Card>
        <Card><div className="card-title">Produkte</div><div className="card-value">{counts.products}</div></Card>
        <Card><div className="card-title">Rechnungen</div><div className="card-value">{counts.invoices}</div></Card>
        <Card><div className="card-title">Belege</div><div className="card-value">{counts.receipts}</div></Card>
      </section>

      {/* Card: Nächste 3 Termine / Aufträge (neues Widget) */}
      <Card>
        <UpcomingAppointments />
      </Card>

      {/* Neueste Belege */}
      <Card>
        <div className="card-title">Neueste Belege</div>
        <div className="list-divider">
          {recentReceipts.length === 0 && (
            <div className="subtle" style={{ padding: "8px 0" }}>Keine Belege vorhanden.</div>
          )}
          {recentReceipts.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>#{r.receiptNo}</span>
              <span>{money(r.grossCents, r.currency || currency)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Neueste Rechnungen */}
      <Card>
        <div className="card-title">Neueste Rechnungen</div>
        <div className="list-divider">
          {recentInvoices.length === 0 && (
            <div className="subtle" style={{ padding: "8px 0" }}>Keine Rechnungen vorhanden.</div>
          )}
          {recentInvoices.map(inv => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>#{inv.invoiceNo} — {inv.customerName || "Unbekannt"}</span>
              <span>{money(inv.grossCents, inv.currency || currency)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}

/* ===== Kleine Skeleton-Komponente für Ladezustand ========================= */
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
