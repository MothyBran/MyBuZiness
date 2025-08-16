"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const url = q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers";
    const res = await fetch(url);
    const json = await res.json().catch(()=>({ data:[] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id){
    if(!confirm("Kunde wirklich löschen?")) return;
    const res = await fetch(`/api/customers/${id}`, { method:"DELETE" });
    const json = await res.json();
    if(!json.ok) return alert(json.error || "Löschen fehlgeschlagen.");
    load();
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>Kunden</h1>
        <div style={{ display:"flex", gap:8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name/E-Mail/Telefon)..." style={input}/>
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Kunde</button>
        </div>
      </div>

      <div style={{ ...card, marginTop:12 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>E-Mail</th>
                <th style={th}>Telefon</th>
                <th style={th}>Adresse</th>
                <th style={{ ...th, textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id}>
                  <td style={td}>
                    <div style={{ fontWeight:600 }}>{c.name}</div>
                    {c.note && <div style={{ color:"#666", fontSize:13 }}>{c.note}</div>}
                  </td>
                  <td style={td}>{c.email || "—"}</td>
                  <td style={td}>{c.phone || "—"}</td>
                  <td style={td}>
                    {[c.addressStreet, [c.addressZip, c.addressCity].filter(Boolean).join(" "), c.addressCountry]
                      .filter(Boolean).join(", ") || "—"}
                  </td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/kunden/${c.id}`} style={btnGhost}>Bearbeiten</Link>{" "}
                    <button onClick={()=>del(c.id)} style={btnDanger}>Löschen</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Kunden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Neuer Kunde */}
      <NewCustomerModal open={openNew} onClose={()=>setOpenNew(false)} onSaved={()=>{ setOpenNew(false); load(); }} />
    </main>
  );
}

function NewCustomerModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:"", email:"", phone:"",
    addressStreet:"", addressZip:"", addressCity:"", addressCountry:"",
    note:""
  });
  async function submit(e){
    e.preventDefault();
    if(!form.name) return alert("Name ist erforderlich.");
    const res = await fetch("/api/customers", {
      method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(form)
    });
    const json = await res.json();
    if(!json.ok) return alert(json.error || "Erstellen fehlgeschlagen.");
    onSaved?.();
  }
  return (
    <Modal open={open} onClose={onClose} title="Neuen Kunden anlegen">
      <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={label}><span>Name *</span><input value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} style={input} required /></label>
          <label style={label}><span>E-Mail</span><input value={form.email} onChange={e=>setForm({ ...form, email:e.target.value })} style={input} /></label>
          <label style={label}><span>Telefon</span><input value={form.phone} onChange={e=>setForm({ ...form, phone:e.target.value })} style={input} /></label>
          <label style={label}><span>Straße</span><input value={form.addressStreet} onChange={e=>setForm({ ...form, addressStreet:e.target.value })} style={input} /></label>
          <label style={label}><span>PLZ</span><input value={form.addressZip} onChange={e=>setForm({ ...form, addressZip:e.target.value })} style={input} /></label>
          <label style={label}><span>Ort</span><input value={form.addressCity} onChange={e=>setForm({ ...form, addressCity:e.target.value })} style={input} /></label>
          <label style={label}><span>Land</span><input value={form.addressCountry} onChange={e=>setForm({ ...form, addressCountry:e.target.value })} style={input} /></label>
        </div>
        <label style={label}><span>Notiz</span><textarea value={form.note} onChange={e=>setForm({ ...form, note:e.target.value })} rows={3} style={{ ...input, resize:"vertical" }} /></label>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

const label = { display:"grid", gap:6 };
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none" };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
