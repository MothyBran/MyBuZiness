"use client";
import { useDialog } from "../components/DialogProvider";


import { useEffect, useMemo, useState } from "react";

/* Geld-Utils */
function toCents(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return Math.round(input * 100);
  let s = String(input).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 100;
  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const dec = lastComma > lastDot ? "," : ".";
    const thou = dec === "," ? "." : ",";
    s = s.replace(new RegExp("\\" + thou, "g"), "");
    s = s.replace(dec, ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function fromCents(cents) {
  const n = (Number(cents || 0) / 100);
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMoney(cents, currencyCode = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: currencyCode }).format((Number(cents || 0) / 100));
}

/* UI helpers */
function Field({ label, children }) {
  return (
    <label style={{ display:"grid", gap:6 }}>
      <span className="subtle" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ color: "var(--text, inherit)" }}>{children}</span>
    </label>
  );
}
const input = { padding:"10px 12px", border:"1px solid var(--border)", background:"var(--panel)", color:"var(--text)", borderRadius:8, width:"100%" };
const btnPrimary = { padding:"10px 12px", borderRadius:8, background:"var(--color-primary,#0aa)", color:"#fff", border:"1px solid transparent", cursor:"pointer" };
const btnGhost = { padding:"10px 12px", borderRadius:8, background:"transparent", color:"var(--color-primary,#0aa)", border:"1px solid var(--color-primary,#0aa)", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:8, background:"transparent", color:"#c00", border:"1px solid #c00", cursor:"pointer" };
const modalWrap = { position:"fixed", left:"50%", top:"8%", transform:"translateX(-50%)", width:"min(900px,94vw)", maxHeight:"84vh", overflow:"auto", background:"var(--panel)", borderRadius:14, padding:16, zIndex:1000, boxShadow:"0 10px 40px rgba(0,0,0,.15)" };

