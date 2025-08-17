"use client";

import { useEffect, useMemo, useState } from "react";

/* =========================
   Geld-Utils (robust)
   ========================= */
/**
 * Nimmt Eingaben wie:
 *  "20", "20.00", "20,00", "1.234,56", "1,234.56"
 * und liefert Integer-Cents.
 */
function toCents(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return Math.round(input * 100);

  let s = String(input).trim();

  // If it already looks like pure cents number (e.g., "2000"), keep it numeric
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  }

  // Entferne alle Nicht-Ziffern, außer Punkt & Komma
  s = s.replace(/[^\d.,]/g, "");

  // Beide Separatoren vorhanden → entscheide Dezimaltrennzeichen heuristisch
  if (s.includes(",") && s.includes(".")) {
    // Nimm das letzte Vorkommen als Dezimaltrenner
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";

    s = s.replace(new RegExp("\\" + thouSep, "g"), ""); // alle Tausender weg
    s = s.replace(decSep, "."); // Dezimal auf Punkt
  } else {
    // Nur Komma → ersetze durch Punkt
    if (s.includes(",") && !s.includes(".")) {
      s = s.replace(",", ".");
    }
    // Nur Punkte → ok
    // Weder Komma noch Punkt → ist bereits ganzzahlig (z.B. "20") → ok
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function fromCents(cents) {
  const n = (Number(cents || 0) / 100);
  // Für Eingabefeld lieber "de" mit Komma anzeigen
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(cents, currencyCode = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currencyCode || "EUR",
  }).format((Number(cents || 0) / 100));
}

