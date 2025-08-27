// app/belege/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ───────── Helpers ───────── */
const toInt = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; };
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
function fmtDEDate(input) {
  if (!input) return "—";
  const d = new Date(input);
  return isNaN(d) ? "—" : d.toLocaleDateString("de-DE");
}
async function safeGet(url, fallback) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return fallback;
    const js = await r.json().catch(() => fallback);
    return js ?? fallback;
  } catch {
    return fallback;
  }
}
function unpack(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.rows)) return resp.rows;
  if (Array.isArray(resp?.data?.rows)) return resp.data.rows;
  return [];
}

/* ───────── Page ───────── */
export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [settings, setSettings] = useState(null);
  const currency = settings?.currency || "EUR";

  // Modal: Neu/Bearbeiten – (falls du das später wieder aktivierst)
  const [isOpen, setIsOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [listRes, setRes] = await Promise.all([
        safeGet("/api/receipts?limit=500", []),
        safeGet("/api/settings", {})
      ]);
      setRows(unpack(listRes));
      setSettings(setRes?.data || setRes || null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function toggleExpand(id) { setExpandedId((p) => (p === id ? null : id)); }

  async function deleteReceipt(id) {
    if (!confirm("Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) { alert("Löschen fehlgeschlagen."); return; }
    if (expandedId === id) setExpandedId(null);
    load();
  }

  return (
    <main className="ivx-page">
      {/* Kopf */}
      <div className="card">
        <div className="ivx-head">
          <h1 className="page-title" style={{ margin: 0 }}>Belege</h1>
          <button className="btn" onClick={() => { setEditRow(null); setIsOpen(true); }}>+ Neuer Beleg</button>
        </div>
      </div>

      {/* Tabelle – NUR diese Card darf horizontal scrollen (wie im Rechnungsmodul) */}
      <div className="card table-card">
        <div className="table-wrap">
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Datum</th>
                <th style={{ textAlign: "right" }}>Betrag</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="muted">Lade…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={3} className="muted">Keine Belege vorhanden.</td></tr>
              )}

              {!loading && rows.map((r) => {
                const isOpen = expandedId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="row-clickable" onClick={() => r.id && toggleExpand(r.id)}>
                      <td className="ellipsis">#{r.receiptNo || "—"}</td>
                      <td>{fmtDEDate(r.date)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {money(r.grossCents ?? r.totalCents ?? r.amountCents, r.currency || currency)}
                      </td>
                    </tr>

                    {isOpen && r.id && (
                      <tr>
                        <td colSpan={3} className="details-cell">
                          <div className="detail-head">
                            <div>
                              <div className="muted">Beleg</div>
                              <div className="h5">#{r.receiptNo || "—"}</div>
                              {r.note && <div className="muted">Notiz: <strong>{r.note}</strong></div>}
                            </div>
                            <div className="actions">
                              <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setEditRow(r); setIsOpen(true); }}>✏️ Bearbeiten</button>
                              <button className="btn-ghost danger" onClick={(e) => { e.stopPropagation(); deleteReceipt(r.id); }}>❌ Löschen</button>
                            </div>
                          </div>

                          {/* Summen */}
                          <div className="totals">
                            Netto: {money(r.netCents, r.currency || currency)} · USt: {money(r.taxCents, r.currency || currency)} · Gesamt: {money(r.grossCents ?? r.totalCents ?? r.amountCents, r.currency || currency)}
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

      {/* (Optional) Modal – hier nur Platzhalter, falls du die vorhandene Modal-Implementierung schon hast */}
      {isOpen && (
        <div className="ivx-modal" role="dialog" aria-modal="true" onClick={(e)=>{ if(e.target===e.currentTarget) setIsOpen(false); }}>
          <div className="ivx-modal-box" onClick={(e)=>e.stopPropagation()}>
            <div className="ivx-modal-head">
              <h2>{editRow ? "Beleg bearbeiten" : "Neuer Beleg"}</h2>
              <button className="btn-ghost" onClick={()=>setIsOpen(false)}>Schließen</button>
            </div>
            {/* 👉 Binde hier deine bestehende Beleg-Form ein (unverändert lassen) */}
            <div style={{ padding: 16, color: "#6b7280" }}>
              <em>Formular ist bereits vorhanden – hier einfügen/weiterverwenden.</em>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ivx-page{ overflow-x:hidden; }
        .card{ background:#fff; border:1px solid #eee; border-radius:14px; padding:16px }
        .ivx-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280 }
        .h5{ font-size:16px; font-weight:800 }
        .row-clickable{ cursor:pointer }
        .ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

        /* NUR diese Card darf horizontal scrollen (wie im Rechnungsmodul) */
        .card.table-card .table-wrap{ overflow-x:auto }

        .table{ width:100%; border-collapse:collapse; min-width:560px }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }

        .details-cell{ background:#fafafa }
        .detail-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px }
        .actions{ display:flex; gap:8px; flex-wrap:wrap }
        .actions .danger{ color:#c00; border-color:#c00 }
        .totals{ text-align:right; padding:6px 8px 10px; font-weight:800 }

        /* Modal-Container (wie im Rechnungsmodul gehalten) */
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
          overflow-y: auto; overflow-x: hidden;
        }
        .ivx-modal-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 16px; border-bottom: 1px solid #eee;
          position: sticky; top: 0; background:#fff; z-index: 1;
        }

        .btn{ padding:10px 12px; border-radius:12px; background:var(--color-primary,#0aa); color:#fff; border:1px solid transparent; cursor:pointer }
        .btn-ghost{ padding:10px 12px; border-radius:12px; background:#fff; color:var(--color-primary,#0aa); border:1px solid var(--color-primary,#0aa); cursor:pointer }
      `}</style>
    </main>
  );
}
