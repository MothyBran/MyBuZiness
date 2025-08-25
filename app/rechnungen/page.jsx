"use client";

import { useEffect, useMemo, useState } from "react";

/* ───────── Helpers ───────── */
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
function computeStatus(row) {
  const raw = String(row.status || "").toLowerCase();
  if (raw === "done" || raw === "abgeschlossen") return "done";
  const due = row.dueDate ? new Date(row.dueDate) : null;
  if (due) {
    const t0 = new Date(); t0.setHours(0,0,0,0);
    const d0 = new Date(due); d0.setHours(0,0,0,0);
    if (d0 < t0) return "overdue";
  }
  return "open";
}

const S = {
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 12, background: "#fff" },
  lbl:   { display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 },
  btn:   { padding: "10px 12px", borderRadius: 12, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer" },
  ghost: { padding: "10px 12px", borderRadius: 12, background: "#fff", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer" },
  danger:{ padding: "10px 12px", borderRadius: 12, background: "#fff", color: "#c00", border: "1px solid #c00", cursor: "pointer" },
  card:  { background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16 }
};

/* ───────── Page ───────── */
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currency, setCurrency] = useState("EUR");
  const [vatExempt, setVatExempt] = useState(true);

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
      setProducts(Array.isArray(pr?.data) ? pr.data : []);
      setCustomers(Array.isArray(cs?.data) ? cs.data : []);
      setCurrency(st?.data?.currencyDefault || "EUR");
      setVatExempt(typeof st?.data?.kleinunternehmer === "boolean" ? st.data.kleinunternehmer : true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) { setExpandedId((prev) => (prev === id ? null : id)); }

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
          <button style={S.btn} onClick={() => setIsOpen(true)}>+ Neue Rechnung</button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width: "8%" }} />   {/* S */}
              <col style={{ width: "20%" }} />  {/* Nr. */}
              <col style={{ width: "18%" }} />  {/* Datum */}
              <col style={{ width: "34%" }} />  {/* Kunde */}
              <col style={{ width: "20%" }} />  {/* Betrag */}
            </colgroup>
            <thead>
              <tr>
                <th>Status</th>
                <th>Nr.</th>
                <th className="hide-sm">Datum</th>
                <th>Kunde</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ color: "#6b7280" }}>Lade…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} style={{ color: "#6b7280" }}>Keine Rechnungen vorhanden.</td></tr>
              )}

              {!loading && rows.map((r) => {
                const d = r.issueDate ? new Date(r.issueDate) : null;
                const dateStr = d ? d.toLocaleDateString() : "—";
                const isOpenRow = expandedId === r.id;
                const st = computeStatus(r); // open | overdue | done
                const stLabel = st === "done" ? "abgeschlossen" : (st === "overdue" ? "überfällig" : "offen");

                return (
                  <>
                    <tr key={r.id} className="row-clickable" onClick={() => toggleExpand(r.id)}>
                      <td><span className={`st-dot ${st}`} aria-label={`Status: ${stLabel}`} title={stLabel} /></td>
                      <td className="ellipsis">#{r.invoiceNo || "-"}</td>
                      <td className="hide-sm">{dateStr}</td>
                      <td className="ellipsis">{r.customerName || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpenRow && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={5} className="details-cell">
                          {/* Kopf Detail + Aktionen */}
                          <div className="detail-head">
                            <div>
                              <div className="muted">Rechnung</div>
                              <div className="h5">#{r.invoiceNo || "-"}</div>
                              <div className="muted">Status: <strong>{stLabel}</strong></div>
                            </div>
                            <div className="actions">
                              <button style={S.ghost} onClick={(e)=>{ e.stopPropagation(); window.print(); }}>🖨️ Druckansicht</button>
                              <EditInvoiceButton row={r} onSaved={()=>{ toggleExpand(r.id); load(); }} />
                              <button style={S.danger} onClick={(e)=>{ e.stopPropagation(); deleteInvoice(r.id); }}>❌ Löschen</button>
                            </div>
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
                                  const base = toInt(it.extraBaseCents || 0);
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
                          <div className="totals">
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
          vatExempt={vatExempt}
          onClose={() => setIsOpen(false)}
          onSaved={() => { setIsOpen(false); load(); }}
        />
      )}

      {/* Tabelle/Status Styles */}
      <style jsx global>{`
        .card{ background:#fff;border:1px solid #eee;border-radius:14px;padding:16px }
        .table-wrap{ overflow-x:auto }
        .table{ width:100%; border-collapse:collapse }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }
        .row-clickable{ cursor:pointer }
        .ellipsis{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .hide-sm{ }
        @media (max-width: 760px){ .hide-sm{ display:none } }

        .st-dot{ display:inline-block; width:10px; height:10px; border-radius:50%; background:#f59e0b }
        .st-dot.open{ background:#f59e0b }     /* gelb */
        .st-dot.overdue{ background:#ef4444 }  /* rot */
        .st-dot.done{ background:#10b981 }     /* grün */

        .details-cell{ background:#fafafa }
        .detail-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px }
        .actions{ display:flex; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280; font-size:12px }
        .h5{ font-size:16px; font-weight:800 }

        .totals{ text-align:right; padding:6px 8px 10px; font-weight:800 }
        @media print{
          .page-title, .actions, .btn, .card > .table-wrap::-webkit-scrollbar { display:none !important; }
          .card{ border:none; padding:0 }
          .table th,.table td{ border-color:#ddd }
        }
      `}</style>
    </main>
  );
}

/* ───────── Detail: „Korrigieren“ (PATCH) ───────── */
function EditInvoiceButton({ row, onSaved }) {
  const [open, setOpen] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState(row.invoiceNo || "");
  const [issueDate, setIssueDate] = useState(row.issueDate ? String(row.issueDate).slice(0,10) : "");
  const [dueDate, setDueDate] = useState(row.dueDate ? String(row.dueDate).slice(0,10) : "");
  const [status, setStatus] = useState(row.status || "open");
  const st = computeStatus(row);
  const autoLabel = st === "done" ? "abgeschlossen" : (st === "overdue" ? "überfällig" : "offen");

  async function save() {
    const payload = { invoiceNo, issueDate: issueDate || null, dueDate: dueDate || null, status };
    const res = await fetch(`/api/invoices/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(()=>null);
    if (!res || !res.ok) { alert("Speichern fehlgeschlagen."); return; }
    setOpen(false);
    onSaved?.();
  }

  if (!open) return <button style={S.ghost} onClick={(e)=>{ e.stopPropagation(); setOpen(true); }}>✏️ Korrigieren</button>;

  return (
    <div className="edit-pop" onClick={(e)=> e.stopPropagation()}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, minWidth: 520 }}>
        <div>
          <label style={S.lbl}>Rechnungs-Nr.</label>
          <input value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.lbl}>Rechnungsdatum</label>
          <input type="date" value={issueDate} onChange={(e)=>setIssueDate(e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.lbl}>Fällig am</label>
          <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.lbl}>Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} style={S.input}>
            <option value="open">offen</option>
            <option value="overdue">überfällig</option>
            <option value="done">abgeschlossen</option>
          </select>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>
            Automatisch erkannt: <strong>{autoLabel}</strong>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:10 }}>
        <button style={S.ghost} onClick={()=>setOpen(false)}>Abbrechen</button>
        <button style={S.btn} onClick={save}>Speichern</button>
      </div>
      <style jsx>{`
        .edit-pop{
          background:#fff; border:1px solid #ddd; border-radius:12px; padding:10px;
        }
      `}</style>
    </div>
  );
}

/* ───────── Modal: Neue Rechnung ───────── */
function NewInvoiceModal({ customers, products, currency, vatExempt, onClose, onSaved }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");

  function makeRow() {
    return {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()),
      productId: "",
      name: "",
      kind: "product",
      quantity: 1,
      unitPriceCents: 0,
      baseCents: 0,
      unitDisplay: "0,00"
    };
  }
  const [items, setItems] = useState([makeRow()]);

  // neue Nummer im Schema RN-YYMM-000 holen
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/invoices/nextNo", { cache: "no-store" });
        const js = await res.json().catch(() => ({}));
        if (js?.invoiceNo) setInvoiceNo(js.invoiceNo);
      } catch { /* noop */ }
    })();
  }, []);

  function onPickProduct(id, productId) {
    const p = products.find((x) => x.id === productId);
    if (!p) { patchRow(id, { productId: "", name: "", kind: "product", unitPriceCents: 0, baseCents: 0, unitDisplay: "0,00" }); return; }

    if (p.kind === "service") {
      const hr = toInt(p.hourlyRateCents || 0);
      const gp = toInt(p.priceCents || 0);
      if (hr > 0) {
        patchRow(id, { productId: p.id, name: p.name, kind: "service", baseCents: gp, unitPriceCents: hr, unitDisplay: fromCents(hr) });
      } else {
        patchRow(id, { productId: p.id, name: p.name, kind: "service", baseCents: 0, unitPriceCents: gp, unitDisplay: fromCents(gp) });
      }
    } else if (p.kind === "travel") {
      const base = toInt(p.travelBaseCents || 0);
      const perKm = toInt(p.travelPerKmCents || 0);
      patchRow(id, { productId: p.id, name: p.name, kind: "travel", baseCents: base, unitPriceCents: perKm, unitDisplay: fromCents(perKm) });
    } else {
      const up = toInt(p.priceCents || 0);
      patchRow(id, { productId: p.id, name: p.name, kind: "product", baseCents: 0, unitPriceCents: up, unitDisplay: fromCents(up) });
    }
  }
  function patchRow(id, patch) { setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function addRow() { setItems((prev) => [...prev, makeRow()]); }
  function removeRow(id) { setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id))); }

  function onQty(id, v) {
    const q = Math.max(0, toInt(v));
    patchRow(id, { quantity: q });
  }
  function onChangeUnitDisplay(id, v) {
    const row = items.find((r) => r.id === id);
    if (!row || row.kind !== "travel") return;
    patchRow(id, { unitDisplay: v, unitPriceCents: toCents(v) });
  }
  function lineSum(row) {
    return toInt(row.baseCents || 0) + toInt(row.quantity || 0) * toInt(row.unitPriceCents || 0);
  }

  const totals = useMemo(() => {
    const net = items.reduce((s, r) => s + lineSum(r), 0);
    const discountCents = Math.max(0, toCents(discount || "0"));
    const netAfterDiscount = Math.max(0, net - discountCents);
    const taxRate = vatExempt ? 0 : 19;
    const tax = Math.round(netAfterDiscount * (taxRate / 100));
    const gross = netAfterDiscount + tax;
    return { net, discountCents, netAfterDiscount, taxRate, tax, gross };
  }, [items, discount, vatExempt]);

  async function save(e) {
    e.preventDefault();
    if (!customerId) return alert("Bitte Kunde wählen.");
    if (items.length === 0) return alert("Mindestens eine Position ist erforderlich.");

    const payload = {
      invoiceNo: (invoiceNo || "").trim() || undefined,
      customerId,
      issueDate,
      dueDate: dueDate || null,
      discountCents: totals.discountCents,
      items: items.map((r) => ({
        productId: r.productId || null,
        name: r.name || "Position",
        quantity: toInt(r.quantity || 0),
        unitPriceCents: toInt(r.unitPriceCents || 0),
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
      <div className="surface" style={{ width: "min(980px,100%)", marginTop: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Neue Rechnung</h2>
        </div>

        {/* Kopf: 4 Felder – exakt, luftig */}
        <div className="surface" style={{ padding: 12, marginTop: 12 }}>
          <div className="grid-head">
            <div>
              <label style={S.lbl}>Rechnungs-Nr.</label>
              <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.lbl}>Rechnungsdatum</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.lbl}>Fällig am</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.lbl}>Rabatt gesamt (€, optional)</label>
              <input type="text" inputMode="decimal" placeholder="0,00" value={discount} onChange={(e)=>setDiscount(e.target.value)} style={S.input} />
            </div>
          </div>

          <div className="grid-one" style={{ marginTop: 12 }}>
            <div>
              <label style={S.lbl}>Kunde *</label>
              <CustomerPicker value={customerId} onChange={setCustomerId} />
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
                        <select value={r.productId} onChange={(e) => onPickProduct(r.id, e.target.value)} style={{ ...S.input, width: "100%" }}>
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
                        <select value={String(r.quantity ?? 1)} onChange={(e) => onQty(r.id, e.target.value)} style={S.input}>
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
                            style={{ ...S.input, textAlign: "right" }}
                          />
                        ) : (
                          money(r.unitPriceCents, currency)
                        )}
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
            <button className="btn-ghost" style={S.ghost} onClick={() => setItems((p) => [...p, makeRow()])}>+ Position</button>
            <button className="btn-ghost" style={S.ghost} onClick={() => setItems((p) => (p.length <= 1 ? p : p.slice(0, -1)))} disabled={items.length <= 1}>– Entfernen</button>
          </div>
        </div>

        {/* Summen */}
        <div className="surface" style={{ padding: 12, marginTop: 16 }}>
          <div className="totals-grid">
            <div />
            <div className="totals-box">
              <div>Zwischensumme: <strong>{money(totals.net, currency)}</strong></div>
              <div>Rabatt: <strong>- {money(totals.discountCents, currency)}</strong></div>
              <div>Netto: <strong>{money(totals.netAfterDiscount, currency)}</strong></div>
              <div>USt {vatExempt ? "(befreit §19)" : "19%"}: <strong>{money(totals.tax, currency)}</strong></div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                Gesamt: {money(totals.gross, currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Aktionen */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button className="btn-ghost" style={S.ghost} onClick={onClose}>Abbrechen</button>
          <button className="btn" style={S.btn} onClick={save}>Speichern</button>
        </div>
      </div>

      <style jsx>{`
        .grid-head{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap:12px;
        }
        .grid-one{ display:grid; grid-template-columns: 1fr; gap:12px; }

        .totals-grid{ display:grid; grid-template-columns: 1fr auto; align-items:flex-end; }
        .totals-box{ text-align:right; }

        @media (max-width: 720px){
          .grid-head{ grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

function CustomerPicker({ value, onChange }) {
  const [opts, setOpts] = useState([]);
  useEffect(() => { (async () => {
    const js = await fetch("/api/customers").then(r => r.json()).catch(() => ({ data: [] }));
    setOpts(js.data || []);
  })(); }, []);
  return (
    <select style={S.input} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">– wählen –</option>
      {opts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}
