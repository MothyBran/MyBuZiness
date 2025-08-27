// app/belege/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ───────── Helpers (nur vorhandene DB-Spalten genutzt) ───────── */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
function fmtDEDate(input) {
  if (!input) return "—";
  const d = new Date(input);
  return isNaN(d) ? "—" : d.toLocaleDateString("de-DE");
}
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
/** akzeptiert Array | {data:Array} | {rows:Array} | {data:{rows:Array}} */
function unpackList(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.rows)) return resp.rows;
  if (Array.isArray(resp?.data?.rows)) return resp.data.rows;
  return [];
}
/** Auf deine DB-Spalten gemappt */
function normalizeReceipt(r) {
  return {
    id: r.id || r.ID || r.Id || null,
    receiptNo: r.receiptNo || "—",
    date: r.date || r.createdAt || null,
    currency: r.currency || "EUR",
    netCents: toInt(r.netCents ?? 0),
    taxCents: toInt(r.taxCents ?? 0),
    grossCents: toInt(r.grossCents ?? 0),
    discountCents: toInt(r.discountCents ?? 0),
    vatExempt: !!r.vatExempt,
    note: r.note || "",
    createdAt: r.createdAt || null,
    updatedAt: r.updatedAt || null,
  };
}

/* ───────── Page ───────── */
export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);          // nur Kopf-Daten (Liste)
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [expandedId, setExpandedId] = useState(null);

  // Details-Cache: { [id]: { loading, err, data } }
  const [details, setDetails] = useState({});

  // Settings nur für currency-Fallback (falls Eintrag keine currency hat)
  const [settings, setSettings] = useState(null);
  const defaultCurrency = settings?.currency || "EUR";

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadErr("");
      try {
        // 1) Belege holen (mit robustem Unpack)
        let listJs;
        try {
          listJs = await fetchJson("/api/receipts?limit=500");
        } catch {
          // Fallback ohne Param
          listJs = await fetchJson("/api/receipts");
        }
        const list = unpackList(listJs).map(normalizeReceipt);
        setRows(Array.isArray(list) ? list : []);

        // 2) Settings holen (nur Currency-Fallback)
        try {
          const s = await fetchJson("/api/settings");
          setSettings(s?.data || s || null);
        } catch {
          setSettings(null);
        }
      } catch (e) {
        setLoadErr(String(e?.message || e || "Fehler"));
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleExpand(id) {
    setExpandedId((p) => (p === id ? null : id));
    if (!id) return;
    // Details nachladen, wenn noch nicht vorhanden
    setDetails((prev) => {
      if (prev[id]) return prev; // bereits geladen / lädt
      return { ...prev, [id]: { loading: true, err: "", data: null } };
    });
    loadDetail(id);
  }

  async function loadDetail(id) {
    try {
      const js = await fetchJson(`/api/receipts/${id}`);
      // Erwartet { ok:true, data:{...} } – falls es anders ist, nimm js selbst
      const data = js?.data ? js.data : js;
      setDetails((prev) => ({ ...prev, [id]: { loading: false, err: "", data } }));
    } catch (e) {
      setDetails((prev) => ({ ...prev, [id]: { loading: false, err: String(e?.message || e), data: null } }));
    }
  }

  async function deleteReceipt(id) {
    if (!confirm("Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      alert("Löschen fehlgeschlagen.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setExpandedId((p) => (p === id ? null : p));
    setDetails((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }

  return (
    <main className="ivx-page">
      {/* Kopf */}
      <div className="card">
        <div className="ivx-head">
          <h1 className="page-title" style={{ margin: 0 }}>Belege</h1>
          {/* Wenn du ein Modal für "+ Neuer Beleg" hast, hier öffnen */}
          <a className="btn" href="/belege/neu">+ Neuer Beleg</a>
        </div>
      </div>

      {/* Fehler-Hinweis */}
      {loadErr && (
        <div className="card" style={{ color: "#b91c1c", fontWeight: 600 }}>
          Fehler beim Laden: {loadErr}
        </div>
      )}

      {/* Tabelle – NUR diese Card ist horizontal scrollbar (wie bei Rechnungen) */}
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

              {!loading && rows.map((r, idx) => {
                const isOpen = expandedId === r.id;
                const curr = r.currency || defaultCurrency;
                return (
                  <React.Fragment key={r.id || idx}>
                    <tr className="row-clickable" onClick={() => r.id && toggleExpand(r.id)}>
                      <td className="ellipsis">#{r.receiptNo || "—"}</td>
                      <td>{fmtDEDate(r.date)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(r.grossCents, curr)}</td>
                    </tr>

                    {isOpen && r.id && (
                      <tr>
                        <td colSpan={3} className="details-cell">
                          <RowDetails
                            id={r.id}
                            header={r}
                            details={details[r.id] || { loading: true, err: "", data: null }}
                            defaultCurrency={curr}
                            onEditHref={`/belege/${r.id}/bearbeiten`}
                            onDelete={() => deleteReceipt(r.id)}
                          />
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

      <style jsx global>{`
        .ivx-page{ overflow-x:hidden; }
        .card{ background:#fff; border:1px solid #eee; border-radius:14px; padding:16px }
        .ivx-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap }
        .muted{ color:#6b7280 }
        .h5{ font-size:16px; font-weight:800 }
        .row-clickable{ cursor:pointer }
        .ellipsis{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

        /* NUR diese Card darf horizontal scrollen (wie bei Rechnungen) */
        .card.table-card .table-wrap{ overflow-x:auto }

        .table{ width:100%; border-collapse:collapse; min-width:560px }
        .table th,.table td{ border-bottom:1px solid #eee; padding:10px; vertical-align:middle }
        .table-fixed{ table-layout:fixed }

        .details-cell{ background:#fafafa }
        .detail-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0 6px }
        .actions{ display:flex; gap:8px; flex-wrap:wrap }
        .actions .danger{ color:#c00; border-color:#c00 }
        .totals{ text-align:right; padding:8px 0 6px; font-weight:800 }

        .btn{ padding:10px 12px; border-radius:12px; background:var(--color-primary,#0aa); color:#fff; border:1px solid transparent; cursor:pointer; text-decoration:none; display:inline-block }
        .btn-ghost{ padding:10px 12px; border-radius:12px; background:#fff; color:var(--color-primary,#0aa); border:1px solid var(--color-primary,#0aa); cursor:pointer }
      `}</style>
    </main>
  );
}

/* ───────── Detailzeile (lädt Items nur wenn vorhanden) ───────── */
function RowDetails({ id, header, details, defaultCurrency, onEditHref, onDelete }) {
  const curr = header.currency || defaultCurrency || "EUR";
  const loading = details?.loading;
  const err = details?.err || "";
  const data = details?.data || null;

  // Wenn keine Items vom Backend geliefert werden, zeigen wir trotzdem Summen + Notiz
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div>
      <div className="detail-head">
        <div>
          <div className="muted">Beleg</div>
          <div className="h5">#{header.receiptNo || "—"}</div>
          {!!(header.note || data?.note) && (
            <div className="muted">Notiz: <strong>{header.note || data?.note}</strong></div>
          )}
        </div>
        <div className="actions">
          <a className="btn-ghost" href={onEditHref}>✏️ Bearbeiten</a>
          <button className="btn-ghost danger" onClick={onDelete}>❌ Löschen</button>
        </div>
      </div>

      {loading && <div className="muted" style={{ padding: "6px 0" }}>Details laden…</div>}
      {err && !loading && <div style={{ color:"#b91c1c", padding:"6px 0" }}>Fehler: {err}</div>}

      {/* Positionsliste nur, wenn vom Backend geliefert */}
      {(!loading && !err && items.length > 0) && (
        <div className="table-wrap positions">
          <table className="table table-fixed" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ width:"50%" }}>Bezeichnung</th>
                <th style={{ width:"10%" }}>Menge</th>
                <th style={{ width:"20%" }}>Einzelpreis</th>
                <th style={{ width:"20%" }}>Summe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const qty = toInt(it.quantity || 0);
                const unit = toInt(it.unitPriceCents || 0);
                const line = toInt(it.lineTotalCents ?? (qty * unit));
                return (
                  <tr key={i}>
                    <td className="ellipsis">{it.name || "—"}</td>
                    <td>{qty}</td>
                    <td>{money(unit, curr)}</td>
                    <td>{money(line, curr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summen immer anzeigen (aus Kopf), unabhängig von Items/Kunde */}
      <div className="totals">
        Netto: {money(header.netCents, curr)} · USt: {money(header.taxCents, curr)} · Gesamt: {money(header.grossCents, curr)}
      </div>
    </div>
  );
}
