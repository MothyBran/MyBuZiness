// src/pages/details/CustomerDetail.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteCustomer, getCustomer, getInvoices, getReceipts, updateCustomer } from "../../utils/api";
import { Customer, Invoice, Receipt } from "../../utils/types";
import { centsToMoney } from "../../utils/format";

export default function CustomerDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [model, setModel] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    getCustomer(id).then(setModel);
    // Lade Dokumente zu Kunde
    Promise.all([getInvoices(), getReceipts()]).then(([invs, recs]) => {
      setInvoices(invs.filter(i => i.customerId === id));   // Invoice.customerId 
      setReceipts(recs.filter(r => (r as any).customerId === id)); // Nur falls Beleg Kunde enthält (optional)
    });
  }, [id]);

  const save = async () => {
    if (!model) return;
    setBusy(true);
    try { await updateCustomer(id, model); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Kunden wirklich löschen?")) return;
    await deleteCustomer(id);
    nav("/customers");
  };

  if (!model) return <div className="card"><div className="card__content">Lade…</div></div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Kunde – {model.name}</div> {/* Customer.name  */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={save} disabled={busy}>{busy ? "Speichern…" : "Speichern"}</button>
            <button className="btn btn--ghost" onClick={() => nav(-1)}>Zurück</button>
            <button className="btn btn--ghost" onClick={remove}>🗑️ Löschen</button>
          </div>
        </div>
        <div className="card__content">
          <div className="form-grid">
            <div className="form-col-6">
              <label className="label">Name</label>
              <input className="input" value={model.name || ""} onChange={e => setModel({ ...model, name: e.target.value })} />
            </div>
            <div className="form-col-6">
              <label className="label">E‑Mail</label>
              <input className="input" value={model.email || ""} onChange={e => setModel({ ...model, email: e.target.value })} />
            </div>
            <div className="form-col-4">
              <label className="label">Telefon</label>
              <input className="input" value={model.phone || ""} onChange={e => setModel({ ...model, phone: e.target.value })} />
            </div>
            <div className="form-col-8">
              <label className="label">Notiz</label>
              <input className="input" value={model.note || ""} onChange={e => setModel({ ...model, note: e.target.value })} />
            </div>
            <div className="form-col-6">
              <label className="label">Straße</label>
              <input className="input" value={model.addressStreet || ""} onChange={e => setModel({ ...model, addressStreet: e.target.value })} />
            </div>
            <div className="form-col-2">
              <label className="label">PLZ</label>
              <input className="input" value={model.addressZip || ""} onChange={e => setModel({ ...model, addressZip: e.target.value })} />
            </div>
            <div className="form-col-4">
              <label className="label">Ort</label>
              <input className="input" value={model.addressCity || ""} onChange={e => setModel({ ...model, addressCity: e.target.value })} />
            </div>
            <div className="form-col-4">
              <label className="label">Land</label>
              <input className="input" value={model.addressCountry || ""} onChange={e => setModel({ ...model, addressCountry: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Verknüpfte Dokumente */}
      <div className="card">
        <div className="card__header"><div className="card__title">Rechnungen</div></div>
        <div className="card__content" style={{ overflowX: "auto" }}>
          <table className="table table--compact">
            <thead><tr><th>Nr.</th><th>Datum</th><th>Gesamt</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map(i => (
                <tr key={i.id} onClick={() => nav(`/invoices/${i.id}`)} style={{ cursor: "pointer" }}>
                  <td className="truncate">{i.invoiceNo}</td> {/* Invoice.invoiceNo  */}
                  <td>{i.issueDate}</td>                       {/* Invoice.issueDate  */}
                  <td className="cell--num">{centsToMoney(i.grossCents ?? 0, i.currency || "EUR")}</td> {/* Invoice.grossCents,currency  */}
                  <td className="truncate">{i.status || "—"}</td> {/* Invoice.status  */}
                </tr>
              ))}
              {invoices.length === 0 ? <tr><td colSpan={4} style={{ padding: 12 }}>Keine Rechnungen.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card__header"><div className="card__title">Belege</div></div>
        <div className="card__content" style={{ overflowX: "auto" }}>
          <table className="table table--compact">
            <thead><tr><th>Nr.</th><th>Datum</th><th>Gesamt</th><th>Notiz</th></tr></thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id} onClick={() => nav(`/receipts/${r.id}`)} style={{ cursor: "pointer" }}>
                  <td className="truncate">{r.receiptNo}</td> {/* Receipt.receiptNo  */}
                  <td>{r.date}</td>                           {/* Receipt.date  */}
                  <td className="cell--num">{centsToMoney(r.grossCents ?? 0, r.currency || "EUR")}</td> {/* Receipt.grossCents,currency  */}
                  <td className="truncate">{r.note || "—"}</td> {/* Receipt.note  */}
                </tr>
              ))}
              {receipts.length === 0 ? <tr><td colSpan={4} style={{ padding: 12 }}>Keine Belege.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