export default function ProductsPage() {
  const { confirm: confirmMsg, alert: alertMsg } = useDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [settings, setSettings] = useState(null);

  async function load() {
    setLoading(true);
    const js = await fetch("/api/products", { cache:"no-store" }).then(r=>r.json()).catch(()=>({ data:[] }));
    const sJs = await fetch("/api/settings", { cache:"no-store" }).then(r=>r.json()).catch(()=>({}));
    setRows(js.data || []);
    setSettings(sJs.data || null);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  function toggleExpand(id){ setExpandedId(prev => prev === id ? null : id); }

  async function removeRow(id){
    if (!await confirmMsg("Dieses Produkt wirklich löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method:"DELETE" });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return await alertMsg(js?.error || "Löschen fehlgeschlagen.");
    if (expandedId === id) setExpandedId(null);
    load();
  }

  return (
    <main className="container">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 16, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Produkte & Dienstleistungen</h1>
          <div className="subtle">Artikel, Preise & Leistungen</div>
        </div>
        <div style={{ display:"flex", alignItems: "center" }}>
          <button style={btnPrimary} onClick={()=>setShowNew(true)}>+ Neu</button>
        </div>
      </div>

      <div className="surface" style={{ padding:0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Kategorie</th>
                <th>Name</th>
                <th>Art</th>
                <th style={{ whiteSpace:"nowrap" }}>Preis/Regel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <>
                  <tr key={r.id} className="row-clickable" style={{ cursor:"pointer" }} onClick={()=>toggleExpand(r.id)}>
                    <td>{r.categoryCode || "—"}</td>
                    <td className="ellipsis">{r.name}</td>
                    <td>{mapKindLabel(r.kind)}</td>
                    <td>
                      {r.kind === "product" && <>{fmtMoney(r.priceCents)}</>}
                      {r.kind === "service" && <>
                        {r.hourlyRateCents ? <>Grundpreis {fmtMoney(r.priceCents)} + {fmtMoney(r.hourlyRateCents)}/Std.</> : <>Grundpreis {fmtMoney(r.priceCents)}</>}
                      </>}
                      {r.kind === "travel" && <>
                        Grundpreis {fmtMoney(r.travelBaseCents)} + {fmtMoney(r.travelPerKmCents)}/km
                      </>}
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={r.id+"-d"}>
                      <td colSpan={4} style={{ background:"var(--panel-2)", padding:12, borderBottom:"1px solid var(--border)" }}>
                        <ProductDetails row={r} />
                        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
                          <button style={btnGhost} onClick={(e)=>{ e.stopPropagation(); setEditRow(r); }}>⚙️ Bearbeiten</button>
                          <button style={btnDanger} onClick={(e)=>{ e.stopPropagation(); removeRow(r.id); }}>❌ Löschen</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!rows.length && (
                <tr><td colSpan={4} style={{ textAlign:"center", color:"#999" }}>{loading? "Lade…":"Keine Einträge."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <ProductModal title="Neuer Eintrag" settings={settings} onClose={()=>setShowNew(false)} onSaved={()=>{ setShowNew(false); load(); }} />}
      {editRow && <ProductModal title="Eintrag bearbeiten" settings={settings} initial={editRow} onClose={()=>setEditRow(null)} onSaved={()=>{ setEditRow(null); load(); }} />}
    </main>
  );
}

function mapKindLabel(kind) {
  if (kind === "service") return "Dienstleistung";
  if (kind === "travel") return "Fahrtkosten";
  return "Produkt";
}

function ProductDetails({ row }) {
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr 1fr 1fr" }}>
        <Field label="Name"><div>{row.name}</div></Field>
        <Field label="Art"><div>{mapKindLabel(row.kind)}</div></Field>
        <Field label="Kategorie"><div>{row.categoryCode || "—"}</div></Field>
        <Field label="SKU"><div>{row.sku || "—"}</div></Field>
      </div>

      {row.kind === "product" && (
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr" }}>
          <Field label="Preis"><div>{fmtMoney(row.priceCents)}</div></Field>
        </div>
      )}

      {row.kind === "service" && (
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Grundpreis"><div>{fmtMoney(row.priceCents)}</div></Field>
          <Field label="Std.-Satz (optional)">
            <div>
              {row.hourlyRateCents ? fmtMoney(row.hourlyRateCents) + "/Std." : "—"}
              {row.hourlyRateCents > 0 && row.quarterHourBilling && (
                <span style={{ fontSize: "0.8em", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                  (1/4 Std.-Takt, mind. 1 Std.)
                </span>
              )}
            </div>
          </Field>
        </div>
      )}

      {row.kind === "travel" && (
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Grundpreis"><div>{fmtMoney(row.travelBaseCents)}</div></Field>
          <Field label="Pauschale pro km"><div>{fmtMoney(row.travelPerKmCents)}/km</div></Field>
        </div>
      )}

      <Field label="Beschreibung"><div style={{ whiteSpace:"pre-wrap" }}>{row.description || "—"}</div></Field>
    </div>
  );
}

function ProductModal({ title, initial, onClose, onSaved, settings }) {
  const [name, setName] = useState(initial?.name || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [kind, setKind] = useState(initial?.kind || "product"); // product | service | travel
  const [categoryCode, setCategoryCode] = useState(initial?.categoryCode || "");
  const [description, setDescription] = useState(initial?.description || "");

  const vatExempt = settings?.kleinunternehmer === true;
  const defaultTaxRate = vatExempt ? "0" : (settings?.taxRateDefault !== undefined ? String(settings.taxRateDefault) : "19");
  const [taxRate, setTaxRate] = useState(initial?.taxRate !== undefined ? String(initial.taxRate) : defaultTaxRate);

  // Preise (string-Eingabe, robust)
  const [priceInput, setPriceInput] = useState(initial ? fromCents(initial.priceCents || 0) : "");
  const [hourlyInput, setHourlyInput] = useState(initial?.hourlyRateCents ? fromCents(initial.hourlyRateCents) : "");
  const [quarterHourBilling, setQuarterHourBilling] = useState(initial?.quarterHourBilling || false);
  const [travelBaseInput, setTravelBaseInput] = useState(initial?.travelBaseCents ? fromCents(initial.travelBaseCents) : "");
  const [travelPerKmInput, setTravelPerKmInput] = useState(initial?.travelPerKmCents ? fromCents(initial.travelPerKmCents) : "");

  async function save() {
    if (!name.trim()) return await alertMsg("Bitte Bezeichnung angeben.");

    let tRate = Number(taxRate.replace(",", "."));
    if (isNaN(tRate)) tRate = 19;

    const body = {
      name: name.trim(),
      sku: sku || null,
      kind,
      categoryCode: categoryCode || null,
      description: description || null,
      priceCents: toCents(priceInput || 0),
      hourlyRateCents: toCents(hourlyInput || 0),
      quarterHourBilling,
      travelBaseCents: toCents(travelBaseInput || 0),
      travelPerKmCents: toCents(travelPerKmInput || 0),
      taxRate: tRate,
    };

    const url = initial ? `/api/products/${initial.id}` : "/api/products";
    const method = initial ? "PUT" : "POST";
    const res = await fetch(url, { method, headers:{ "content-type":"application/json" }, body: JSON.stringify(body) });
    const js = await res.json().catch(()=>({}));
    if (!js?.ok) return await alertMsg(js?.error || "Speichern fehlgeschlagen.");
    onSaved?.();
  }

  return (
    <div className="surface" style={modalWrap} onClick={(e)=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>{title}</b>
        <button onClick={onClose} className="btn-ghost" style={{ padding:"6px 10px" }}>×</button>
      </div>

      {/* Felder gemäß Art */}
      <div style={{ display:"grid", gap:12 }}>
        {/* Zeile 1 */}
        <Field label="Bezeichnung">
          <input style={input} value={name} onChange={e=>setName(e.target.value)} />
        </Field>

        {/* Zeile 2 */}
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
          <Field label="Kategorie">
            <input style={input} value={categoryCode} onChange={e=>setCategoryCode(e.target.value)} placeholder="z. B. 1.1" />
          </Field>
          <Field label="SKU">
            <input style={input} value={sku} onChange={e=>setSku(e.target.value)} />
          </Field>
        </div>

        {/* Art */}
        <Field label="Art">
          <select style={input} value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="product">Produkt</option>
            <option value="service">Dienstleistung</option>
            <option value="travel">Fahrtkosten</option>
          </select>
        </Field>

        {/* Zeile 3 (abhängig von Art) */}
        {kind === "product" && (
          <Field label="Preis (€)">
            <input style={input} inputMode="decimal" value={priceInput} onChange={e=>setPriceInput(e.target.value)} onBlur={e=>setPriceInput(fromCents(toCents(e.target.value)))} placeholder="z. B. 20,00" />
          </Field>
        )}

        {kind === "service" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
              <Field label="Grundpreis (€)">
                <input style={input} inputMode="decimal" value={priceInput} onChange={e=>setPriceInput(e.target.value)} onBlur={e=>setPriceInput(fromCents(toCents(e.target.value)))} placeholder="z. B. 20,00" />
              </Field>
              <Field label="Std.-Satz (€/Std., optional)">
                <input style={input} inputMode="decimal" value={hourlyInput} onChange={e=>setHourlyInput(e.target.value)} onBlur={e=>setHourlyInput(fromCents(toCents(e.target.value)))} placeholder="z. B. 50,00" />
              </Field>
            </div>
            {toCents(hourlyInput || 0) > 0 && (
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.9rem", cursor:"pointer" }}>
                <input
                  type="checkbox"
                  checked={quarterHourBilling}
                  onChange={e=>setQuarterHourBilling(e.target.checked)}
                  style={{ width:"16px", height:"16px", accentColor:"var(--brand)" }}
                />
                Abrechnung im 1/4-Stunden-Takt (Erste Stunde voll berechnet)
              </label>
            )}
          </div>
        )}

        {kind === "travel" && (
          <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
            <Field label="Grundpreis (€)">
              <input style={input} inputMode="decimal" value={travelBaseInput} onChange={e=>setTravelBaseInput(e.target.value)} onBlur={e=>setTravelBaseInput(fromCents(toCents(e.target.value)))} placeholder="z. B. 5,00" />
            </Field>
            <Field label="Pauschale pro km (€/km)">
              <input style={input} inputMode="decimal" value={travelPerKmInput} onChange={e=>setTravelPerKmInput(e.target.value)} onBlur={e=>setTravelPerKmInput(fromCents(toCents(e.target.value)))} placeholder="z. B. 0,45" />
            </Field>
          </div>
        )}

        {/* Steuer */}
        {!vatExempt && (
          <Field label="Umsatzsteuer (%)">
            <input style={input} inputMode="decimal" value={taxRate} onChange={e=>setTaxRate(e.target.value)} placeholder="z. B. 19" />
          </Field>
        )}

        {/* Zeile 4 */}
        <Field label="Beschreibung">
          <textarea style={{ ...input, minHeight: 80 }} value={description} onChange={e=>setDescription(e.target.value)} />
        </Field>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost} type="button">Abbrechen</button>
          <button onClick={save} style={btnPrimary} type="button">Speichern</button>
        </div>
      </div>
    </div>
  );
}
