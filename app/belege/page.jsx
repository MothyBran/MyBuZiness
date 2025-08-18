"use client";

import { useEffect, useMemo, useState } from "react";

/** Utils */
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
const toInt = (v) => Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0;
const clamp = (n, min = 0) => (Number(n) < min ? min : Number(n));
function makeEmptyItem() {
  return { productId: "", name: "", quantity: 1, unitPriceCents: 0, lineTotalCents: 0 };
}

export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Settings
  const [currency, setCurrency] = useState("EUR");
  const [vatExemptDefault, setVatExemptDefault] = useState(true);

  // Modal (Neu/Bearbeiten)
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null = neu, sonst ID
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vatExempt, setVatExempt] = useState(true);
  const [discount, setDiscount] = useState("0");
  const [items, setItems] = useState([makeEmptyItem()]);

  // Debug (optional)
  const [debug, setDebug] = useState({ receiptsOk: null, receiptsRaw: null, diagRaw: null });

  async function load() {
    setLoading(true);
    try {
      const [listRes, prodRes, setRes] = await Promise.all([
        fetch("/api/receipts", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);

      const list = await listRes.json().catch(() => ({}));
      const pr = await prodRes.json().catch(() => ({}));
      const st = await setRes.json().catch(() => ({}));

      // Produkte normalisieren
      setProducts(
        Array.isArray(pr?.data)
          ? pr.data.map((p) => ({
              id: p.id,
              name: p.name || "-",
              kind: p.kind || "product",
              priceCents: toInt(p.priceCents || 0),
              hourlyRateCents: toInt(p.hourlyRateCents || 0),
              travelBaseCents: toInt(p.travelBaseCents || 0),
              travelPerKmCents: toInt(p.travelPerKmCents || 0),
            }))
          : []
      );

      const cur = st?.data?.currencyDefault || "EUR";
      const kU = typeof st?.data?.kleinunternehmer === "boolean" ? st.data.kleinunternehmer : true;
      setCurrency(cur);
      setVatExemptDefault(kU);

      // Primärquelle
      let useRows = Array.isArray(list?.data) ? list.data : [];
      const okPrimary = !!(list && list.ok === true);

      // Fallback /api/_diag, wenn leer/nicht ok
      if ((!okPrimary || useRows.length === 0)) {
        const diagRes = await fetch("/api/_diag", { cache: "no-store" }).catch(() => null);
        const diag = diagRes ? await diagRes.json().catch(() => ({})) : {};
        const diagList = Array.isArray(diag?.latest?.receipts) ? diag.latest.receipts : [];
        useRows = diagList.map((r) => ({
          id: r.id,
          receiptNo: r.receiptNo || "-",
          date: r.date || null,
          grossCents: Number(r.grossCents || 0),
          currency: r.currency || cur || "EUR",
          items: [],
        }));
        setDebug({ receiptsOk: okPrimary, receiptsRaw: list, diagRaw: diag });
      } else {
        setDebug({ receiptsOk: okPrimary, receiptsRaw: list, diagRaw: null });
      }

      setRows(useRows);
    } catch (e) {
      console.error("Receipts load error:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /** Modal öffnen (Neu) */
  function openNew() {
    setEditId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setVatExempt(vatExemptDefault);
    setDiscount("0");
    setItems([makeEmptyItem()]);
    setIsOpen(true);
  }

  /** Modal öffnen (Bearbeiten) */
  function openEdit(row) {
    setEditId(row.id);
    setFormDate(row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
    // vatExempt / discount sind nicht im GET dabei; wenn du sie in Receipt speicherst, hier setzen
    setVatExempt(vatExemptDefault);
    setDiscount("0");
    const its = Array.isArray(row.items) ? row.items : [];
    setItems(
      its.length
        ? its.map((it) => ({
            productId: it.productId || "",
            name: it.name || "",
            quantity: toInt(it.quantity || 1),
            unitPriceCents: toInt(it.unitPriceCents || 0),
            lineTotalCents: toInt(it.lineTotalCents || 0),
          }))
        : [makeEmptyItem()]
    );
    setIsOpen(true);
  }

  function closeModal() { setIsOpen(false); }

  function updateItem(idx, patch) {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      next[idx].lineTotalCents = toInt(next[idx].quantity) * toInt(next[idx].unitPriceCents);
      return next;
    });
  }

  function onProductSelect(idx, productId) {
    const p = products.find((x) => x.id === productId);
    if (!p) { updateItem(idx, { productId: "", name: "", unitPriceCents: 0 }); return; }
    let unit = p.priceCents;
    if (p.kind === "service" && p.hourlyRateCents) unit = p.hourlyRateCents;
    if (p.kind === "travel" && p.travelPerKmCents) unit = p.travelPerKmCents;
    updateItem(idx, { productId: p.id, name: p.name, unitPriceCents: toInt(unit) });
  }

  function addRow() { setItems((prev) => [...prev, makeEmptyItem()]); }
  function removeRow(idx) { setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))); }

  /** Summen für Modal */
  const calc = useMemo(() => {
    const netCents = items.reduce((sum, it) => sum + (toInt(it.quantity) * toInt(it.unitPriceCents)), 0);
    const discountCents = Math.max(0, Math.round(parseFloat((discount || "0").replace(",", ".")) * 100) || 0);
    const netAfterDiscount = Math.max(0, netCents - discountCents);
    const taxCents = vatExempt ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;
    return { netCents, discountCents, netAfterDiscount, taxCents, grossCents };
  }, [items, discount, vatExempt]);

  /** Speichern (Neu/Update) */
  async function saveReceipt() {
    try {
      const cleanItems = items
        .map((it) => ({
          productId: it.productId || null,
          name: (it.name || "").trim() || "Position",
          quantity: clamp(it.quantity || 0, 0),
          unitPriceCents: toInt(it.unitPriceCents || 0),
        }))
        .filter((it) => it.quantity > 0 && it.unitPriceCents >= 0);

      if (cleanItems.length === 0) {
        alert("Bitte mindestens eine Position mit Menge > 0 anlegen.");
        return;
      }

      const payload = {
        date: formDate || null,
        vatExempt: !!vatExempt,
        currency,
        discountCents: calc.discountCents,
        items: cleanItems,
      };

      if (editId) {
        // UPDATE (sofern API vorhanden)
        const res = await fetch(`/api/receipts/${editId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          alert("Bearbeiten fehlgeschlagen (PUT fehlt evtl. im Backend).");
          console.warn("PUT /api/receipts/[id] response:", res.status, txt);
          return;
        }
      } else {
        // CREATE
        const res = await fetch("/api/receipts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const js = await res.json().catch(() => ({}));
        if (!res.ok || !js?.ok) {
          console.error("POST /api/receipts failed:", js?.error || res.statusText);
          alert("Speichern fehlgeschlagen. Details in der Konsole.");
          return;
        }
      }

      setIsOpen(false);
      await load();
    } catch (e) {
      console.error("saveReceipt error:", e);
      alert("Speichern fehlgeschlagen (Technischer Fehler).");
    }
  }

  /** Löschen */
  async function deleteReceipt(id) {
    if (!confirm("Beleg wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert("Löschen fehlgeschlagen (DELETE fehlt evtl. im Backend).");
        console.warn("DELETE /api/receipts/[id] response:", res.status, txt);
        return;
      }
      if (expandedId === id) setExpandedId(null);
      await load();
    } catch (e) {
      console.error("deleteReceipt error:", e);
      alert("Löschen fehlgeschlagen (Technischer Fehler).");
    }
  }

  return (
    <main className="grid-gap-16">
      {/* Kopf */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Belege</h1>
          <button className="btn" onClick={openNew}>+ Neuer Beleg</button>
        </div>
      </div>

      {/* Debug – falls leer */}
      {!loading && rows.length === 0 && (
        <div className="card" style={{ background: "#fffbe6", borderColor: "#fde68a" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug-Hinweis</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            /api/receipts ok: <b>{String(debug.receiptsOk)}</b><br />
            /api/receipts payload: <code style={{ wordBreak: "break-all" }}>{JSON.stringify(debug.receiptsRaw)}</code><br />
            /api/_diag fallback: <code style={{ wordBreak: "break-all" }}>{JSON.stringify(debug.diagRaw)}</code>
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div className="card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Nr.</th>
                <th style={{ width: "33%" }}>Datum</th>
                <th style={{ width: "33%" }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={3} style={{ color: "#6b7280" }}>Lade…</td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr><td colSpan={3} style={{ color: "#6b7280" }}>Keine Belege vorhanden.</td></tr>
              )}

              {!loading && rows.map((r) => {
                const d = r.date ? new Date(r.date) : null;
                const dateStr = d ? d.toLocaleDateString() : "—";
                const isOpen = expandedId === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      className="row-clickable"
                      onClick={() => toggleExpand(r.id)}
                    >
                      <td className="ellipsis">#{r.receiptNo || "-"}</td>
                      <td>{dateStr}</td>
                      <td>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpen && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={3} style={{ background: "#fafafa" }}>
                          {/* Aktionszeile */}
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px" }}>
                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>⚙️ Bearbeiten</button>
                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); deleteReceipt(r.id); }}>❌ Löschen</button>
                          </div>

                          {/* Positionsliste */}
                          <div className="table-wrap" style={{ padding: "0 8px 2px" }}>
                            <table className="table table-fixed" style={{ minWidth: 720 }}>
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
                                  const line = toInt(it.lineTotalCents || qty * unit);
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

                          {/* Gesamtsumme */}
                          <div style={{ textAlign: "right", padding: "6px 8px 10px", fontWeight: 800 }}>
                            Gesamt: {money(r.grossCents, r.currency || currency)}
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

      {/* Modal (Neu/Bearbeiten) */}
      {isOpen && (
        <div
          role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="surface" style={{ width: "min(980px, 100%)", marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0 }}>{editId ? `Beleg #${editId.slice(0, 6)} bearbeiten` : "Neuer Beleg"}</h2>
              <button className="btn-ghost" onClick={() => setIsOpen(false)}>✕ Schließen</button>
            </div>

            {/* Stammdaten */}
            <div className="grid-gap-16" style={{ marginTop: 12 }}>
              <div className="surface" style={{ padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Datum</label>
                    <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Kleinunternehmer (§19 UStG)</label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={vatExempt} onChange={(e) => setVatExempt(e.target.checked)} />
                      <span>Keine USt. berechnen</span>
                    </label>
                  </div>
                  <div>
                    <label style={lbl}>Rabatt (gesamt, €)</label>
                    <input type="text" inputMode="decimal" placeholder="0,00" value={discount} onChange={(e) => setDiscount(e.target.value)} style={inp} />
                  </div>
                </div>
              </div>

              {/* Positionen */}
              <div className="surface" style={{ padding: 12 }}>
                <div className="table-wrap">
                  <table className="table pos-table">
                    <thead>
                      <tr>
                        <th style={{ width: "44%" }}>Produkt/Dienstleistung</th>
                        <th style={{ width: "12%" }}>Menge</th>
                        <th style={{ width: "22%" }}>Einzelpreis</th>
                        <th style={{ width: "22%" }}>Summe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const sum = toInt(it.quantity) * toInt(it.unitPriceCents);
                        return (
                          <tr key={idx}>
                            <td>
                              <select value={it.productId} onChange={(e) => onProductSelect(idx, e.target.value)} style={{ ...inp, width: "100%" }}>
                                <option value="">— Produkt wählen —</option>
                                {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                              </select>
                              <input type="text" placeholder="Freitext (optional)" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} style={{ ...inp, marginTop: 6 }} />
                            </td>
                            <td>
                              <input type="number" min={0} step="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: clamp(e.target.value || 0) })} style={{ ...inp, textAlign: "right" }} />
                            </td>
                            <td>
                              <input
                                type="text" inputMode="decimal"
                                value={(toInt(it.unitPriceCents) / 100).toString().replace(".", ",")}
                                onChange={(e) => {
                                  const raw = (e.target.value || "0").replace(/\./g, "").replace(",", ".");
                                  const cents = Math.round(parseFloat(raw) * 100) || 0;
                                  updateItem(idx, { unitPriceCents: cents });
                                }}
                                style={{ ...inp, textAlign: "right" }}
                              />
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{money(sum, currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn-ghost" onClick={addRow}>+ Position</button>
                  <button className="btn-ghost" onClick={() => removeRow(items.length - 1)} disabled={items.length <= 1}>– Entfernen</button>
                </div>
              </div>

              {/* Summen */}
              <div className="surface" style={{ padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end" }}>
                  <div className="subtle">Rabatt wird vor Steuer abgezogen.</div>
                  <div style={{ textAlign: "right" }}>
                    <div>Zwischensumme: <strong>{money(calc.netCents, currency)}</strong></div>
                    <div>Rabatt: <strong>- {money(calc.discountCents, currency)}</strong></div>
                    <div>Netto: <strong>{money(calc.netAfterDiscount, currency)}</strong></div>
                    <div>USt {vatExempt ? "(befreit §19)" : "19%"}: <strong>{money(calc.taxCents, currency)}</strong></div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                      Gesamt: {money(calc.grossCents, currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Aktionen */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-ghost" onClick={closeModal}>Abbrechen</button>
                <button className="btn" onClick={saveReceipt}>{editId ? "Aktualisieren" : "Speichern"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Styles */
const lbl = { display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 };
const inp = {
  width: "100%", display: "block", background: "#fff",
  border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "10px 12px",
  outline: "none", boxShadow: "0 1px 1px rgba(0,0,0,.03) inset",
};
