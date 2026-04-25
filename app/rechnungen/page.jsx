"use client";
import { useDialog } from "../components/DialogProvider";


import React, { useEffect, useMemo, useState } from "react";
import Barcode from "react-barcode";
import BarcodeScannerModal from "../components/BarcodeScannerModal";

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
  if (raw === "storniert" || raw === "canceled") return "canceled";
  if (raw === "done" || raw === "abgeschlossen") return "done";
  const due = row.dueDate ? new Date(row.dueDate) : null;
  if (due) {
    const t0 = new Date(); t0.setHours(0,0,0,0);
    const d0 = new Date(due); d0.setHours(0,0,0,0);
    if (d0 < t0 && raw === "open") return "overdue";
  }
  return "open";
}
const S = {
  input: { width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" },
  lbl:   { display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 },
  btn:   { padding: "10px 12px", borderRadius: 12, background: "var(--color-primary,#0aa)", color: "#fff", border: "1px solid transparent", cursor: "pointer" },
  ghost: { padding: "10px 12px", borderRadius: 12, background: "transparent", color: "var(--color-primary,#0aa)", border: "1px solid var(--color-primary,#0aa)", cursor: "pointer" },
  danger:{ padding: "10px 12px", borderRadius: 12, background: "transparent", color: "#c00", border: "1px solid #c00", cursor: "pointer" },
};

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/* ───────── Page ───────── */
export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="container p-4">Lade...</div>}>
      <InvoicesPageContent />
    </Suspense>
  );
}

