// app/termine/eintrag/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import { useRouter } from "next/navigation";

/* Datum-Utils */
function toDate(input){
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split("-").map(Number);
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
  const router = useRouter();
  const id = params.id;
  const [item, setItem] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(()=>{
    fetch(`/api/appointments/${id}`).then(r=>r.json()).then(setItem).catch(()=>setItem(null));
    fetch(`/api/customers`).then(r=>r.json()).then(rows=>{
      const arr = Array.isArray(rows) ? rows : (rows?.rows || rows?.data || rows?.items || rows?.customers || []);
      const mapped = (arr||[]).map(c=>{
        const id = c.id ?? c.customerId ?? c.uuid ?? c._id ?? "";
        const name = c.name ?? c.fullName ?? c.company ?? c.title ?? "";
        return {
          id: String(id),
          name: String(name),
          street: c.street ?? c.address ?? c.addressLine1 ?? "",
          zip: c.zip ?? c.postcode ?? c.plz ?? "",
          city: c.city ?? c.town ?? "",
          phone: c.phone ?? c.tel ?? c.telephone ?? ""
        };
      }).filter(x=>x.id && x.name);
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
    router.push("/termine");
  }

  if (!item) return (
    <div className="container surface" style={{padding:16}}>
      <h2 className="page-title">Termin</h2>
      <p>Eintrag wurde nicht gefunden.</p>
      <Link href="/termine" className="btn-ghost">← Zurück</Link>
    </div>
  );

  const cust = customers.find(c=> String(c.id) === String(item.customerId));

  return (
    <div className="container grid-gap-16">
      <div className="surface">
        <div className="header-row" style={{marginBottom:12}}>
          <h2 className="page-title" style={{margin:0}}>Termin / Auftrag</h2>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-ghost" onClick={()=>setOpenEdit(true)}>⚙️ Bearbeiten</button>
            <button className="btn" onClick={handleDelete} disabled={deleting}>{deleting?"Lösche…":"❌ Löschen"}</button>
            <Link href="/termine" className="btn-ghost">← Zurück</Link>
          </div>
        </div>

        {/* Reihenfolge: Art, Uhrzeit & Datum, Kunde, Notiz, Status */}
        <div style={{display:"grid", gridTemplateColumns:"220px 1fr", gap:10, alignItems:"start"}}>
          <div><b>Art</b></div>
          <div>{item.kind==="order" ? "Auftrag" : "Termin"}</div>

          <div><b>Uhrzeit & Datum</b></div>
          <div>{item.startAt?.slice(0,5)}{item.endAt?`–${item.endAt.slice(0,5)}`:""} · {formatDateDE(item.date)}</div>

          <div><b>Kunde</b></div>
          <div>
            {item.customerName ? <div><b>{item.customerName}</b></div> : "—"}
            {cust && (
              <div style={{opacity:.9, marginTop:4}}>
                <div>{[cust.street, `${cust.zip||""} ${cust.city||""}`.trim()].filter(Boolean).join(", ")}</div>
                {cust.phone && <div>☎ {cust.phone}</div>}
              </div>
            )}
          </div>

          <div><b>Notiz</b></div>
          <div>{item.note || "—"}</div>

          <div><b>Status</b></div>
          <div>{STATUS_LABEL[item.status] || "offen"}</div>
        </div>
      </div>

      <Modal open={openEdit} onClose={()=>setOpenEdit(false)} title="⚙️ Eintrag bearbeiten">
        <EditForm initial={item} customers={customers} onDone={()=>{
          setOpenEdit(false);
          fetch(`/api/appointments/${id}`).then(r=>r.json()).then(setItem).catch(()=>{});
        }} />
      </Modal>
    </div>
  );
}

function EditForm({ initial, customers, onDone }){
  const [kind,setKind]=useState(initial.kind||"appointment");
  const [title,setTitle]=useState(initial.title||"");
  const [date,setDate]=useState((()=>{ const d=toDate(initial.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })());
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
    <form onSubmit={submit} style={{display:"grid", gap:12, minWidth:340}}>
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
        <button type="button" className="btn-ghost" onClick={onDone}>Abbrechen</button>
        <button type="submit" className="btn">Speichern</button>
      </div>
    </form>
  );
}
