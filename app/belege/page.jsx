export const dynamic = "force-dynamic";

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/app/components/Modal";
import LineItemsEditor from "@/app/components/LineItemsEditor";
import { toCents, fromCents } from "@/lib/money";

export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(q ? `/api/receipts?q=${encodeURIComponent(q)}` : "/api/receipts", { cache: "no-store" });
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>Belege</h1>
        <div style={{ display:"flex", gap:8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }} placeholder="Suchen (Nr./Notiz)…" style={input} />
          <button onClick={load} style={btnGhost}>Suchen</button>
          <button onClick={()=>setOpenNew(true)} style={btnPrimary}>+ Neuer Beleg</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Beleg-Nr.</th>
                <th style={th}>Datum</th>
                <th style={th}>USt</th>
                <th style={th}>Betrag</th>
                <th style={{ ...th, textAlign:"right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.receiptNo}</td>
                  <td style={td}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={td}>{Number(r.taxCents||0) > 0 ? "mit USt" : "§19 (ohne USt)"}</td>
                  <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <Link href={`/belege/${r.id}`} style={btnGhost}>Details</Link>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Belege."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewReceiptModal open={openNew} onClose={()=>setOpenNew(false)} onSaved={()=>{ setOpenNew(false); load(); }} />
    </main>
  );
}

function NewReceiptModal({ open, onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const js = await fetch("/api/settings", { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:null}));
      setSettings(js.data || {});
    })();
  }, []);

  const currency = settings?.currencyDefault || "EUR";
  const itemsTotal = useMemo(() => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity||0), 0), [items]);
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal - discountCents);

  async function submit(e){
    e.preventDefault();
    if(items.length === 0) return alert("Bitte mindestens eine Position hinzufügen.");
    const payload = {
      date,
      currency,
      vatExempt: true, // Belege standardmäßig ohne USt
      discountCents,
      items: items.map(it => ({
        productId: it.productId || null,
        name: it.name,
        quantity: Number(it.quantity||0),
        unitPriceCents: toCents(it.unitPrice || 0)
      }))
    };
    const res = await fetch("/api/receipts", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(()=>({}));
    if(!json?.ok) return alert(json?.error || "Erstellen fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuen Beleg erfassen" maxWidth={980}>
      <form onSubmit={submit} style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={label}><span>Datum</span>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={input}/>
          </label>
          <label style={label}><span>Währung</span>
            <input value={currency} disabled style={input}/>
          </label>
        </div>

        <LineItemsEditor currency={currency} value={items} onChange={setItems} />

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <label style={label}><span>Rabatt (gesamt)</span>
            <input value={discount} onChange={e=>setDiscount(e.target.value)} style={input} inputMode="decimal" />
          </label>
          <div style={{ alignSelf:"end", textAlign:"right", fontWeight:700 }}>
            Gesamt: {fromCents(gross, currency)}
          </div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

const card = { background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:16 };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const input = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid #ddd", background:"#fff", outline:"none" };
const btnPrimary = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"var(--color-primary)", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", cursor:"pointer" };