/* =========================
   UI-Basics
   ========================= */
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "#9ca3af" }}>{hint}</span>}
    </label>
  );
}
const input = { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, width: "100%", outline: "none" };
const btnPrimary = { padding: "10px 12px", borderRadius: 8, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer" };
const btnGhost = { padding: "10px 12px", borderRadius: 8, background: "#fff", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer" };
const btnDanger = { padding: "8px 10px", borderRadius: 8, background: "#fff", color: "#c00", border: "1px solid #c00", cursor: "pointer" };
const card = { background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16 };
const modalWrap = { position: "fixed", left: "50%", top: "8%", transform: "translateX(-50%)", width: "min(900px,94vw)", maxHeight: "84vh", overflow: "auto", background: "#fff", borderRadius: 14, padding: 16, zIndex: 1000, boxShadow: "0 10px 40px rgba(0,0,0,.15)" };

/* =========================
   Seite: Produkte
   ========================= */
export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState("EUR");

  const [showNew, setShowNew] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products", { cache: "no-store" });
    const js = await res.json().catch(() => ({ ok: false, data: [] }));
    const data = Array.isArray(js.data) ? js.data : [];

    setRows(data);
    if (data.length) setCurrencyCode(data[0].currency || "EUR");
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function removeRow(id) {
    if (!confirm("Dieses Produkt wirklich löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return alert(js?.error || "Löschen fehlgeschlagen.");
    await load();
  }

  return (
    <main>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <h1 style={{ margin:0 }}>Produkte & Dienstleistungen</h1>
        <button style={btnPrimary} onClick={()=>setShowNew(true)}>+ Neu</button>
      </div>

      <div style={{ ...card, marginTop:12 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Art</th>
                <th>Kategorie</th>
                <th style={{ whiteSpace:"nowrap" }}>Preis</th>
                <th className="hide-sm" style={{ whiteSpace:"nowrap" }}>Fahrtkosten (pro Einheit)</th>
                <th style={{ textAlign:"right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="ellipsis">{r.name}</td>
                  <td>{r.kind || "—"}</td>
                  <td>{r.categoryCode || "—"}</td>
                  <td>{fmtMoney(r.priceCents, r.currency || currencyCode)}</td>
                  <td className="hide-sm">
                    {r.travelEnabled ? fmtMoney(r.travelRateCents, r.currency || currencyCode) + ` / ${r.travelUnit || "km"}` : "—"}
                  </td>
                  <td style={{ textAlign:"right" }}>
                    <button style={btnGhost} onClick={()=>setEditRow(r)}>Bearbeiten</button>{" "}
                    <button style={btnDanger} onClick={()=>removeRow(r.id)}>Löschen</button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign:"center", color:"#999" }}>{loading ? "Lade…" : "Keine Produkte vorhanden."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <ProductModal
          title="Neues Produkt/Dienstleistung"
          currencyDefault={currencyCode}
          onClose={()=>setShowNew(false)}
          onSaved={async ()=>{ setShowNew(false); await load(); }}
        />
      )}

      {editRow && (
        <ProductModal
          title="Produkt/Dienstleistung bearbeiten"
          currencyDefault={editRow.currency || currencyCode}
          initial={editRow}
          onClose={()=>setEditRow(null)}
          onSaved={async ()=>{ setEditRow(null); await load(); }}
        />
      )}
    </main>
  );
}

/* =========================
   Modal: Produkt anlegen / bearbeiten
   ========================= */
function ProductModal({ title, currencyDefault = "EUR", initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [kind, setKind] = useState(initial?.kind || "service"); // "service" | "product"
  const [categoryCode, setCategoryCode] = useState(initial?.categoryCode || "");
  const [currencyCode] = useState(initial?.currency || currencyDefault || "EUR");

  // Preis & Fahrtkosten als String im Eingabefeld, aber intern in Cents rechnen
  const [priceInput, setPriceInput] = useState(
    initial ? fromCents(initial.priceCents || 0) : ""
  );
  const [travelEnabled, setTravelEnabled] = useState(!!initial?.travelEnabled);
  const [travelRateInput, setTravelRateInput] = useState(
    initial && initial.travelEnabled ? fromCents(initial.travelRateCents || 0) : ""
  );
  const [travelUnit, setTravelUnit] = useState(initial?.travelUnit || "km");

  const [description, setDescription] = useState(initial?.description || "");

  // Für Anzeige
  const priceCents = useMemo(() => toCents(priceInput), [priceInput]);
  const travelRateCents = useMemo(() => toCents(travelRateInput), [travelRateInput]);

  async function save() {
    if (!name.trim()) return alert("Bitte Name angeben.");
    const body = {
      name: name.trim(),
      sku: sku || null,
      kind,
      categoryCode: categoryCode || null,
      currency: currencyCode || "EUR",
      priceCents: priceCents,
      travelEnabled: !!travelEnabled,
      travelRateCents: travelEnabled ? travelRateCents : 0,
      travelUnit: travelEnabled ? (travelUnit || "km") : "km",
      description: description || null,
    };

    const url = initial ? `/api/products/${initial.id}` : "/api/products";
    const method = initial ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) {
      console.error(js);
      return alert(js?.error || "Speichern fehlgeschlagen.");
    }
    onSaved?.();
  }

  return (
    <div className="surface" style={modalWrap} onClick={(e)=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>{title}</b>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>

      <div style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Name">
            <input style={input} value={name} onChange={(e)=>setName(e.target.value)} />
          </Field>
          <Field label="SKU (optional)">
            <input style={input} value={sku} onChange={(e)=>setSku(e.target.value)} />
          </Field>
        </div>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr" }}>
          <Field label="Art">
            <select style={input} value={kind} onChange={(e)=>setKind(e.target.value)}>
              <option value="service">Dienstleistung</option>
              <option value="product">Produkt</option>
            </select>
          </Field>
          <Field label="Kategorie-Code (z. B. 1.1, 1.2)">
            <input style={input} value={categoryCode} onChange={(e)=>setCategoryCode(e.target.value)} placeholder="z. B. 1.1" />
          </Field>
          <Field label="Währung">
            <input style={{ ...input, background:"#f9fafb" }} value={currencyCode} disabled />
          </Field>
        </div>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label={`Preis (${currencyCode})`} hint="Eingaben wie 20 · 20.00 · 20,00 sind ok">
            <input
              style={input}
              inputMode="decimal"
              value={priceInput}
              onChange={(e)=>setPriceInput(e.target.value)}
              onBlur={(e)=>setPriceInput(fromCents(toCents(e.target.value)))}
              placeholder="z. B. 20,00"
            />
            <div style={{ fontSize:12, color:"#6b7280" }}>Speichert als: {fmtMoney(priceCents, currencyCode)}</div>
          </Field>

          <Field label="Fahrtkosten aktivieren">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input id="travelEnabled" type="checkbox" checked={travelEnabled} onChange={(e)=>setTravelEnabled(e.target.checked)} />
              <label htmlFor="travelEnabled" style={{ userSelect:"none" }}>Ja</label>
            </div>
          </Field>
        </div>

        {travelEnabled && (
          <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
            <Field label={`Rate pro Einheit (${currencyCode})`} hint="z. B. 0,45">
              <input
                style={input}
                inputMode="decimal"
                value={travelRateInput}
                onChange={(e)=>setTravelRateInput(e.target.value)}
                onBlur={(e)=>setTravelRateInput(fromCents(toCents(e.target.value)))}
                placeholder="z. B. 0,45"
              />
              <div style={{ fontSize:12, color:"#6b7280" }}>Speichert als: {fmtMoney(travelRateCents, currencyCode)} / {travelUnit}</div>
            </Field>
            <Field label="Einheit">
              <select style={input} value={travelUnit} onChange={(e)=>setTravelUnit(e.target.value)}>
                <option value="km">km</option>
                <option value="mi">mi</option>
                <option value="h">h</option>
              </select>
            </Field>
          </div>
        )}

        <Field label="Beschreibung (optional)">
          <textarea style={{ ...input, minHeight: 80 }} value={description} onChange={(e)=>setDescription(e.target.value)} />
        </Field>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button onClick={onClose} style={btnGhost} type="button">Abbrechen</button>
          <button onClick={save} style={btnPrimary} type="button">Speichern</button>
        </div>
      </div>
    </div>
  );
}
