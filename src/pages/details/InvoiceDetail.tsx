// src/pages/details/InvoiceDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteInvoice, getCustomers, getInvoice, updateInvoice } from "../../utils/api";
import { Customer, Invoice, InvoiceItem } from "../../utils/types";
import { centsToMoney, displayInvoiceNo } from "../../utils/format";

export default function InvoiceDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [model, setModel] = useState<(Invoice & { items: InvoiceItem[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [custMap, setCustMap] = useState<Record<string, Customer>>({});

  useEffect(() => {
    getInvoice(id).then(setModel);
    getCustomers().then(cs => {
      const m: Record<string, Customer> = {};
      cs.forEach(c => { if (c.id) m[c.id] = c; });
      setCustMap(m);
    });
  }, [id]);

  const customerName = useMemo(() => model?.customerId ? (custMap[model.customerId]?.name || model.customerId) : "—", [model, custMap]);

  const save = async () => {
    if (!model) return;
    setBusy(true);
    try {
      await updateInvoice(id, {
        issueDate: model.issueDate,
        dueDate: model.dueDate,
        status: model.status,
        note: model.note
      });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Rechnung wirklich löschen?")) return;
    await deleteInvoice(id);
    nav("/invoices");
  };

  if (!model) return <div className="card"><div className="card__content">Lade…</div></div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Rechnung – {displayInvoiceNo(model, 0)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={save} disabled={busy}>{busy ? "Speichern…" : "Speichern"}</button>
            <button className="btn btn--ghost" onClick={() => nav(-1)}>Zurück</button>
            <button className="btn btn--ghost" onClick={remove}>🗑️ Löschen</button>
          </div>
        </div>
        <div className="card__content">
          <div className="form-grid">
            <div className="form-col-3">
              <label className="label">Ausgestellt</label>
              <input className="input" type="date" value={model.issueDate || ""} onChange={e => setModel({ ...model, issueDate: e.target.value })} /> {/* Invoice.issueDate  */}
            </div>
            <div className="form-col-3">
              <label className="label">Fällig</label>
              <input className="input" type="date" value={model.dueDate || ""} onChange={e => setModel({ ...model, dueDate: e.target.value })} /> {/* Invoice.dueDate  */}
            </div>
            <div className="form-col-3">
              <label className="label">Status</label>
              <input className="input" value={model.status || ""} onChange={e => setModel({ ...model, status: e.target.value })} /> {/* Invoice.status  */}
            </div>
            <div className="form-col-3">
              <label className="label">Währung</label>
              <input className="input" value={model.currency || "EUR"} onChange={e => setModel({ ...model, currency: e.target.value })} /> {/* Invoice.currency  */}
            </div>
            <div className="form-col-12">
              <label className="label">Kunde</label>
              <input className="input" value={customerName} readOnly />
            </div>
            <div className="form-col-12">
              <label className="label">Notiz</label>
              <textarea className="input" rows={3} value={model.note || ""} onChange={e => setModel({ ...model, note: e.target.value })} /> {/* Invoice.note  */}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge">Netto: {centsToMoney(model.netCents ?? 0, model.currency || "EUR")}</span> {/* Invoice.netCents  */}
            <span className="badge">Steuer: {centsToMoney(model.taxCents ?? 0, model.currency || "EUR")}</span> {/* Invoice.taxCents  */}
            <span className="badge badge--ok">Gesamt: {centsToMoney(model.grossCents ?? 0, model.currency || "EUR")}</span> {/* Invoice.grossCents  */}
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
                  <td className="truncate">{it.name}</td> {/* InvoiceItem.name  */}
                  <td className="cell--num">{it.quantity}</td> {/* InvoiceItem.quantity  */}
                  <td className="cell--num">{centsToMoney(it.unitPriceCents ?? 0, model.currency || "EUR")}</td> {/* InvoiceItem.unitPriceCents  */}
                  <td className="cell--num">{centsToMoney(it.lineTotalCents ?? 0, model.currency || "EUR")}</td> {/* InvoiceItem.lineTotalCents  */}
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
