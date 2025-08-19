"use client";

import { useEffect, useMemo, useState } from "react";

/* Utils */
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
const toInt = (v) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);
function makeEmptyItem() {
  return { productId: "", name: "", quantity: 1, unitPriceCents: 0, baseCents: 0, kind: "product", lineTotalCents: 0 };
}

export default function ReceiptsPage() {
  /* Listen- & UI-State */
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Settings */
  const [currency, setCurrency] = useState("EUR");
  const [vatExemptDefault, setVatExemptDefault] = useState(true); // §19 aus Einstellungen

  /* Modal (Neu/Bearbeiten) */
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);     // null = neu
  const [receiptNo, setReceiptNo] = useState(""); // editierbar
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState("0");
  const [items, setItems] = useState([makeEmptyItem()]);

  /* Laden */
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

      /* Produkte normalisieren */
      setProducts(
        Array.isArray(pr?.data)
          ? pr.data.map((p) => ({
              id: p.id,
              name: p.name || "-",
              kind: p.kind || "product",              // product | service | travel
              priceCents: toInt(p.priceCents || 0),
              hourlyRateCents: toInt(p.hourlyRateCents || 0),
              travelBaseCents: toInt(p.travelBaseCents || 0),
              travelPerKmCents: toInt(p.travelPerKmCents || 0),
            }))
          : []
      );

      setCurrency(st?.data?.currencyDefault || "EUR");
      setVatExemptDefault(typeof st?.data?.kleinunternehmer === "boolean" ? st.data.kleinunternehmer : true);

      setRows(Array.isArray(list?.data) ? list.data : []);
    } catch (e) {
      console.error("Receipts load error:", e);
      setRows([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /* Nächste Belegnummer holen (optional Backend /api/receipts/nextNo) */
  async function fetchNextReceiptNo() {
    try {
      const res = await fetch("/api/receipts/nextNo", { cache: "no-store" });
      if (res.ok) {
        const js = await res.json().catch(() => ({}));
        if (js?.nextNo) return String(js.nextNo);
      }
    } catch {}
    // Fallback (Zeitstempel), falls Endpoint (noch) nicht existiert
    return String(Date.now());
  }

  /* Modal öffnen (Neu) */
  async function openNew() {
    setEditId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setDiscount("0");
    setItems([makeEmptyItem()]);
    const nextNo = await fetchNextReceiptNo();
    setReceiptNo(nextNo);
    setIsOpen(true);
  }

  /* Modal öffnen (Bearbeiten) */
  function openEdit(row) {
    setEditId(row.id);
    setReceiptNo(row.receiptNo || "");
    setFormDate(row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setDiscount("0"); // falls du Rabatt speicherst, hier setzen
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
  if (!p) {
    updateItem(idx, { productId: "", name: "", unitPriceCents: 0, baseCents: 0, kind: "product" });
    return;
  }
  let unit = p.priceCents;
  let base = 0;
  if (p.kind === "service") {
    base = toInt(p.priceCents || 0);
    unit = toInt(p.hourlyRateCents || 0);
  } else if (p.kind === "travel") {
    base = toInt(p.travelBaseCents || 0);
    unit = toInt(p.travelPerKmCents || 0);
  } else {
    base = 0;
    unit = toInt(p.priceCents || 0);
  }
  updateItem(idx, {
    productId: p.id,
    name: p.name,
    unitPriceCents: unit,
    baseCents: base,
    kind: p.kind || "product"
  });
}

  function addRow() { setItems((prev) => [...prev, makeEmptyItem()]); }
  function removeRow(idx) { setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))); }

  /* Summen (Rabatt unter Positionen) */
  const calc = useMemo(() => {
    const netCents = items.reduce((s, it) => s + (toInt(it.quantity) * toInt(it.unitPriceCents)), 0);
    const discountCents = Math.max(0, Math.round(parseFloat((discount || "0").replace(",", ".")) * 100) || 0);
    const netAfterDiscount = Math.max(0, netCents - discountCents);
    const taxCents = vatExemptDefault ? 0 : Math.round(netAfterDiscount * 0.19);
    const grossCents = netAfterDiscount + taxCents;
    return { netCents, discountCents, netAfterDiscount, taxCents, grossCents };
  }, [items, discount, vatExemptDefault]);

  /* Speichern (Neu/Update) – Hinweis: Dein aktuelles Backend ignoriert receiptNo und vergibt selbst.
     Wenn du die editierte/benutzerdefinierte Nummer speichern willst, musst du /api/receipts (POST/PUT) entsprechend anpassen. */
  async function saveReceipt() {
    try {
      const cleanItems = items
        .map((it) => ({
          productId: it.productId || null,
          name: (it.name || "").trim() || "Position",
          quantity: Math.max(0, toInt(it.quantity || 0)),
          unitPriceCents: toInt(it.unitPriceCents || 0),
        }))
        .filter((it) => it.quantity > 0 && it.unitPriceCents >= 0);

      if (cleanItems.length === 0) {
        alert("Bitte mindestens eine Position mit Menge > 0 anlegen.");
        return;
      }

      const payload = {
        receiptNo,                   // wird evtl. vom Backend überschrieben (siehe Hinweis oben)
        date: formDate || null,
        vatExempt: !!vatExemptDefault,
        currency,
        discountCents: calc.discountCents,
        items: cleanItems,
      };

      if (editId) {
        const res = await fetch(`/api/receipts/${editId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
        if (!res || !res.ok) {
          alert("Aktualisieren fehlgeschlagen (PUT /api/receipts/[id] fehlt evtl.).");
          return;
        }
      } else {
        const res = await fetch("/api/receipts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
        if (!res || !res.ok) {
          alert("Speichern fehlgeschlagen.");
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

  /* Löschen */
  async function deleteReceipt(id) {
    if (!confirm("Beleg wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" }).catch(() => null);
      if (!res || !res.ok) {
        alert("Löschen fehlgeschlagen (DELETE /api/receipts/[id] fehlt evtl.).");
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
              {loading && <tr><td colSpan={3} style={{ color: "#6b7280" }}>Lade…</td></tr>}
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
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="surface" style={{ width: "min(980px, 100%)", marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0 }}>{editId ? "Beleg bearbeiten" : "Neuer Beleg"}</h2>
              {/* kein X-Button mehr */}
            </div>

            {/* Kopfzeile: Beleg‑Nr. + Datum */}
            <div className="surface" style={{ padding: 12, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Beleg‑Nr.</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Datum</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inp} />
                </div>
              </div>
            </div>

            {/* Positionen */}
            <div className="surface" style={{ padding: 12, marginTop: 16 }}>
              <div className="table-wrap">
                <table className="table pos-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50%" }}>Produkt/Dienstleistung</th>
                      <th style={{ width: "16%" }}>Menge</th>
                      <th style={{ width: "17%" }}>Einzelpreis</th>
                      <th style={{ width: "17%" }}>Summe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const sum = toInt(it.baseCents || 0) + (toInt(it.quantity) * toInt(it.unitPriceCents));
                      return (
                        <tr key={idx}>
                          <td>
                            <select
                              value={it.productId}
                              onChange={(e) => onProductSelect(idx, e.target.value)}
                              style={{ ...inp, width: "100%" }}
                            >
                              <option value="">— Produkt wählen —</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={String(it.quantity ?? 1)}
                              onChange={(e) => updateItem(idx, { quantity: toInt(e.target.value) })}
                              style={{ ...inp, textAlign: "right" }}
                            >
                              {Array.from({ length: 20 }).map((_, i) => {
                                const v = i + 1;
                                return <option key={v} value={v}>{v}</option>;
                              })}
                            </select>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {money(toInt(it.unitPriceCents), currency)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            {money(sum, currency)}
                          </td>
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

            {/* Rabatt + Summen (Rabatt unter Positionen) */}
            <div className="surface" style={{ padding: 12, marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 12 }}>
                <div>
                  <label style={lbl}>Rabatt gesamt (€, optional)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    style={inp}
                  />
                  <div className="subtle" style={{ marginTop: 6 }}>
                    Rabatt wird vor Steuer abgezogen. USt {vatExemptDefault ? "(befreit §19)" : "19%"}.
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Zwischensumme: <strong>{money(calc.netCents, currency)}</strong></div>
                  <div>Rabatt: <strong>- {money(calc.discountCents, currency)}</strong></div>
                  <div>Netto: <strong>{money(calc.netAfterDiscount, currency)}</strong></div>
                  <div>USt {vatExemptDefault ? "(befreit §19)" : "19%"}: <strong>{money(calc.taxCents, currency)}</strong></div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                    Gesamt: {money(calc.grossCents, currency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Aktionen */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="btn-ghost" onClick={closeModal}>Abbrechen</button>
              <button className="btn" onClick={saveReceipt}>{editId ? "Aktualisieren" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* Styles (lokal) */
const lbl = { display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 };
const inp = {
  width: "100%", display: "block", background: "#fff",
  border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "10px 12px",
  outline: "none", boxShadow: "0 1px 1px rgba(0,0,0,.03) inset",
};
