// app/termine/eintrag/[id]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/Modal";
import AppointmentForm from "@/app/components/AppointmentForm";

function fmtDateDE(input){
  try{
    const d = new Date(input);
    if (!isNaN(d)) {
      return new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", weekday:"long" }).format(d);
    }
  }catch{}
  // Fallback für YYYY-MM-DD
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y,m,d] = input.slice(0,10).split("-").map(Number);
    return new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", weekday:"long" }).format(new Date(y, m-1, d));
  }
  return String(input || "");
}

export default function EntryDetailPage({ params }){
  const id = params?.id;
  const router = useRouter();

  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [customers, setCustomers] = useState([]);

  async function load(){
    setLoading(true); setError("");
    try{
      const r = await fetch(`/api/appointments/${id}`, { cache:"no-store" });
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setData(js);
    }catch(e){
      console.error(e);
      setError("Eintrag konnte nicht geladen werden.");
      setData(null);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [id]);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" }).catch(()=>null);
        const js = r && r.ok ? await r.json() : { data: [] };
        setCustomers(js?.data || []);
      }catch{ setCustomers([]); }
    })();
  },[]);

  async function onDelete(){
    if (!data) return;
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const r = await fetch(`/api/appointments/${data.id}`, { method:"DELETE" });
    if (!r.ok) {
      alert("Löschen fehlgeschlagen.");
      return;
    }
    // Nach dem Löschen zurück zur Tagesansicht (falls Datum bekannt), sonst Monatsübersicht
    const target = data?.date ? `/termine/${(typeof data.date === "string" ? data.date.slice(0,10) : new Date(data.date).toISOString().slice(0,10))}` : "/termine";
    router.push(target);
  }

  function onSavedEdit(){
    setEditOpen(false);
    load();
  }

  return (
    <div className="container">
      <div className="surface" style={{display:"grid", gap:12}}>
        {/* Header */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
          <h2 className="page-title" style={{margin:0}}>Eintrag · Details</h2>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            {data?.date ? (
              <Link href={`/termine/${(typeof data.date==="string" ? data.date.slice(0,10) : new Date(data.date).toISOString().slice(0,10))}`} className="btn-ghost">
                ← Zur Tagesansicht
              </Link>
            ) : (
              <Link href="/termine" className="btn-ghost">← Zur Kalenderansicht</Link>
            )}
            <button className="btn" onClick={()=>setEditOpen(true)}>Bearbeiten</button>
            <button className="btn btn-danger" onClick={onDelete}>Löschen</button>
          </div>
        </div>

        {/* Content */}
        {loading && <div className="subtle">Lade…</div>}
        {!loading && error && <div style={{color:"#b91c1c"}}>{error}</div>}

        {!loading && !error && data && (
          <div className="surface" style={{display:"grid", gap:12}}>
            <div className="section-title">Zusammenfassung</div>
            <div className="detail">
              <div className="row">
                <div className="label">Art</div>
                <div className="value">{data.kind === "order" ? "Auftrag" : "Termin"}</div>
              </div>
              <div className="row">
                <div className="label">Bezeichnung</div>
                <div className="value">{data.title || "—"}</div>
              </div>
              <div className="row">
                <div className="label">Datum</div>
                <div className="value">{fmtDateDE(typeof data.date === "string" ? data.date.slice(0,10) : data.date)}</div>
              </div>
              <div className="row">
                <div className="label">Zeit</div>
                <div className="value">
                  {data.startAt?.slice(0,5)}{data.endAt ? ` – ${data.endAt.slice(0,5)}` : ""}
                </div>
              </div>
              <div className="row">
                <div className="label">Kunde</div>
                <div className="value">{data.customerName || "—"}</div>
              </div>
              <div className="row">
                <div className="label">Status</div>
                <div className="value">
                  {data.status === "cancelled" ? "abgesagt" : data.status === "done" ? "abgeschlossen" : "offen"}
                </div>
              </div>
              <div className="row">
                <div className="label">Notiz</div>
                <div className="value" style={{whiteSpace:"pre-wrap"}}>{data.note || "—"}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Bearbeiten */}
      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Eintrag bearbeiten" maxWidth={640}>
        {data && (
          <AppointmentForm
            initial={{
              id: data.id,
              kind: data.kind,
              title: data.title,
              date: typeof data.date === "string" ? data.date.slice(0,10) : new Date(data.date).toISOString().slice(0,10),
              startAt: data.startAt?.slice(0,5) || "09:00",
              endAt: data.endAt?.slice(0,5) || "",
              customerId: data.customerId || "",
              customerName: data.customerName || "",
              status: data.status || "open",
              note: data.note || "",
            }}
            customers={customers}
            onSaved={onSavedEdit}
            onCancel={()=>setEditOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
