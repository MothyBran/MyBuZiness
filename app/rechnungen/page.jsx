"use client";

import { useEffect, useMemo, useState } from "react";

/* ───────────────────────────── Helpers ───────────────────────────── */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
function toCents(input) {
  if (input == null) return 0;
  if (typeof input === "number") return Math.round(input * 100);
  let s = String(input).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 100;
  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
    const dec = lc > ld ? "," : ".";
    const thou = dec === "," ? "." : ",";
    s = s.replace(new RegExp("\\" + thou, "g"), "");
    s = s.replace(dec, ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function fromCents(c) {
  const n = Number(c || 0) / 100;
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function money(cents, code = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

const input = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 12, background: "#fff" };
const lbl = { display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 };
const btn = { padding: "10px 12px", borderRadius: 12, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer" };
const btnGhost = { padding: "10px 12px", borderRadius: 12, background: "#fff", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer" };
const btnDanger = { padding: "10px 12px", borderRadius: 12, background: "#fff", color: "#c00", border: "1px solid #c00", cursor: "pointer" };

/* ───────────────────────────── Page ───────────────────────────── */
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currency, setCurrency] = useState("EUR");

  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [listRes, prodRes, custRes, setRes] = await Promise.all([
        fetch("/api/invoices", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }).catch(() => null),
      ]);
      const list = await listRes.json().catch(() => ({}));
      const pr = await prodRes.json().catch(() => ({}));
      const cs = await custRes.json().catch(() => ({}));
      const st = setRes ? await setRes.json().catch(() => ({})) : null;

      setRows(Array.isArray(list?.data) ? list.data : []);
      setProducts(
        Array.isArray(pr?.data)
          ? pr.data.map((p) => ({
              id: p.id,
              name: p.name || "-",
              kind: p.kind || "product", // product | service | travel
              priceCents: toInt(p.priceCents || 0),
              hourlyRateCents: toInt(p.hourlyRateCents || 0),
              travelBaseCents: toInt(p.travelBaseCents || 0),
              travelPerKmCents: toInt(p.travelPerKmCents || 0),
            }))
          : []
      );
      setCustomers(Array.isArray(cs?.data) ? cs.data : []);
      setCurrency(st?.data?.currencyDefault || "EUR");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function deleteInvoice(id) {
    if (!confirm("Rechnung wirklich löschen?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) { alert("Löschen fehlgeschlagen."); return; }
    if (expandedId === id) setExpandedId(null);
    load();
  }

  return (
    <main className="grid-gap-16">
      {/* Kopf */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Rechnungen</h1>
          <button style={btn} onClick={() => setIsOpen(true)}>+ Neue Rechnung</button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Nr.</th>
                <th style={{ width: "40%" }}>Kunde</th>
                <th className="hide-sm" style={{ width: "20%" }}>Datum</th>
                <th style={{ width: "20%" }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} style={{ color: "#6b7280" }}>Lade…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={4} style={{ color: "#6b7280" }}>Keine Rechnungen vorhanden.</td></tr>
              )}

              {!loading && rows.map((r) => {
                const d = r.issueDate ? new Date(r.issueDate) : null;
                const dateStr = d ? d.toLocaleDateString() : "—";
                const isOpenRow = expandedId === r.id;
                return (
                  <>
                    <tr key={r.id} className="row-clickable" onClick={() => toggleExpand(r.id)}>
                      <td className="ellipsis">#{r.invoiceNo || "-"}</td>
                      <td className="ellipsis">{r.customerName || "—"}</td>
                      <td className="hide-sm">{dateStr}</td>
                      <td>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpenRow && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={4} style={{ background: "#fafafa" }}>
                          {/* Aktionen */}
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px" }}>
                            <button style={btnDanger} className="btn-ghost" onClick={(e) => { e.stopPropagation(); deleteInvoice(r.id); }}>❌ Löschen</button>
                          </div>

                          {/* Positionsliste */}
                          <div className="table-wrap" style={{ padding: "0 8px 2px" }}>
                            <table className="table table-fixed" style={{ minWidth: 760 }}>
                              <thead>
                                <tr>
                                  <th style={{ width: "50%" }}>Bezeichnung</th>
                                  <th style={{ width: "10%" }}>Menge</th>
                                  <th style={{ width: "20%" }}>Einzelpreis</th>
                                  <th style={{ width: "20%" }}>Summe</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(!r.items || r.items.length === 0) && (
                                  <tr><td colSpan={4} style={{ color: "#6b7280" }}>Keine Positionen.</td></tr>
                                )}
                                {Array.isArray(r.items) && r.items.map((it, idx) => {
                                  const qty = toInt(it.quantity || 0);
                                  const unit = toInt(it.unitPriceCents || 0);
                                  const base = toInt(it.extraBaseCents || 0); // kommt aus API GET vorbereitet
                                  const line = base + qty * unit;
                                  return (
                                    <tr key={idx}>
                                      <td className="ellipsis">{it.name || "—"}</td>
                                      <td>{qty}</td>
                                      <td>{money(unit, r.currency || currency)}</td>
                                      <td>{money(line, r.currency || currency)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Summen */}
                          <div style={{ textAlign: "right", padding: "6px 8px 10px", fontWeight: 800 }}>
                            Netto: {money(r.netCents, r.currency || currency)} · USt: {money(r.taxCents, r.currency || currency)} · Gesamt: {money(r.grossCents, r.currency || currency)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Neue Rechnung */}
      {isOpen && (
        <NewInvoiceModal
          customers={customers}
          products={products}
          currency={currency}
          onClose={() => setIsOpen(false)}
          onSaved={() => { setIsOpen(false); load(); }}
        />
      )}

      {/* lokale Styles für Tabelle/Mobil */}
      <style jsx global>{`
        .table-wrap{ overflow-x:auto }
        .table{ width:100%; border-collapse:collapse }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }
        .row-clickable{ cursor:pointer }
        .ellipsis{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        @media (max-width: 760px){ .hide-sm{ display:none } }
      `}</style>
    </main>
  );
}

/* ───────────────────────────── NewInvoiceModal ───────────────────────────── */
function NewInvoiceModal({ customers, products, currency, onClose, onSaved }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [taxRate, setTaxRate] = useState(19);

  // Positions-Zeile
  function makeRow() {
    return {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()),
      productId: "",
      name: "",
      kind: "product",
      quantity: 1,
      unitPriceCents: 0,  // als Cents gespeichert
      baseCents: 0,       // Grundpreis (nur UI)
      unitDisplay: "0,00" // String für Eingabeanzeige (nur travel)
    };
  }
  const [items, setItems] = useState([makeRow()]);

  // nächste Rechnungsnummer vorab holen (optional)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/invoices/nextNo", { cache: "no-store" });
        const js = await res.json().catch(() => ({}));
        if (js?.nextNo) setInvoiceNo(String(js.nextNo));
      } catch { /* noop */ }
    })();
  }, []);

  function addRow() { setItems((prev) => [...prev, makeRow()]); }
  function removeRow(id) { setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id))); }
  function patchRow(id, patch) { setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))); }

  function onPickProduct(id, productId) {
    const p = products.find((x) => x.id === productId);
    if (!p) { patchRow(id, { productId: "", name: "", kind: "product", unitPriceCents: 0, baseCents: 0, unitDisplay: "0,00" }); return; }

    if (p.kind === "service") {
      const hr = toInt(p.hourlyRateCents || 0);
      const gp = toInt(p.priceCents || 0);
      if (hr > 0) {
        // Grundpreis + Stundensatz
        patchRow(id, { productId: p.id, name: p.name, kind: "service", baseCents: gp, unitPriceCents: hr, unitDisplay: fromCents(hr) });
      } else {
        // Stück-/Einzelleistung ohne Stundensatz
        patchRow(id, { productId: p.id, name: p.name, kind: "service", baseCents: 0, unitPriceCents: gp, unitDisplay: fromCents(gp) });
      }
    } else if (p.kind === "travel") {
      const base = toInt(p.travelBaseCents || 0);
      const perKm = toInt(p.travelPerKmCents || 0);
      // travel: Einheit editierbar
      patchRow(id, { productId: p.id, name: p.name, kind: "travel", baseCents: base, unitPriceCents: perKm, unitDisplay: fromCents(perKm) });
    } else {
      // product
      const up = toInt(p.priceCents || 0);
      patchRow(id, { productId: p.id, name: p.name, kind: "product", baseCents: 0, unitPriceCents: up, unitDisplay: fromCents(up) });
    }
  }

  function onQty(id, v) {
    const q = Math.max(0, toInt(v));
    patchRow(id, { quantity: q });
  }
  function onChangeUnitDisplay(id, v) {
    // nur für travel freigeben – andere sind fix
    const row = items.find((r) => r.id === id);
    if (!row || row.kind !== "travel") return;
    patchRow(id, { unitDisplay: v, unitPriceCents: toCents(v) });
  }
  function lineSum(row) {
    return toInt(row.baseCents || 0) + toInt(row.quantity || 0) * toInt(row.unitPriceCents || 0);
    }

  const totals = useMemo(() => {
    const net = items.reduce((s, r) => s + lineSum(r), 0);
    const tax = Math.round(net * (Number(taxRate || 0) / 100));
    const gross = net + tax;
    return { net, tax, gross };
  }, [items, taxRate]);

  async function save(e) {
    e.preventDefault();
    if (!customerId) return alert("Bitte Kunde wählen.");
    if (items.length === 0) return alert("Mindestens eine Position ist erforderlich.");

    const payload = {
      invoiceNo: (invoiceNo || "").trim() || undefined, // Server generiert, wenn leer
      customerId,
      issueDate,
      dueDate: dueDate || null,
      taxRate: Number(taxRate || 0),
      items: items.map((r) => ({
        productId: r.productId || null,
        name: r.name || "Position",
        quantity: toInt(r.quantity || 0),
        unitPriceCents: toInt(r.unitPriceCents || 0), // Server bestimmt Grundpreis aus Produkt
      })),
    };

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const js = res ? await res.json().catch(() => ({})) : null;
    if (!res || !res.ok || !js?.ok) {
      alert(js?.error || "Speichern fehlgeschlagen.");
      return;
    }
    onSaved?.();
  }

  return (
    <div
      role="dialog" aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, zIndex: 50
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="surface" style={{ width: "min(980px,100%)", marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Neue Rechnung</h2>
          {/* X bewusst weggelassen, Schließen via Klick auf Overlay & Abbrechen */}
        </div>

        {/* Kopf */}
        <div className="surface" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Rechnungs‑Nr.</label>
              <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} style={input} />
            </div>
            <div>
              <label style={lbl}>Rechnungsdatum</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={input} />
            </div>
            <div>
              <label style={lbl}>Fällig am</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={input} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label style={lbl}>Kunde *</label>
              <select style={input} value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">— wählen —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Steuersatz (%)</label>
              <input inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} style={input} />
            </div>
          </div>
        </div>

        {/* Positionen */}
        <div className="surface" style={{ padding: 12, marginTop: 16 }}>
          <div className="table-wrap">
            <table className="table table-fixed" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>Produkt/Dienstleistung</th>
                  <th style={{ width: "14%" }}>Menge</th>
                  <th style={{ width: "18%" }}>Einzelpreis</th>
                  <th style={{ width: "18%" }}>Summe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const sum = toInt(r.baseCents || 0) + toInt(r.quantity || 0) * toInt(r.unitPriceCents || 0);
                  return (
                    <tr key={r.id}>
                      <td>
                        <select value={r.productId} onChange={(e) => onPickProduct(r.id, e.target.value)} style={{ ...input, width: "100%" }}>
                          <option value="">— Produkt wählen —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.kind === "travel" ? "(Fahrtkosten)" : p.kind === "service" ? "(Dienstleistung)" : ""}
                            </option>
                          ))}
                        </select>
                        {toInt(r.baseCents) > 0 && (
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                            inkl. Grundpreis: {money(r.baseCents, currency)}
                          </div>
                        )}
                      </td>
                      <td>
                        <select value={String(r.quantity ?? 1)} onChange={(e) => patchRow(r.id, { quantity: toInt(e.target.value) })} style={input}>
                          {Array.from({ length: 20 }).map((_, i) => {
                            const v = i + 1;
                            return <option key={v} value={v}>{v}</option>;
                          })}
                        </select>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {r.kind === "travel" ? (
                          <input
                            inputMode="decimal"
                            value={r.unitDisplay}
                            onChange={(e) => onChangeUnitDisplay(r.id, e.target.value)}
                            onBlur={(e) => onChangeUnitDisplay(r.id, fromCents(toCents(e.target.value)))}
                            style={{ ...input, textAlign: "right" }}
                          />
                        ) : (
                          money(r.unitPriceCents, currency)
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(sum, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn-ghost" style={btnGhost} onClick={addRow}>+ Position</button>
            <button className="btn-ghost" style={btnGhost} onClick={() => removeRow(items[items.length - 1]?.id)} disabled={items.length <= 1}>– Entfernen</button>
          </div>
        </div>

        {/* Summen */}
        <div className="surface" style={{ padding: 12, marginTop: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div>Netto: <strong>{money(totals.net, currency)}</strong></div>
            <div>USt: <strong>{money(totals.tax, currency)}</strong></div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
              Gesamt: {money(totals.gross, currency)}
            </div>
          </div>
        </div>

        {/* Aktionen */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button className="btn-ghost" style={btnGhost} onClick={onClose}>Abbrechen</button>
          <button className="btn" style={btn} onClick={save}>Speichern</button>
        </div>
      </div>
    </div>
  );
}
