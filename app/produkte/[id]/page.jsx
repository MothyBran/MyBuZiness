"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toCents, fromCents } from "@/lib/money";

export default function ProductEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/products`);
      const json = await res.json();
      const item = (json.data || []).find(x => x.id === id) || null;
      setP(item);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main><p>Lade…</p></main>;
  if (!p) return <main><p>Eintrag nicht gefunden.</p></main>;

  async function save(e){
    e.preventDefault();
    setSaving(true);
    const payload = {
      kind: p.kind === "product" ? "product" : "service",
      categoryCode: p.categoryCode || null,
      name: p.name,
      sku: p.sku || null,
      priceCents: toCents(p.price || (p.priceCents/100)),
      currency: p.currency || "EUR",
      description: p.description || null,
      travelEnabled: !!p.travelEnabled,
      travelRateCents: toCents(p.travelRate || (p.travelRateCents/100)),
      travelUnit: p.travelUnit || "km"
    };
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "content-type":"application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    setSaving(false);
    if(!json.ok) return alert(json.error || "Speichern fehlgeschlagen.");
    alert("Gespeichert.");
    router.push("/produkte");
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <h1>Produkt/Dienstleistung bearbeiten</h1>
        <Link href="/produkte" style={btnGhost}>← Zurück</Link>
      </div>

      <form onSubmit={save} style={{ ...card, display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(4, 1fr)" }}>
          <label style={label}>
            <span>Typ</span>
            <select value={p.kind} onChange={e=>setP({ ...p, kind: e.target.value })} style={input}>
              <option value="service">Dienstleistung</option>
              <option value="product">Produkt</option>
            </select>
          </label>
          <label style={label}>
            <span>Kategorie-Code</span>
            <input value={p.categoryCode || ""} onChange={e=>setP({ ...p, categoryCode: e.target.value })} style={input} />
          </label>
          <label style={label}>
            <span>Name *</span>
            <input value={p.name} onChange={e=>setP({ ...p, name: e.target.value })} style={input} required />
          </label>
          <label style={label}>
            <span>SKU</span>
            <input value={p.sku || ""} onChange={e=>setP({ ...p, sku: e.target.value })} style={input} />
          </label>
        </div>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(4, 1fr)" }}>
          <label style={label}>
            <span>Preis (Einheit)</span>
            <input
              value={p.price ?? (p.priceCents/100).toString().replace(".", ",")}
              onChange={e=>setP({ ...p, price: e.target.value })}
              style={input} inputMode="decimal"
            />
          </label>
          <label style={label}>
            <span>Währung</span>
            <select value={p.currency || "EUR"} onChange={e=>setP({ ...p, currency: e.target.value })} style={input}>
              <option>EUR</option><option>USD</option>
            </select>
          </label>
          <label style={{ ...label, alignItems:"center", display:"grid", gridTemplateColumns:"1fr auto" }}>
            <div style={{ display:"grid", gap:6 }}>
              <span>Fahrtkosten aktiv</span>
              <small style={{ color:"#666" }}>bei Aktivierung: Satz unten</small>
            </div>
            <input type="checkbox" checked={!!p.travelEnabled} onChange={e=>setP({ ...p, travelEnabled: e.target.checked })} />
          </label>
          <label style={label}>
            <span>Fahrtkosten (pro km)</span>
            <input
              value={p.travelRate ?? (p.travelRateCents/100).toString().replace(".", ",")}
              onChange={e=>setP({ ...p, travelRate: e.target.value })}
              style={input} inputMode="decimal"
            />
          </label>
        </div>

        <div style={{ display:"grid", gap:12 }}>
          <label style={label}>
            <span>Beschreibung</span>
            <textarea value={p.description || ""} onChange={e=>setP({ ...p, description: e.target.value })} style={{ ...input, resize:"vertical" }} rows={3} />
          </label>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving? "Speichern…":"Speichern"}</button>
          <Link href="/produkte" style={btnGhost}>Abbrechen</Link>
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
