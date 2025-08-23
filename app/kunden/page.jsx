// app/kunden/page.jsx
"use client";

import { useEffect, useState } from "react";

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
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch(q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers", { cache: "no-store" });
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id);
    setEditId(null);
  }

  async function removeCustomer(id) {
    if (!confirm("Diesen Kunden wirklich löschen?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    const js = await res.json().catch(() => ({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    setExpandedId(null);
    setEditId(null);
    load();
  }

  async function saveCustomer(id, values) {
    // Werte auf API-Form bringen (address*, note)
    const payload = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      addressStreet: values.addressStreet || null,
      addressZip: values.addressZip || null,
      addressCity: values.addressCity || null,
      addressCountry: values.addressCountry || null,
      note: values.note || null,
    };
    const res = await fetch(`/api/customers/${id}`, {
      method:"PUT",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(payload)
    });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
    setEditId(null);
    load();
  }

  async function createCustomer(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      addressStreet: fd.get("addressStreet") || null,
      addressZip: fd.get("addressZip") || null,
      addressCity: fd.get("addressCity") || null,
      addressCountry: fd.get("addressCountry") || null,
      note: fd.get("note") || null,
    };
    if (!payload.name?.trim()) return alert("Name ist erforderlich.");
    const res = await fetch("/api/customers", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Erstellen fehlgeschlagen.");
    setOpenNew(false);
    load();
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Kunden</h1>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Name/E-Mail/Telefon/Ort)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Kunde</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-sm">E-Mail</th>
                <th className="hide-sm">Telefon</th>
                <th>Ort</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <>
                  <tr
                    key={r.id}
                    className="row-clickable"
                    onClick={() => toggleExpand(r.id)}
                    style={{ cursor:"pointer" }}
                  >
                    <td className="ellipsis">{r.name}</td>
                    <td className="hide-sm ellipsis">{r.email || "—"}</td>
                    <td className="hide-sm ellipsis">{r.phone || "—"}</td>
                    <td className="ellipsis">{[r.addressZip, r.addressCity].filter(Boolean).join(" ") || "—"}</td>
                  </tr>

                  {expandedId === r.id && (
                    <tr key={r.id + "-details"}>
                      <td colSpan={4} style={{ background:"#fafafa", padding: 12, borderBottom:"1px solid rgba(0,0,0,.06)" }}>
                        {editId === r.id ? (
                          <CustomerEditForm
                            initial={r}
                            onCancel={() => setEditId(null)}
                            onSave={(values) => saveCustomer(r.id, values)}
                          />
                        ) : (
                          <CustomerDetails
                            row={r}
                            onEdit={() => setEditId(r.id)}
                            onDelete={() => removeCustomer(r.id)}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={4} style={{ color:"#999", textAlign:"center" }}>{loading? "Lade…":"Keine Kunden vorhanden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini-Modal für Neu anlegen */}
      {openNew && (
        <div className="surface" style={modalWrap}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800 }}>Neuen Kunden anlegen</div>
            <button onClick={()=>setOpenNew(false)} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
          </div>
          <form onSubmit={createCustomer} style={{ display:"grid", gap:12 }}>
            <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
              <Field label="Name *"><input style={input} name="name" required /></Field>
              <Field label="E-Mail"><input style={input} type="email" name="email" /></Field>
            </div>
            <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
              <Field label="Telefon"><input style={input} name="phone" /></Field>
              <Field label="Straße"><input style={input} name="addressStreet" /></Field>
            </div>
            <div style={{ display:"grid", gap:12, gridTemplateColumns:"140px 1fr 1fr" }}>
              <Field label="PLZ"><input style={input} name="addressZip" /></Field>
              <Field label="Ort"><input style={input} name="addressCity" /></Field>
              <Field label="Land"><input style={input} name="addressCountry" /></Field>
            </div>
            <Field label="Notiz"><textarea style={{ ...input, minHeight: 90 }} name="note" /></Field>

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
              <button type="button" onClick={()=>setOpenNew(false)} style={btnGhost}>Abbrechen</button>
              <button type="submit" style={btnPrimary}>Speichern</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

/** Details-Ansicht im aufgeklappten Bereich */
function CustomerDetails({ row, onEdit, onDelete }) {
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
        <Field label="Name"><div>{row.name}</div></Field>
        <Field label="E-Mail"><div>{row.email || "—"}</div></Field>
      </div>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
        <Field label="Telefon"><div>{row.phone || "—"}</div></Field>
        <Field label="Straße"><div>{row.addressStreet || "—"}</div></Field>
      </div>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"140px 1fr 1fr" }}>
        <Field label="PLZ"><div>{row.addressZip || "—"}</div></Field>
        <Field label="Ort"><div>{row.addressCity || "—"}</div></Field>
        <Field label="Land"><div>{row.addressCountry || "—"}</div></Field>
      </div>
      <Field label="Notiz"><div style={{ whiteSpace:"pre-wrap" }}>{row.note || "—"}</div></Field>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap", marginTop:4 }}>
        <button className="btn-ghost" onClick={onEdit}>⚙️ Bearbeiten</button>
        <button className="btn-ghost" onClick={onDelete} style={{ borderColor:"#c00", color:"#c00" }}>❌ Löschen</button>
      </div>
    </div>
  );
}

/** Inline-Edit-Formular im aufgeklappten Bereich */
function CustomerEditForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [addressStreet, setAddressStreet] = useState(initial?.addressStreet || "");
  const [addressZip, setAddressZip] = useState(initial?.addressZip || "");
  const [addressCity, setAddressCity] = useState(initial?.addressCity || "");
  const [addressCountry, setAddressCountry] = useState(initial?.addressCountry || "");
  const [note, setNote] = useState(initial?.note || "");

  function submit(e){
    e.preventDefault();
    if (!name.trim()) return alert("Name ist erforderlich.");
    onSave({ name, email, phone, addressStreet, addressZip, addressCity, addressCountry, note });
  }

  return (
    <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
        <Field label="Name *"><input style={input} value={name} onChange={e=>setName(e.target.value)} required /></Field>
        <Field label="E-Mail"><input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} /></Field>
      </div>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
        <Field label="Telefon"><input style={input} value={phone} onChange={e=>setPhone(e.target.value)} /></Field>
        <Field label="Straße"><input style={input} value={addressStreet} onChange={e=>setAddressStreet(e.target.value)} /></Field>
      </div>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"140px 1fr 1fr" }}>
        <Field label="PLZ"><input style={input} value={addressZip} onChange={e=>setAddressZip(e.target.value)} /></Field>
        <Field label="Ort"><input style={input} value={addressCity} onChange={e=>setAddressCity(e.target.value)} /></Field>
        <Field label="Land"><input style={input} value={addressCountry} onChange={e=>setAddressCountry(e.target.value)} /></Field>
      </div>
      <Field label="Notiz"><textarea style={{ ...input, minHeight: 90 }} value={note} onChange={e=>setNote(e.target.value)} /></Field>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Abbrechen</button>
        <button type="submit" style={btnPrimary}>Speichern</button>
      </div>
    </form>
  );
}

/* kleines Sheet-Modal ohne Portal (für "Neu") */
const modalWrap = {
  position:"fixed", left:"50%", top:"10%", transform:"translateX(-50%)",
  width:"min(760px, 92vw)", maxHeight:"80vh", overflow:"auto", padding:16, zIndex:1000
};
