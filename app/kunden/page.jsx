"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const url = q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers";
    const res = await fetch(url);
    const json = await res.json().catch(()=>({ data:[] }));
    setRows(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e){
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email") || null,
      note: fd.get("note") || null
    };
    if(!payload.name) return alert("Name ist erforderlich.");
    const res = await fetch("/api/customers", {
      method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify(payload)
    });
    const json = await res.json();
    if(!json.ok) return alert(json.error || "Erstellen fehlgeschlagen.");
    e.currentTarget.reset();
    load();
  }

  async function del(id){
    if(!confirm("Kunde wirklich löschen?")) return;
    const res = await fetch(`/api/customers/${id}`, { method:"DELETE" });
    const json = await res.json();
    if(!json.ok) return alert(json.error || "Löschen fehlgeschlagen.");
    load();
  }

  return (
    <main>
      <h1>Kunden</h1>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name/E-Mail)..." style={input} />
        <button onClick={load} style={btnGhost}>Suchen</button>
      </div>

      <form onSubmit={create} style={{ ...card, marginTop:12, display:"grid", gap:12 }}>
        <strong>Neuen Kunden anlegen</strong>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={label}><span>Name *</span><input name="name" required style={input} /></label>
          <label style={label}><span>E-Mail</span><input name="email" style={input} /></label>
        </div>
        <label style={label}><span>Notiz</span><textarea name="note" rows={2} style={{ ...input, resize:"vertical" }} /></label>
        <div><button type="submit" style={btnPrimary}>Speichern</button></div>
      </form>

      <div style={{ ...card, marginTop:12 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>E-Mail</th>
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
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/kunden/${c.id}`} style={btnGhost}>Bearbeiten</Link>{" "}
                    <button onClick={()=>del(c.id)} style={btnDanger}>Löschen</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={3} style={{ ...td, textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Kunden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
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