function InvoicesPageContent() {
  const searchParams = useSearchParams();
  const { confirm: confirmMsg, alert: alertMsg } = useDialog();
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

  const [q, setQ] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const no = searchParams.get("no");
    if (no) setQ(no);
  }, [searchParams]);

  useEffect(() => {
    const expand = searchParams.get("expand");
    if (expand && rows.some(r => r.id === expand) && expandedId !== expand) {
      setExpandedId(expand);
    }
  }, [searchParams, rows]);

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

      const rowsData = Array.isArray(list?.data) ? list.data : [];
      setRows(rowsData);
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
    if (!await confirmMsg("Rechnung wirklich löschen?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) { await alertMsg("Löschen fehlgeschlagen."); return; }
    if (expandedId === id) setExpandedId(null);
    load();
  }

  const filteredRows = useMemo(() => {
    if (!q) return rows;
    const lowerQ = q.toLowerCase();
    return rows.filter((r) => {
      const rn = (r.invoiceNo || "").toLowerCase();
      const dt = r.issueDate ? new Date(r.issueDate).toLocaleDateString().toLowerCase() : "";
      const num = money(r.grossCents, r.currency || currency).toLowerCase();
      const cn = (r.customerName || customers.find(c => String(c.id) === String(r.customerId))?.name || "").toLowerCase();

      return rn.includes(lowerQ) || dt.includes(lowerQ) || num.includes(lowerQ) || cn.includes(lowerQ);
    });
  }, [rows, q, currency, customers]);

  return (
    <main className="container">
      {/* Kopf */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom:4 }}>Rechnungen</h1>
          <div className="subtle">Ausgangsrechnungen & Abrechnungen</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen (Nr/Datum/Kunde/Betrag)…"
            style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--panel)", color: "var(--text)", width: "260px" }}
          />
          <button onClick={() => setShowScanner(true)} style={S.ghost} title="Barcode scannen">
            📷 Scanner
          </button>
          <button style={S.btn} onClick={() => setIsOpen(true)}>+ Neue Rechnung</button>
        </div>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(data) => {
            setQ(data);
            setShowScanner(false);
          }}
        />
      )}

      {/* Tabelle – NUR diese Card bekommt horizontales Scrolling */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width: "24px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "95px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "100px", textAlign: "right" }} />
            </colgroup>
            <thead>
              <tr>
                <th title="Status" style={{ paddingRight: "8px" }}>🚦</th>
                <th style={{ paddingRight: "8px" }}>Nr.</th>
                <th style={{ paddingRight: "8px" }}>Datum</th>
                <th style={{ paddingRight: "8px" }}>Kunde</th>
                <th style={{ textAlign: "right" }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="muted">Lade…</td></tr>}
              {!loading && filteredRows.length === 0 && (
                <tr><td colSpan={5} className="muted">Keine Rechnungen vorhanden.</td></tr>
              )}

              {!loading && filteredRows.map((r) => {
                const d = r.issueDate ? new Date(r.issueDate) : null;
                const dateStr = d ? d.toLocaleDateString() : "—";
                const isOpenRow = expandedId === r.id;
                const st = computeStatus(r);
                const stLabel = st === "canceled" ? "storniert" : (st === "done" ? "abgeschlossen" : (st === "overdue" ? "überfällig" : "offen"));
                const customer = customers.find(c => String(c.id) === String(r.customerId));

                return (
                  <React.Fragment key={r.id}>
                    <tr className="row-clickable" onClick={() => toggleExpand(r.id)}>
                      <td style={{ paddingRight: "8px" }}><span className={`st-dot ${st}`} aria-label={`Status: ${stLabel}`} title={stLabel} /></td>
                      <td className="nowrap" style={{ paddingRight: "8px" }}>#{r.invoiceNo || "-"}</td>
                      <td className="nowrap" style={{ paddingRight: "8px" }}>{dateStr}</td>
                      <td className="nowrap ellipsis" style={{ paddingRight: "8px" }}>{r.customerName || customer?.name || "—"}</td>
                      <td className="nowrap" style={{ textAlign: "right", fontWeight: 700 }}>{money(r.grossCents, r.currency || currency)}</td>
                    </tr>

                    {isOpenRow && (
                      <tr>
                        <td colSpan={5} className="details-cell">
                          <div className="details-content-wrapper">
                            <div className="detail-head">
                              <div>
                                <div className="muted">Rechnung</div>
                                <div className="h5">#{r.invoiceNo || "-"}</div>
                                <div className="muted">Status: <strong>{stLabel}</strong></div>
                              </div>
                              <div className="actions">
                                <a style={S.ghost} href={`/rechnungen/${r.id}/druck`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>🖨️ Druckansicht</a>
                                <button style={S.ghost} onClick={(e)=>{ e.stopPropagation(); setEditRow(r); }}>✏️ Korrigieren</button>
                                <button style={S.danger} onClick={(e)=>{ e.stopPropagation(); deleteInvoice(r.id); }}>❌ Löschen</button>
                              </div>
                            </div>

                            {/* Positionsliste */}
                            <div className="table-wrap positions">
                              <table className="table table-fixed inner-table" style={{ minWidth: 500 }}>
                                <thead>
                                  <tr>
                                    <th style={{ width: "10%" }}>Pos.</th>
                                    <th style={{ width: "40%" }}>Bezeichnung</th>
                                    <th style={{ width: "10%" }}>Menge</th>
                                    <th style={{ width: "20%" }}>Einzelpreis</th>
                                    <th style={{ width: "20%" }}>Summe</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(!r.items || r.items.length === 0) && (
                                    <tr><td colSpan={5} className="muted">Keine Positionen.</td></tr>
                                  )}
                                  {Array.isArray(r.items) && r.items.map((it, idx) => (
                                    <tr key={idx}>
                                      <td>{idx + 1}.</td>
                                      <td>{it.name || "—"}</td>
                                      <td>{Number(it.quantity || 0)}</td>
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
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
        .card{ background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px }
        .ivx-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280 }
        .h5{ font-size:16px; font-weight:800 }
        .row-clickable{ cursor:pointer }
        .nowrap{ white-space:nowrap }
        .hide-sm{ }
        @media (max-width: 760px){ .hide-sm{ display:none } }

        /* NUR die Tabellen-Card bekommt horizontales Scrolling */
        .card.table-card .table-wrap{ overflow-x:auto; border:none; }

        /* Detail-Positionsliste: horizontales Scrollen erlaubt, aber innerhalb der Card */
        .details-cell .table-wrap.positions{ overflow-x:auto }

        .table{ width:100%; border-collapse:collapse; min-width:500px; background-color: var(--panel-2); }
        .table thead { background-color: transparent; }
        .table tbody { background-color: var(--panel); }
        .table th { background-color: transparent; border-bottom:1px solid var(--border); padding:10px; vertical-align:middle; text-align: left; }
        .table td { border-bottom:1px solid var(--border); padding:10px; vertical-align:middle; }
        .table-fixed{ table-layout:fixed }

        @media (max-width: 760px) {
          .table th, .table td { padding: 10px 6px; font-size: 13px; }
          .nowrap { white-space: nowrap; }
          .ellipsis { overflow: hidden; text-overflow: ellipsis; }
        }

        .st-dot{ display:inline-block; width:10px; height:10px; border-radius:50%; background:#f59e0b }
        .st-dot.open{ background:#f59e0b }
        .st-dot.overdue{ background:#ef4444 }
        .st-dot.done{ background:#10b981 }
        .st-dot.canceled{ background:#9ca3af }

        /* Zwingt die Detail-Zelle, die Elterntabelle NICHT aufzudehnen, sodass diese exakt ins Layout passt */
        .details-cell { background:var(--panel-2); max-width: 0; width: 100%; box-sizing: border-box; padding: 0 !important; }
        .details-content-wrapper { display: grid; padding: 10px; }
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
          background:var(--panel); border:1px solid var(--border); border-radius:14px;
          max-height: calc(100vh - 48px);
          overflow-y: auto;           /* nur vertikal scrollen */
          overflow-x: hidden;         /* kein horizontales Scrolling fürs Fenster */
        }
        .ivx-modal-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; background:var(--panel); z-index: 1;
        }
        .ivx-modal-actions{
          display:flex; justify-content:flex-end; gap:8px; padding: 12px 16px;
          position: sticky; bottom: 0; background:var(--panel); border-top: 1px solid var(--border);
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

      `}</style>
    </main>
  );
}

/* ───────── Modal (Neu/Korrigieren) ───────── */
function InvoiceModal({ mode="create", initial=null, customers, products, currency, vatExempt, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const defaultIssueDate = initial?.issueDate ? String(initial.issueDate).slice(0,10) : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  let defaultDueDate = "";
  if (initial?.dueDate) {
    defaultDueDate = String(initial.dueDate).slice(0,10);
  } else {
    const defaultIssueDateObj = new Date(defaultIssueDate);
    defaultIssueDateObj.setDate(defaultIssueDateObj.getDate() + 14);
    defaultDueDate = new Date(defaultIssueDateObj.getTime() - defaultIssueDateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo || "");
  const [issueDate, setIssueDate] = useState(defaultIssueDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
  const [discount, setDiscount] = useState("0");
  const [status, setStatus] = useState(initial?.status || "open");  // nur bei Edit sichtbar

  const [userEditedDueDate, setUserEditedDueDate] = useState(false);

  useEffect(() => {
    if (!isEdit && issueDate && !userEditedDueDate) {
      const issueObj = new Date(issueDate);
      if (!isNaN(issueObj)) {
        issueObj.setDate(issueObj.getDate() + 14);
        setDueDate(new Date(issueObj.getTime() - issueObj.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
      }
    }
  }, [issueDate, isEdit, userEditedDueDate]);

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
        quantity: Number(it.quantity || 0),
        unitPriceCents: toInt(it.unitPriceCents || 0),
        baseCents: toInt(it.lineTotalCents||0) - Number(it.quantity||0)*toInt(it.unitPriceCents||0),
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
  function lineSum(row) { return toInt(row.baseCents || 0) + Math.round(Number(row.quantity || 0) * toInt(row.unitPriceCents || 0)); }

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
    if (!customerId) return await alertMsg("Bitte Kunde wählen.");
    if (items.length === 0) return await alertMsg("Mindestens eine Position ist erforderlich.");

    const basePayload = {
      invoiceNo: (invoiceNo || "").trim() || undefined,
      customerId,
      issueDate,
      dueDate: dueDate || null,
      discountCents: totals.discountCents,
      items: items.map((r) => ({
        productId: r.productId || null,
        name: r.name || "Position",
        quantity: Number(r.quantity || 0),
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
      if (!res || !res.ok || !js?.ok) return await alertMsg(js?.error || "Speichern fehlgeschlagen.");
      onSaved?.();
    } else {
      const payload = { ...basePayload, status: "open" }; // neu: standardmäßig offen
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);
      const js = res ? await res.json().catch(() => ({})) : null;
      if (!res || !res.ok || !js?.ok) return await alertMsg(js?.error || "Speichern fehlgeschlagen.");
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
                <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setUserEditedDueDate(true); }} style={S.input} />
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
                    <option value="canceled">storniert</option>
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
                  <th style={{ width: "10%" }}>Pos.</th>
                  <th style={{ width: "40%" }}>Produkt/Dienstleistung</th>
                  <th style={{ width: "14%" }}>Menge</th>
                  <th style={{ width: "18%" }}>Einzelpreis</th>
                  <th style={{ width: "18%" }}>Summe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => {
                  const sum = toInt(r.baseCents || 0) + Math.round(Number(r.quantity || 0) * toInt(r.unitPriceCents || 0));
                  return (
                    <tr key={r.id}>
                      <td>{idx + 1}.</td>
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
                        <input
                          type="text"
                          inputMode="decimal"
                          value={String(r.quantity ?? 1)}
                          onChange={(e) => onQty(r.id, e.target.value.replace(",", "."))}
                          style={{ ...S.input, maxWidth: "60px", textAlign: "center" }}
                        />
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

        <div className="ivx-modal-actions">
          <button className="btn-ghost" style={S.ghost} onClick={onClose}>Abbrechen</button>
          <button className="btn" style={S.btn} onClick={save}>{isEdit ? "Speichern" : "Anlegen"}</button>
        </div>
      </div>
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
