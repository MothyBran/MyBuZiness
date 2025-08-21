// src/pages/details/ReceiptDetail.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteReceipt, getReceipt, updateReceipt } from "../../utils/api";
import { Receipt, ReceiptItem } from "../../utils/types";
import { centsToMoney, displayReceiptNo } from "../../utils/format";

export default function ReceiptDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [model, setModel] = useState<(Receipt & { items: ReceiptItem[] }) | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getReceipt(id).then(setModel); }, [id]);

  const save = async () => {
    if (!model) return;
    setBusy(true);
    try {
      await updateReceipt(id, {
        date: model.date,
        currency: model.currency,
        note: model.note
      });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Beleg wirklich löschen?")) return;
    await deleteReceipt(id);
    nav("/receipts");
  };

  if (!model) return <div className="card"><div className="card__content">Lade…</div></div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Beleg – {displayReceiptNo(model, 0)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={save} disabled={busy}>{busy ? "Speichern…" : "Speichern"}</button>
            <button className="btn btn--ghost" onClick={() => nav(-1)}>Zurück</button>
            <button className="btn btn--ghost" onClick={remove}>🗑️ Löschen</button>
          </div>
        </div>
        <div className="card__content">
          <div className="form-grid">
            <div className="form-col-3">
              <label className="label">Datum</label>
              <input className="input" type="date" value={model.date || ""} onChange={e => setModel({ ...model, date: e.target.value })} /> {/* Receipt.date  */}
            </div>
            <div className="form-col-3">
              <label className="label">Währung</label>
              <input className="input" value={model.currency || "EUR"} onChange={e => setModel({ ...model, currency: e.target.value })} /> {/* Receipt.currency  */}
            </div>
            <div className="form-col-3">
              <label className="label">USt‑befreit?</label>
              <input className="input" value={String(model.vatExempt ?? "")} readOnly /> {/* Receipt.vatExempt  */}
            </div>
            <div className="form-col-3">
              <label className="label">Rabatt (ct)</label>
              <input className="input" value={String(model.discountCents ?? 0)} readOnly /> {/* Receipt.discountCents  */}
            </div>
            <div className="form-col-12">
              <label className="label">Notiz</label>
              <textarea className="input" rows={3} value={model.note || ""} onChange={e => setModel({ ...model, note: e.target.value })} /> {/* Receipt.note  */}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge">Netto: {centsToMoney(model.netCents ?? 0, model.currency || "EUR")}</span> {/* Receipt.netCents  */}
            <span className="badge">Steuer: {centsToMoney(model.taxCents ?? 0, model.currency || "EUR")}</span> {/* Receipt.taxCents  */}
            <span className="badge badge--ok">Gesamt: {centsToMoney(model.grossCents ?? 0, model.currency || "EUR")}</span> {/* Receipt.grossCents  */}
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div className="card">
        <div className="card__header"><div className="card__title">Positionen</div></div>
        <div className="card__content" style={{ overflowX: "auto" }}>
          <table className="table table--compact">
            <thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einzelpreis</th><th>Summe</th></tr></thead>
            <tbody>
              {model.items?.map(it => (
                <tr key={it.id}>
                  <td className="truncate">{it.name}</td> {/* ReceiptItem.name  */}
                  <td className="cell--num">{it.quantity}</td> {/* ReceiptItem.quantity  */}
                  <td className="cell--num">{centsToMoney(it.unitPriceCents ?? 0, model.currency || "EUR")}</td> {/* ReceiptItem.unitPriceCents  */}
                  <td className="cell--num">{centsToMoney(it.lineTotalCents ?? 0, model.currency || "EUR")}</td> {/* ReceiptItem.lineTotalCents  */}
                </tr>
              ))}
              {(!model.items || model.items.length === 0) ? <tr><td colSpan={4} style={{ padding: 12 }}>Keine Positionen.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
