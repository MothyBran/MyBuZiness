// app/termine/eintrag/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { useRouter } from "next/navigation";

const fmtDateDE = (ymd)=> ymd && ymd.length>=10 ? ymd.split("-").reverse().join(".") : (ymd||"");
const STATUS_LABEL = { open: "offen", cancelled: "abgesagt", done: "abgeschlossen" };

export default function EntryDetail({ params }){
  const router = useRouter();
  const id = params.id;
  const [item, setItem] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(()=>{
    fetch(`/api/appointments/${id}`).then(r=>r.json()).then(setItem).catch(()=>setItem(null));
    fetch(`/api/customers`).then(r=>r.json()).then(rows=>{
      const mapped = (rows||[]).map(c=>{
        const id = c.id ?? c.customerId ?? c.uuid ?? c._id ?? "";
        const name = c.name ?? c.fullName ?? c.company ?? c.title ?? "";
        return { id: String(id), name: String(name) };
      }).filter(x=>x.id && x.name);
      setCustomers(mapped);
    }).catch(()=>setCustomers([]));
  },[id]);

  async function handleDelete(){
    const ok = window.confirm("Diesen Eintrag wirklich löschen?");
    if(!ok) return;
    const res = await fetch(`/api/appointments/${id}`, { method:"DELETE" });
    if(!res.ok){ alert("Löschen fehlgeschlagen."); return; }
    router.push("/termine");
  }

  if (!item) return (
    <div className="container surface card" style={{padding:16}}>
      <h2>Termin</h2>
      <p>Eintrag wurde nicht gefunden.</p>
      <Link href="/termine" className="btn">← Zurück</Link>
    </div>
  );

  return (
    <div className="container" style={{display:"grid", gap:16}}>
      <div className="surface card" style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2>Termin: {item.title}</h2>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setOpenEdit(true)}>⚙️ Bearbeiten</button>
            <button className="btn" onClick={handleDelete}>❌ Löschen</button>
            <Link href="/termine" className="btn">← Zurück</Link>
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"220px 1fr", gap:8}}>
          <div><b>Datum</b></div><div>{fmtDateDE(item.date)}</div>
          <div><b>Uhrzeit</b></div><div>{item.startAt?.slice(0,5)}{item.endAt?`–${item.endAt.slice(0,5)}`:""}</div>
          <div><b>Art</b></div><div>{item.kind==="order"?"Auftrag":"Termin"}</div>
          <div><b>Kunde</b></div><div>{item.customerName || "—"}</div>
          <div><b>Status</b></div><div>{STATUS_LABEL[item.status] || "offen"}</div>
          <div><b>Notiz</b></div><div>{item.note || "—"}</div>
        </div>
      </div>

      <Modal open={openEdit} onClose={()=>setOpenEdit(false)} title="⚙️ Eintrag bearbeiten">
        <EditForm initial={item} customers={customers} onDone={()=>{
          setOpenEdit(false);
          router.refresh();
        }} />
      </Modal>
    </div>
  );
}

function EditForm({ initial, customers, onDone }){
  const [kind,setKind]=useState(initial.kind||"appointment");
  const [title,setTitle]=useState(initial.title||"");
  const [date,setDate]=useState(initial.date||"");
  const [startAt,setStartAt]=useState(initial.startAt?.slice(0,5)||"09:00");
  const [endAt,setEndAt]=useState(initial.endAt?.slice(0,5)||"");
  const [customerId,setCustomerId]=useState(initial.customerId||"");
  const [customerName,setCustomerName]=useState(initial.customerName||"");
  const [status,setStatus]=useState(initial.status||"open");
  const [note,setNote]=useState(initial.note||"");

  useEffect(()=>{
    const found = customers.find(c=>String(c.id)===String(customerId));
    setCustomerName(found?.name || (initial.customerName || ""));
  },[customerId, customers]); // eslint-disable-line

  async function submit(e){
    e.preventDefault();
    const res = await fetch(`/api/appointments/${initial.id}`,{
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        kind, title, date,
        startAt: startAt || "00:00",
        endAt: endAt || null,
        customerId: customerId || null,
        customerName: customerName || null,
        status, note
      })
    });
    if(!res.ok){ alert("Speichern fehlgeschlagen."); return; }
    onDone?.();
  }

  const hhmm = Array.from({length:48}, (_,i)=>{
    const h = Math.floor(i/2), m = (i%2)*30;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  });

  return (
    <form onSubmit={submit} className="form" style={{display:"grid", gap:12, minWidth:340}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
        <label>Art
          <select value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="appointment">Termin</option>
            <option value="order">Auftrag</option>
          </select>
        </label>
        <label>Datum
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
      </div>

      <label>Bezeichnung
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required />
      </label>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
        <label>Uhrzeit (Start)
          <select value={startAt} onChange={e=>setStartAt(e.target.value)}>
            {hhmm.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Uhrzeit (Ende, optional)
          <select value={endAt} onChange={e=>setEndAt(e.target.value)}>
            <option value="">—</option>
            {hhmm.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Status
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="open">offen</option>
            <option value="cancelled">abgesagt</option>
            <option value="done">abgeschlossen</option>
          </select>
        </label>
      </div>

      <label>Kunde (optional)
        <select value={customerId ?? ""} onChange={e=>setCustomerId(e.target.value)}>
          <option value="">—</option>
          {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <label>Notiz (optional)
        <textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} />
      </label>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button type="button" className="btn" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn btn-primary">Speichern</button>
      </div>
    </form>
  );
}
