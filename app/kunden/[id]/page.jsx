"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function CustomerEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/customers/${id}`);
      const json = await res.json();
      setC(json.data || null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main><p>Lade…</p></main>;
  if (!c) return <main><p>Kunde nicht gefunden.</p></main>;

  async function save(e){
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "content-type":"application/json" },
      body: JSON.stringify({
        name: c.name,
        email: c.email || null,
        note: c.note || null
      })
    });
    const json = await res.json();
    setSaving(false);
    if(!json.ok) return alert(json.error || "Speichern fehlgeschlagen.");
    alert("Gespeichert.");
    router.push("/kunden");
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <h1>Kunde bearbeiten</h1>
        <Link href="/kunden" style={btnGhost}>← Zurück</Link>
      </div>

      <form onSubmit={save} style={{ ...card, display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={label}><span>Name *</span><input value={c.name} onChange={e=>setC({ ...c, name: e.target.value })} style={input} required /></label>
          <label style={label}><span>E-Mail</span><input value={c.email || ""} onChange={e=>setC({ ...c, email: e.target.value })} style={input} /></label>
        </div>
        <label style={label}><span>Notiz</span><textarea value={c.note || ""} onChange={e=>setC({ ...c, note: e.target.value })} rows={3} style={{ ...input, resize:"vertical" }} /></label>

        <div style={{ display:"flex", gap:8 }}>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving? "Speichern…":"Speichern"}</button>
          <Link href="/kunden" style={btnGhost}>Abbrechen</Link>
        </div>
      </form>
    </main>
  );
}

const label = { display:"grid", gap:6 };
const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16, marginTop:12 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none" };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", cursor:"pointer" };
