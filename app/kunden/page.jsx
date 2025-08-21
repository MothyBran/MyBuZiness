// app/kunden/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

function Text({ children, style }){ return <div style={{...style}}>{children}</div>; }

function cleanString(v){ return (v ?? "").toString(); }

function CustomerForm({ initial = null, onDone }){
  const [name, setName] = useState(cleanString(initial?.name));
  const [street, setStreet] = useState(cleanString(initial?.street));
  const [zip, setZip] = useState(cleanString(initial?.zip));
  const [city, setCity] = useState(cleanString(initial?.city));
  const [phone, setPhone] = useState(cleanString(initial?.phone));
  const [email, setEmail] = useState(cleanString(initial?.email));
  const [note, setNote] = useState(cleanString(initial?.note));
  const isEdit = !!initial?.id;

  async function submit(e){
    e.preventDefault();
    const payload = { name, street, zip, city, phone, email, note };
    const url = isEdit ? `/api/customers/${initial.id}` : `/api/customers`;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      alert("Speichern fehlgeschlagen: " + t);
      return;
    }
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="form" style={{display:"grid", gap:12}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
        <label>Name
          <input type="text" value={name} onChange={e=>setName(e.target.value)} required />
        </label>
        <label>Telefon
          <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} />
        </label>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 140px 1fr", gap:12}}>
        <label>Straße
          <input type="text" value={street} onChange={e=>setStreet(e.target.value)} />
        </label>
        <label>PLZ
          <input type="text" value={zip} onChange={e=>setZip(e.target.value)} />
        </label>
        <label>Ort
          <input type="text" value={city} onChange={e=>setCity(e.target.value)} />
        </label>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
        <label>E‑Mail
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label>Notiz
          <input type="text" value={note} onChange={e=>setNote(e.target.value)} />
        </label>
      </div>

      <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
        <button type="submit" className="btn">{isEdit?"Speichern":"Anlegen"}</button>
      </div>
    </form>
  );
}

export default function CustomersPage(){
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [openEdit,setOpenEdit] = useState(false);
  const [current,setCurrent] = useState(null);

  async function load(){
    try {
      setLoading(true); setError("");
      const r = await fetch(`/api/customers`, { cache: "no-store" });
      if(!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setItems(Array.isArray(data)?data:[]);
    } catch (e){
      console.error(e);
      setItems([]);
      setError("Konnte Kunden nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); },[]);

  async function onDelete(id){
    if (!confirm("Diesen Kunden wirklich löschen?")) return;
    const r = await fetch(`/api/customers/${id}`, { method:"DELETE" });
    if(!r.ok){ alert("Löschen fehlgeschlagen"); return; }
    load();
  }

  const sorted = useMemo(()=> [...items].sort((a,b)=> (a.name||"").localeCompare(b.name||"")), [items]);

  return (
    <div className="container" style={{display:"grid", gap:16}}>
      <div className="surface" style={{padding:12}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <h2 style={{margin:0}}>Kunden</h2>
          <button className="btn" onClick={()=>{ setCurrent(null); setOpenEdit(true); }}>+ Neuer Kunde</button>
        </div>

        {loading && <Text>⏳ Lade…</Text>}
        {!loading && error && <Text style={{color:"#b91c1c"}}>{error}</Text>}

        {!loading && !error && (
          <div className="table">
            <div className="table-row head">
              <div>Name</div><div>Adresse</div><div>Telefon</div><div>E‑Mail</div><div style={{textAlign:"right"}}>Aktionen</div>
            </div>
            {sorted.map(c=>(
              <div key={c.id} className="table-row" style={{alignItems:"center"}}>
                <div>{c.name}</div>
                <div>{[c.street, `${c.zip||""} ${c.city||""}`.trim()].filter(Boolean).join(", ") || "—"}</div>
                <div>{c.phone || "—"}</div>
                <div>{c.email || "—"}</div>
                <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
                  <button className="btn-ghost" onClick={()=>{ setCurrent(c); setOpenEdit(true); }}>⚙️ Bearbeiten</button>
                  <button className="btn-ghost" onClick={()=>onDelete(c.id)}>❌ Löschen</button>
                </div>
              </div>
            ))}
            {sorted.length===0 && <div className="table-row"><div style={{gridColumn:"1/-1"}}>Keine Kunden vorhanden.</div></div>}
          </div>
        )}
      </div>

      {/* Modal (leichtgewichtig) */}
      {openEdit && (
        <div className="modal-backdrop" onClick={()=>setOpenEdit(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:1000
        }}>
          <div className="surface" style={{padding:16, minWidth:520}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
              <h3 style={{margin:0}}>{current?"Kunde bearbeiten":"Neuer Kunde"}</h3>
              <button className="btn-ghost" onClick={()=>setOpenEdit(false)}>✕</button>
            </div>
            <CustomerForm
              initial={current}
              onDone={()=>{
                setOpenEdit(false);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
