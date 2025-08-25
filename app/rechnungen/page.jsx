"use client";

import { useEffect, useMemo, useState } from "react";

/* ───────── Helpers ───────── */
const toInt = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; };
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
};

/* ───────── Page ───────── */
export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currency, setCurrency] = useState("EUR");
  const [vatExempt, setVatExempt] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [printFor, setPrintFor] = useState(null);

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
      if (st?.data) setSettings(st.data);
      setCurrency(st?.data?.currency || "EUR");
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

  function onPrint(row){
    setPrintFor({ row, settings });
    setTimeout(()=> window.print(), 50);
  }

  return (
    <main className="ivx-page">
      {/* Kopf */}
      <div className="card">
        <div className="ivx-head">
          <h1 className="page-title">Rechnungen</h1>
          <button style={S.btn} onClick={() => setIsOpen(true)}>+ Neue Rechnung</button>
        </div>
      </div>

      {/* Tabelle – NUR diese Card bekommt horizontales Scrolling */}
      <div className="card table-card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width: "70px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "160px" }} />
              <col />
              <col style={{ width: "200px" }} />
            </colgroup>
            <thead>
              <tr>
                <th title="Status">🚦</th>
                <th>Nr.</th>
                <th className="hide-sm">Datum</th>
                <th>Kunde</th>
                <th>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="muted">Lade…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="muted">Keine Rechnungen vorhanden.</td></tr>
              )}

              {!loading && rows.map((r) => {
                const d = r.issueDate ? new Date(r.issueDate) : null;
                const dateStr = d ? d.toLocaleDateString() : "—";
                const isOpenRow = expandedId === r.id;
                const st = computeStatus(r);
                const stLabel = st === "done" ? "abgeschlossen" : (st === "overdue" ? "überfällig" : "offen");
                const customer = customers.find(c => String(c.id) === String(r.customerId));

                return (
                  <>
                    <tr key={r.id} className="row-clickable" onClick={() => toggleExpand(r.id)}>
                      <td><span className={`st-dot ${st}`} aria-label={`Status: ${stLabel}`} title={stLabel} /></td>
                      <td className="nowrap">#{r.invoiceNo || "-"}</td>
                      <td className="hide-sm nowrap">{dateStr}</td>
                      <td>{r.customerName || customer?.name || "—"}</td>
                      <td className="nowrap" style={{ textAlign: "right", fontWeight: 700 }}>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpenRow && (
                      <tr key={r.id + "-details"}>
                        <td colSpan={5} className="details-cell">
                          <div className="detail-head">
                            <div>
                              <div className="muted">Rechnung</div>
                              <div className="h5">#{r.invoiceNo || "-"}</div>
                              <div className="muted">Status: <strong>{stLabel}</strong></div>
                            </div>
                            <div className="actions">
                              <button style={S.ghost} onClick={(e)=>{ e.stopPropagation(); onPrint(r); }}>🖨️ Druckansicht</button>
                              <button style={S.ghost} onClick={(e)=>{ e.stopPropagation(); setEditRow(r); }}>✏️ Korrigieren</button>
                              <button style={S.danger} onClick={(e)=>{ e.stopPropagation(); deleteInvoice(r.id); }}>❌ Löschen</button>
                            </div>
                          </div>

                          {/* Positionsliste */}
                          <div className="table-wrap positions">
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
                                  <tr><td colSpan={4} className="muted">Keine Positionen.</td></tr>
                                )}
                                {Array.isArray(r.items) && r.items.map((it, idx) => (
                                  <tr key={idx}>
                                    <td>{it.name || "—"}</td>
                                    <td>{toInt(it.quantity || 0)}</td>
                                    <td>{money(toInt(it.unitPriceCents || 0), r.currency || currency)}</td>
                                    <td>{money(toInt(it.lineTotalCents || 0), r.currency || currency)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="totals">
                            Netto: {money(r.netCents, r.currency || currency)} · USt: {money(r.taxCents, r.currency || currency)} · Gesamt: {money(r.grossCents, r.currency || currency)}
                          </div>

                          {printFor?.row?.id === r.id && (
                            <PrintArea row={r} settings={settings} currency={currency} customer={customer} />
                          )}
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
        <InvoiceModal
          mode="create"
          customers={customers}
          products={products}
          currency={currency}
          vatExempt={vatExempt}
          onClose={() => setIsOpen(false)}
          onSaved={() => { setIsOpen(false); load(); }}
        />
      )}

      {/* Modal: Korrigieren (alles editierbar, inkl. Status) */}
      {editRow && (
        <InvoiceModal
          mode="edit"
          initial={editRow}
          customers={customers}
          products={products}
          currency={currency}
          vatExempt={vatExempt}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); load(); }}
        />
      )}

      <style jsx global>{`
        .ivx-page{ overflow-x:hidden; }
        .card{ background:#fff;border:1px solid #eee;border-radius:14px;padding:16px }
        .ivx-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280 }
        .h5{ font-size:16px; font-weight:800 }
        .row-clickable{ cursor:pointer }
        .nowrap{ white-space:nowrap }
        .hide-sm{ }
        @media (max-width: 760px){ .hide-sm{ display:none } }

        /* NUR die Tabellen-Card bekommt horizontales Scrolling */
        .card.table-card .table-wrap{ overflow-x:auto }

        /* Detail-Positionsliste: horizontales Scrollen erlaubt, aber innerhalb der Card */
        .details-cell .table-wrap.positions{ overflow-x:auto }

        .table{ width:100%; border-collapse:collapse; min-width:600px }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }

        .st-dot{ display:inline-block; width:10px; height:10px; border-radius:50%; background:#f59e0b }
        .st-dot.open{ background:#f59e0b }
        .st-dot.overdue{ background:#ef4444 }
        .st-dot.done{ background:#10b981 }

        .details-cell{ background:#fafafa }
        .detail-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px }
        .actions{ display:flex; gap:8px; flex-wrap:wrap }
        .totals{ text-align:right; padding:6px 8px 10px; font-weight:800 }

        /* ===== Modals ===== */
        .ivx-modal{
          position: fixed; inset: 0; background: rgba(0,0,0,.4);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 16px; z-index: 50;
        }
        .ivx-modal-box{
          width: min(980px, 100%);
          margin-top: 24px;
          background:#fff; border:1px solid #eee; border-radius:14px;
          max-height: calc(100vh - 48px);
          overflow-y: auto;           /* nur vertikal scrollen */
          overflow-x: hidden;         /* kein horizontales Scrolling fürs Fenster */
        }
        .ivx-modal-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 16px; border-bottom: 1px solid #eee;
          position: sticky; top: 0; background:#fff; z-index: 1;
        }
        .ivx-modal-actions{
          display:flex; justify-content:flex-end; gap:8px; padding: 12px 16px;
          position: sticky; bottom: 0; background:#fff; border-top: 1px solid #eee;
        }

        .surface.section{ padding: 12px 16px; }

        /* Kopf-Felder: kompakt, überlappen nicht, wrappen sauber */
        .head-rows{ display:flex; flex-direction:column; gap:10px; }
        .row{ display:flex; flex-wrap:wrap; gap:12px; }
        .cell{ display:block; flex: 1 1 auto; }

        /* Feste, realistische Max-Breiten pro Feld */
        .w-no    { flex: 0 1 220px; max-width: 260px; }
        .w-date  { flex: 0 1 180px; max-width: 220px; }
        .w-money { flex: 0 1 180px; max-width: 220px; }
        .w-status{ flex: 0 1 180px; max-width: 220px; }
        .w-full  { flex: 1 1 640px; max-width: 640px; }

        /* Produkt/Dienstleistung Card im Modal: H-Scroll nur hier */
        .positions .table-wrap{ overflow-x:auto }
        .positions .table{ min-width:760px }

        @media (max-width: 720px){
          .w-no{ max-width: 220px; } .w-date{ max-width: 200px; } .w-money{ max-width: 200px; } .w-status{ max-width: 200px; }
          .w-full{ flex-basis: 100%; max-width: 100%; }
        }

        /* ===== Druck: nur print-area ausgeben ===== */
        @media print{
          body *{ visibility: hidden !important; }
          .print-area, .print-area *{ visibility: visible !important; }
          .print-area{ position: absolute; left:0; top:0; width:100%; padding:0 !important; margin:0 !important; }
        }
      `}</style>
    </main>
  );
}

