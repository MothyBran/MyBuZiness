"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toCents, fromCents } from "@/lib/money";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Produkte für Auto-Preis
  const [products, setProducts] = useState([]);

  // Schnell-Beleg Formular
  const [vatExempt, setVatExempt] = useState(true); // §19: default aktiv
  const [currency, setCurrency] = useState("EUR");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10)); // heute
  const [discount, setDiscount] = useState(""); // Eingabe in EUR, wir wandeln zu Cent
  const [items, setItems] = useState([{ productId: "", name: "", quantity: 1, unitPrice: "" }]);
  const [note, setNote] = useState("");
  // Anzeige: Beleg-Nr. (wird automatisch vergeben)
  const receiptNoHint = "wird automatisch vergeben";

  async function load() {
    setLoading(true);
    const [dash, prods] = await Promise.all([
      fetch("/api/dashboard").then(r => r.json()).catch(() => ({data:null})),
      fetch("/api/products").then(r => r.json()).catch(() => ({data:[]}))
    ]);
    setStats(dash.data || null);
    setProducts(prods.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function addRow(){
    setItems((arr)=> [...arr, { productId:"", name:"", quantity:1, unitPrice:"" }]);
  }
  function removeRow(i){
    setItems(arr => arr.length>1 ? arr.filter((_,idx)=> idx!==i) : [{ productId:"", name:"", quantity:1, unitPrice:"" }]);
  }
  function onProductChange(idx, pid){
    const p = products.find(x => x.id === pid);
    setItems(arr => arr.map((x,i)=> {
      if(i!==idx) return x;
      return {
        ...x,
        productId: pid,
        name: p ? p.name : x.name,                                   // Bezeichnung autofüllen
        unitPrice: p ? (p.priceCents/100).toString().replace(".", ",") : x.unitPrice // Preis autofüllen
      };
    }));
  }

  const totals = useMemo(() => {
    const net = items.reduce((s,it)=> s + toCents(it.unitPrice||0) * Number.parseInt(it.quantity||1), 0);
    const tax = vatExempt ? 0 : Math.round(net * 0.19);
    const grossBefore = net + tax;
    const discountCents = toCents(discount || 0);
    const gross = Math.max(0, grossBefore - discountCents);
    return { net, tax, discountCents, gross };
  }, [items, vatExempt, discount]);

  async function submitReceipt(e){
    e.preventDefault();
    const payload = {
      vatExempt,
      currency,
      date: date || null,
      note,
      discountCents: totals.discountCents,
      items: items
        .map(it=>({
          productId: it.productId || null,
          name: (it.name||"").trim(),
          quantity: Number.parseInt(it.quantity||1),
          unitPriceCents: toCents(it.unitPrice||0)
        }))
        .filter(it=> it.name && it.quantity>0)
    };
    if(payload.items.length===0) return alert("Mindestens eine gültige Position angeben.");

    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "content-type":"application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if(!json.ok) return alert(json.error || "Beleg anlegen fehlgeschlagen.");
    // Reset
    setItems([{ productId:"", name:"", quantity:1, unitPrice:"" }]);
    setNote("");
    setDiscount("");
    setDate(new Date().toISOString().slice(0,10));
    // Stats neu laden
    load();
    alert(`Beleg erstellt: ${json.data.receiptNo}`);
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p style={{ marginTop:-8, color:"#666" }}>Schnellübersicht & Beleg-Erfassung (Kleinunternehmer-Modus §19 UStG).</p>

      {/* KPI-Karten */}
      <section style={kpiGrid}>
        <KPI title="Umsatz heute" value={stats ? fromCents(stats.totals.today) : "—"} />
        <KPI title="Umsatz 7 Tage" value={stats ? fromCents(stats.totals.last7) : "—"} />
        <KPI title="Umsatz 30 Tage" value={stats ? fromCents(stats.totals.last30) : "—"} />
        <KPI title="Belege" value={stats ? stats.counts.receipts : "—"} />
        <KPI title="Kunden" value={stats ? stats.counts.customers : "—"} />
        <KPI title="Produkte" value={stats ? stats.counts.products : "—"} />
        <KPI title="Rechnungen" value={stats ? stats.counts.invoices : "—"} />
      </section>

      {/* Schnell-Beleg */}
      <section style={{ ...card, marginTop: 16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
          <strong>Schnell-Beleg erfassen</strong>
          <div className="no-print" style={{ display:"flex", gap:8 }}>
            <Link href="/produkte" style={btnGhost}>Produkte öffnen</Link>
          </div>
        </div>

        <form onSubmit={submitReceipt} style={{ display:"grid", gap:12, marginTop:12 }}>
          {/* Kopfzeile: Beleg-Nr. (auto), Datum, §19, Währung */}
          <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
            <label style={label}>
              <span>Beleg-Nr.</span>
              <input value={receiptNoHint} readOnly style={{ ...input, color:"#666" }} />
            </label>
            <label style={label}>
              <span>Datum</span>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={input} />
            </label>
            <label style={{ display:"flex", alignItems:"end", gap:8 }}>
              <input type="checkbox" checked={vatExempt} onChange={e=>setVatExempt(e.target.checked)} />
              <span>Kleinunternehmer (§19 UStG)</span>
            </label>
            <label style={label}>
              <span>Währung</span>
              <select value={currency} onChange={e=>setCurrency(e.target.value)} style={input}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>

          {/* Positionen */}
          <div style={{ display:"grid", gap:8 }}>
            <strong>Positionen</strong>
            {items.map((it, idx)=>(
              <div key={idx} style={{ display:"grid", gap:12, gridTemplateColumns:"2fr 1fr 1fr 1fr auto" }}>
                {/* Produktauswahl */}
                <select
                  value={it.productId}
                  onChange={e=> onProductChange(idx, e.target.value)}
                  style={input}
                >
                  <option value="">— Produkt wählen (optional) —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Freitext Bezeichnung */}
                <input
                  placeholder="Dienstleistung/Produkt (Freitext)"
                  value={it.name}
                  onChange={e=>{
                    const v = e.target.value;
                    setItems(arr => arr.map((x,i)=> i===idx? { ...x, name:v } : x));
                  }}
                  style={input}
                />

                {/* Anzahl */}
                <input
                  placeholder="Anzahl"
                  inputMode="numeric"
                  value={it.quantity}
                  onChange={e=>{
                    const v = e.target.value;
                    setItems(arr => arr.map((x,i)=> i===idx? { ...x, quantity:v } : x));
                  }}
                  style={input}
                />

                {/* Einzelpreis */}
                <input
                  placeholder="Preis (z. B. 29,90)"
                  inputMode="decimal"
                  value={it.unitPrice}
                  onChange={e=>{
                    const v = e.target.value;
                    setItems(arr => arr.map((x,i)=> i===idx? { ...x, unitPrice:v } : x));
                  }}
                  style={input}
                />

                <button type="button" onClick={()=>removeRow(idx)} style={btnDanger}>Entfernen</button>
              </div>
            ))}
            <div>
              <button type="button" onClick={addRow} style={btnGhost}>+ Position hinzufügen</button>
            </div>
          </div>

          {/* Rabatt + Notiz */}
          <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 3fr" }}>
            <label style={label}>
              <span>Rabatt (absolut)</span>
              <input
                placeholder="z. B. 5,00"
                inputMode="decimal"
                value={discount}
                onChange={e=>setDiscount(e.target.value)}
                style={input}
              />
            </label>
            <label style={label}>
              <span>Notiz (optional)</span>
              <textarea
                value={note}
                onChange={e=>setNote(e.target.value)}
                rows={2}
                style={{ ...input, resize:"vertical" }}
              />
            </label>
          </div>

          {/* Summen */}
          <div style={{ display:"grid", gap:4, justifyContent:"end" }}>
            <div>Netto: <strong>{fromCents(totals.net, currency)}</strong></div>
            {!vatExempt && <div>USt (19%): <strong>{fromCents(totals.tax, currency)}</strong></div>}
            {totals.discountCents>0 && <div>Rabatt: <strong>-{fromCents(totals.discountCents, currency)}</strong></div>}
            <div style={{ fontSize:18 }}>Gesamtbetrag: <strong>{fromCents(totals.gross, currency)}</strong></div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button type="submit" style={btnPrimary}>Beleg speichern</button>
            <Link href="/rechnungen" style={btnGhost}>→ Stattdessen Rechnung erstellen</Link>
          </div>
        </form>
      </section>

      {/* Letzte Belege */}
      <section style={{ ...card, marginTop:16 }}>
        <strong>Letzte Belege</strong>
        <div style={{ overflowX:"auto", marginTop:12 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Nr.</th>
                <th style={th}>Datum</th>
                <th style={th}>Betrag</th>
                <th style={th}>Info</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentReceipts || []).map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.receiptNo}</td>
                  <td style={td}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
                  <td style={td}></td>
                </tr>
              ))}
              {(!stats || (stats.recentReceipts||[]).length===0) && (
                <tr><td colSpan={4} style={{ ...td, textAlign:"center", color:"#999" }}>Noch keine Belege.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KPI({ title, value }) {
  return (
    <div style={kpiCard}>
      <div style={{ color:"#666", fontSize:13 }}>{title}</div>
      <div style={{ fontSize:22, fontWeight:700 }}>{value}</div>
    </div>
  );
}

const label = { display:"grid", gap:6 };
const kpiGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12, marginTop:12 };
const kpiCard = { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:16 };
const card = { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:16 };
const input = { padding:"10px 12px", borderRadius:10, border:"1px solid #ddd", background:"#fff", outline:"none", width:"100%" };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const btnPrimary = { padding:"10px 12px", borderRadius:10, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:10, border:"1px solid #111", background:"transparent", color:"#111", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:8, border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
