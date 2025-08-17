"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";

/** Helpers */
function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
      {children}
    </div>
  );
}
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none", width:"100%" };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"#fff", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [openNew, setOpenNew] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch(q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers", { cache: "no-store" });
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm("Diesen Kunden wirklich löschen?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    const js = await res.json().catch(() => ({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    load();
  }

  return (
    <main>
      {/* Kopfzeile */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Kunden</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name/Email/Telefon)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Kunde</button>
        </div>
      </div>

      {/* Liste */}
      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-sm">E-Mail</th>
                <th className="hide-sm">Telefon</th>
                <th>Ort</th>
                <th style={{ textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.name}</td>
                  <td className="hide-sm ellipsis">{r.email || "—"}</td>
                  <td className="hide-sm ellipsis">{r.phone || "—"}</td>
                  <td className="ellipsis">{[r.zip, r.city].filter(Boolean).join(" ") || "—"}</td>
                  <td style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/kunden/${r.id}`} className="btn-ghost" style={{ marginRight: 8 }}>Details</Link>
                    <button className="btn-ghost" onClick={()=>setEditRow(r)} style={{ marginRight: 8 }}>Bearbeiten</button>
                    <button className="btn-ghost" onClick={()=>remove(r.id)} style={{ borderColor:"#c00", color:"#c00" }}>Löschen</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Kunden vorhanden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        title="Neuen Kunden anlegen"
        open={openNew}
        onClose={()=>setOpenNew(false)}
        onSaved={()=>{ setOpenNew(false); load(); }}
      />
      {editRow && (
        <CustomerModal
          title="Kunden bearbeiten"
          initial={editRow}
          open={!!editRow}
          onClose={()=>setEditRow(null)}
          onSaved={()=>{ setEditRow(null); load(); }}
        />
      )}
    </main>
  );
}

function CustomerModal({ title, open, onClose, onSaved, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [street, setStreet] = useState(initial?.street || "");
  const [zip, setZip] = useState(initial?.zip || "");
  const [city, setCity] = useState(initial?.city || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || "");
    setEmail(initial?.email || "");
    setPhone(initial?.phone || "");
    setStreet(initial?.street || "");
    setZip(initial?.zip || "");
    setCity(initial?.city || "");
    setNotes(initial?.notes || "");
  }, [open, initial]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return alert("Name ist erforderlich.");
    const payload = { name, email: email || null, phone: phone || null, street: street || null, zip: zip || null, city: city || null, notes: notes || null };

    let res;
    if (initial?.id) {
      res = await fetch(`/api/customers/${initial.id}`, { method:"PUT", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/customers", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    }
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={760}>
      <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Name *"><input style={input} value={name} onChange={e=>setName(e.target.value)} required /></Field>
          <Field label="E-Mail"><input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} /></Field>
        </div>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Telefon"><input style={input} value={phone} onChange={e=>setPhone(e.target.value)} /></Field>
          <Field label="Straße"><input style={input} value={street} onChange={e=>setStreet(e.target.value)} /></Field>
        </div>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"140px 1fr" }}>
          <Field label="PLZ"><input style={input} value={zip} onChange={e=>setZip(e.target.value)} /></Field>
          <Field label="Ort"><input style={input} value={city} onChange={e=>setCity(e.target.value)} /></Field>
        </div>
        <Field label="Notizen"><textarea style={{ ...input, minHeight: 90 }} value={notes} onChange={e=>setNotes(e.target.value)} /></Field>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}
