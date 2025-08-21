// app/termine/eintrag/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppointmentForm from "@/app/components/AppointmentForm";

/* Utils */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d]=input.split("-").map(Number);
    return new Date(y, m-1, d, 12, 0, 0, 0);
  }
  const d = new Date(input || Date.now());
  return isNaN(d) ? new Date() : d;
}
function formatDateDE(input){
  const d = toDate(input);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
const STATUS_LABEL = { open: "offen", cancelled: "abgesagt", done: "abgeschlossen" };

export default function EntryDetail({ params }){
  const id = params.id;
  const [item, setItem] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(()=>{
    fetch(`/api/appointments/${id}`).then(r=>r.json()).then(setItem).catch(()=>setItem(null));
    fetch(`/api/customers`).then(r=>r.json()).then(js=>{
      const arr = Array.isArray(js) ? js : js?.data || js?.rows || js?.items || js?.customers || [];
      const mapped = (arr||[]).map(c=>({
        id: String(c.id ?? c.customerId ?? c.uuid ?? c._id ?? ""),
        name: String(c.name ?? c.fullName ?? c.company ?? c.title ?? ""),
        street: c.addressStreet ?? c.street ?? c.address ?? "",
        zip: c.addressZip ?? c.zip ?? c.plz ?? "",
        city: c.addressCity ?? c.city ?? c.town ?? "",
        phone: c.phone ?? c.tel ?? c.telephone ?? ""
      })).filter(x=>x.id && x.name);
      setCustomers(mapped);
    }).catch(()=>setCustomers([]));
  },[id]);

  async function handleDelete(e){
    e?.preventDefault?.();
    if (!item) return;
    if(!window.confirm("Diesen Eintrag wirklich löschen?")) return;
    setDeleting(true);
    const res = await fetch(`/api/appointments/${item.id}`, { method:"DELETE" });
    if(!res.ok){ setDeleting(false); alert("Löschen fehlgeschlagen."); return; }
    location.href = "/termine";
  }

  if (!item) return (
    <div className="container surface">
      <h2 className="page-title">Termin</h2>
      <p>Eintrag wurde nicht gefunden.</p>
      <Link href="/termine" className="btn-ghost">← Zurück</Link>
    </div>
  );

  const cust = customers.find(c=> String(c.id) === String(item.customerId));

  return (
    <div className="container">
      <div className="surface">
        <div style={{display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", marginBottom:10}}>
          <h2 className="page-title" style={{margin:0}}>Termin / Auftrag</h2>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <button className="btn-ghost" onClick={()=>setOpenEdit(true)}>⚙️ Bearbeiten</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting?"Lösche…":"❌ Löschen"}</button>
            <Link href="/termine" className="btn-ghost">← Zurück</Link>
          </div>
        </div>

        <div className="detail">
          <div className="row">
            <div className="label">Art</div>
            <div className="value">{item.kind==="order" ? "Auftrag" : "Termin"}</div>
          </div>

          <div className="row">
            <div className="label">Uhrzeit & Datum</div>
            <div className="value">{item.startAt?.slice(0,5)}{item.endAt?`–${item.endAt.slice(0,5)}`:""} · {formatDateDE(item.date)}</div>
          </div>

          <div className="row">
            <div className="label">Kunde</div>
            <div className="value">
              {item.customerName ? <div><b>{item.customerName}</b></div> : "—"}
              {cust && (
                <div style={{opacity:.9, marginTop:4}}>
                  <div>{[cust.street, `${cust.zip||""} ${cust.city||""}`.trim()].filter(Boolean).join(", ")}</div>
                  {cust.phone && <div>☎ {cust.phone}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="row">
            <div className="label">Notiz</div>
            <div className="value">{item.note || "—"}</div>
          </div>

          <div className="row">
            <div className="label">Status</div>
            <div className="value"><span className={`status-badge ${STATUS_LABEL[item.status] || "offen"}`}>{STATUS_LABEL[item.status] || "offen"}</span></div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {openEdit && (
        <div className="surface" style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid",
          placeItems:"center", zIndex:1000, padding: 16
        }} onClick={()=>setOpenEdit(false)}>
          <div className="surface" style={{ width:"min(740px, 94vw)" }} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
              <div className="section-title">Eintrag bearbeiten</div>
              <button className="btn-ghost" onClick={()=>setOpenEdit(false)}>✕</button>
            </div>
            <AppointmentForm
              initial={item}
              customers={customers}
              onSaved={()=>{ setOpenEdit(false); fetch(`/api/appointments/${id}`).then(r=>r.json()).then(setItem).catch(()=>{}); }}
              onCancel={()=>setOpenEdit(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