/* ───────── Modal (Neu/Korrigieren) ───────── */
function InvoiceModal({ mode="create", initial=null, customers, products, currency, vatExempt, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo || "");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ? String(initial.issueDate).slice(0,10) : new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initial?.dueDate ? String(initial.dueDate).slice(0,10) : "");
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
  const [discount, setDiscount] = useState("0");
  const [status, setStatus] = useState(initial?.status || "open");  // nur bei Edit sichtbar

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
  const [items, setItems] = useState(()=>{
    if (isEdit && Array.isArray(initial?.items) && initial.items.length){
      return initial.items.map(it => ({
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()),
        productId: it.productId || "",
        name: it.name || "",
        kind: "product",
        quantity: toInt(it.quantity || 0),
        unitPriceCents: toInt(it.unitPriceCents || 0),
        baseCents: toInt(it.lineTotalCents||0) - toInt(it.quantity||0)*toInt(it.unitPriceCents||0),
        unitDisplay: fromCents(toInt(it.unitPriceCents||0))
      }));
    }
    return [makeRow()];
  });

  useEffect(()=>{
    if (!isEdit){
      (async () => {
        try {
          const res = await fetch("/api/invoices/nextNo", { cache: "no-store" });
          const js = await res.json().catch(() => ({}));
          if (js?.invoiceNo) setInvoiceNo(js.invoiceNo);
        } catch {}
      })();
    }
  },[isEdit]);

  function patchRow(id, patch) { setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
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
  function addRow() { setItems((prev) => [...prev, makeRow()]); }
  function removeRow(id) { setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id))); }

  function onQty(id, v) {
    const q = Math.max(0, toInt(v));
    setItems(prev => prev.map(r => r.id===id ? { ...r, quantity: q } : r));
  }
  function onChangeUnitDisplay(id, v) {
    const row = items.find((r) => r.id === id);
    if (!row || row.kind !== "travel") return;
    patchRow(id, { unitDisplay: v, unitPriceCents: toCents(v) });
  }
  function lineSum(row) { return toInt(row.baseCents || 0) + toInt(row.quantity || 0) * toInt(row.unitPriceCents || 0); }

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

    const basePayload = {
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

    if (isEdit) {
      const payload = { ...basePayload, status }; // Status nur beim Editen mitsenden
      const res = await fetch(`/api/invoices/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);
      const js = res ? await res.json().catch(() => ({})) : null;
      if (!res || !res.ok || !js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
      onSaved?.();
    } else {
      const payload = { ...basePayload, status: "open" }; // neu: standardmäßig offen
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);
      const js = res ? await res.json().catch(() => ({})) : null;
      if (!res || !res.ok || !js?.ok) return alert(js?.error || "Speichern fehlgeschlagen.");
      onSaved?.();
    }
  }

  return (
    <div
      role="dialog" aria-modal="true"
      className="ivx-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="ivx-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ivx-modal-head">
          <h2>{isEdit ? "Rechnung korrigieren" : "Neue Rechnung"}</h2>
          <button className="btn-ghost" style={S.ghost} onClick={onClose}>Schließen</button>
        </div>

        {/* Kopf: kompakt – 2 Reihen á 2 Felder + Kunde */}
        <div className="surface section">
          <div className="head-rows">
            <div className="row">
              <div className="cell w-no">
                <label style={S.lbl}>Rechnungs-Nr.</label>
                <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} style={S.input} />
              </div>
              <div className="cell w-date">
                <label style={S.lbl}>Rechnungsdatum</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={S.input} />
              </div>
            </div>
            <div className="row">
              <div className="cell w-date">
                <label style={S.lbl}>Fällig am</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={S.input} />
              </div>
              <div className="cell w-money">
                <label style={S.lbl}>Rabatt gesamt (€, optional)</label>
                <input type="text" inputMode="decimal" placeholder="0,00" value={discount} onChange={(e)=>setDiscount(e.target.value)} style={S.input} />
              </div>
            </div>
            <div className="row">
              <div className="cell w-full">
                <label style={S.lbl}>Kunde *</label>
                <CustomerPicker value={customerId} onChange={setCustomerId} />
              </div>
            </div>

            {isEdit && (
              <div className="row">
                <div className="cell w-status">
                  <label style={S.lbl}>Status</label>
                  <select value={status} onChange={(e)=>setStatus(e.target.value)} style={S.input}>
                    <option value="open">offen</option>
                    <option value="done">abgeschlossen</option>
                    {/* "overdue" wird automatisch anhand Fälligkeit berechnet */}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Positionen – nur diese Card darf horizontal scrollen */}
        <div className="surface section positions">
          <div className="table-wrap">
            <table className="table table-fixed">
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
                        <select value={r.productId} onChange={(e) => onPickProduct(r.id, e.target.value)} style={{ ...S.input, width: "100%", maxWidth: "100%" }}>
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
                        <select value={String(r.quantity ?? 1)} onChange={(e) => onQty(r.id, e.target.value)} style={{ ...S.input, maxWidth: "100%" }}>
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
                            style={{ ...S.input, textAlign: "right", maxWidth: "100%" }}
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
            <button className="btn-ghost" style={S.ghost} onClick={addRow}>+ Position</button>
            <button className="btn-ghost" style={S.ghost} onClick={()=>setItems(p => p.length<=1?p:p.slice(0,-1))} disabled={items.length <= 1}>– Entfernen</button>
          </div>
        </div>

        {/* Summen */}
        <div className="surface section">
          <div className="totals-grid">
            <div />
            <div className="totals-box">
              <div>Zwischensumme: <strong>{money(items.reduce((s, r)=> s + (toInt(r.baseCents || 0) + toInt(r.quantity || 0) * toInt(r.unitPriceCents || 0)), 0), currency)}</strong></div>
              <div>Rabatt: <strong>- {money(Math.max(0, toCents(discount || "0")), currency)}</strong></div>
              <div>Netto: <strong>{money((items.reduce((s, r)=> s + (toInt(r.baseCents || 0) + toInt(r.quantity || 0) * toInt(r.unitPriceCents || 0)), 0)) - Math.max(0, toCents(discount || "0")), currency)}</strong></div>
              <div>USt {vatExempt ? "(befreit §19)" : "19%"}: <strong>{money(Math.round((Math.max(0, (items.reduce((s, r)=> s + (toInt(r.baseCents || 0) + toInt(r.quantity || 0) * toInt(r.unitPriceCents || 0)), 0)) - Math.max(0, toCents(discount || "0"))) * (vatExempt ? 0 : 19) / 100)), currency)}</strong></div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                Gesamt: {money((Math.max(0, (items.reduce((s, r)=> s + (toInt(r.baseCents || 0) + toInt(r.quantity || 0) * toInt(r.unitPriceCents || 0)), 0)) - Math.max(0, toCents(discount || "0"))) + Math.round((Math.max(0, (items.reduce((s, r)=> s + (toInt(r.baseCents || 0) + toInt(r.quantity || 0) * toInt(r.unitPriceCents || 0)), 0)) - Math.max(0, toCents(discount || "0"))) * (vatExempt ? 0 : 19) / 100))), currency)}
              </div>
            </div>
          </div>
        </div>

        <div className="ivx-modal-actions">
          <button className="btn-ghost" style={S.ghost} onClick={onClose}>Abbrechen</button>
          <button className="btn" style={S.btn} onClick={save}>{isEdit ? "Speichern" : "Anlegen"}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Drucklayout ───────── */
function PrintArea({ row, settings, currency, customer }) {
  const firm = settings || {};
  const dueTxt = row.dueDate ? new Date(row.dueDate).toLocaleDateString("de-DE") : null;

  const custName   = customer?.name || row.customerName || "";
  const custStreet = customer?.addressStreet || row.customerStreet || "";
  const custZip    = customer?.addressZip || row.customerZip || "";
  const custCity   = customer?.addressCity || row.customerCity || "";

  const firmLineLeft = [
    (firm.companyName || "").trim(),
    (firm.address1 || "").trim(),
    [firm.postalCode, firm.city].filter(Boolean).join(" ")
  ].filter(Boolean).join(" • ");

  return (
    <div className="print-area">
      <div className="print-page">
        {/* Kopf */}
        <div className="ph-head">
          <div className="ph-left">
            {firm.logoUrl && <img src={firm.logoUrl} alt="Logo" className="ph-logo" />}
            {firmLineLeft && <div className="ph-fromline">{firmLineLeft}</div>}
            <div className="ph-sep" />
            <div className="ph-recipient">
              <div className="ph-rec-label">Empfänger</div>
              <div className="ph-rec-name">{custName}</div>
              {custStreet && <div>{custStreet}</div>}
              {(custZip || custCity) && <div>{custZip} {custCity}</div>}
            </div>
          </div>

          <div className="ph-right">
            <div className="ph-title">RECHNUNG</div>
            <div>Nr.: <strong>{row.invoiceNo}</strong></div>
            <div>Datum: <strong>{row.issueDate ? new Date(row.issueDate).toLocaleDateString("de-DE") : ""}</strong></div>
            {(firm.email || firm.phone) && (
              <div className="ph-contact">
                {firm.email && <div>{firm.email}</div>}
                {firm.phone && <div>{firm.phone}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Positionen */}
        <table className="ph-table">
          <thead>
            <tr>
              <th className="ta-left">Bezeichnung</th>
              <th>Menge</th>
              <th>Einzelpreis</th>
              <th>Summe</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(row.items) && row.items.map((it, idx)=>(
              <tr key={idx}>
                <td className="ta-left">{it.name || ""}</td>
                <td>{toInt(it.quantity || 0)}</td>
                <td>{money(toInt(it.unitPriceCents || 0), row.currency || currency)}</td>
                <td>{money(toInt(it.lineTotalCents || 0), row.currency || currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Zahlungsinfo/Hinweis */}
        <div className="ph-note">
          {dueTxt
            ? <>Bitte überweisen Sie den Gesamtbetrag bis zum <strong>{dueTxt}</strong> auf die unten aufgeführten Bankdaten.</>
            : <>Bitte überweisen Sie den Gesamtbetrag auf die unten aufgeführten Bankdaten.</>
          }
        </div>

        {/* Summen */}
        <div className="ph-totals">
          <div>Netto: <strong>{money(row.netCents, row.currency || currency)}</strong></div>
          <div>USt: <strong>{money(row.taxCents, row.currency || currency)}</strong></div>
          <div className="ph-total">Gesamt: <strong>{money(row.grossCents, row.currency || currency)}</strong></div>
        </div>

        {/* Fußzeile – Bank/Steuer */}
        <div className="ph-footer">
          {firm.bankAccount && <div><strong>Bankverbindung:</strong> {firm.bankAccount}</div>}
          {firm.vatId && <div><strong>USt-ID:</strong> {firm.vatId}</div>}
        </div>
      </div>

      <style jsx>{`
        .print-page{ padding: 24px 28px; font: 12pt/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#000; }
        .ph-head{ display:flex; justify-content:space-between; gap:18px; }
        .ph-left{ flex:1; min-width: 55%; }
        .ph-right{ text-align:right; min-width: 35%; }
        .ph-logo{ max-height: 48px; margin-bottom: 8px; }
        .ph-fromline{ font-weight:700; margin-top:4px; }
        .ph-sep{ height: 1px; background:#222; margin: 8px 0 12px; }

        .ph-recipient{ margin: 0 0 10px; }
        .ph-rec-label{ font-size:10pt; color:#555; }
        .ph-rec-name{ font-size:12pt; font-weight:700; }

        .ph-title{ font-size: 18pt; font-weight: 800; margin-bottom: 6px; }
        .ph-contact{ margin-top: 10px; }

        .ph-table{ width:100%; border-collapse: collapse; margin-top: 16px; }
        .ph-table th, .ph-table td{ border-bottom: 1px solid #ddd; padding: 8px; text-align:right; }
        .ph-table .ta-left{ text-align:left; }

        .ph-note{ margin: 14px 0; }

        .ph-totals{ margin-top: 12px; text-align: right; }
        .ph-total{ font-size: 14pt; font-weight: 800; margin-top: 6px; }

        .ph-footer{ border-top: 1px solid #ddd; margin-top: 18px; padding-top: 10px; font-size: 10pt; color:#333; }
      `}</style>
    </div>
  );
}

/* ───────── Kunden-Picker ───────── */
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
