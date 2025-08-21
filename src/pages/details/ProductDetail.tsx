// src/pages/details/ProductDetail.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteProduct, getProduct, updateProduct } from "../../utils/api";
import { Product } from "../../utils/types";
import { centsToMoney } from "../../utils/format";

export default function ProductDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [model, setModel] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getProduct(id).then(setModel); }, [id]);

  const save = async () => {
    if (!model) return;
    setBusy(true);
    try { await updateProduct(id, model); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await deleteProduct(id);
    nav("/products");
  };

  if (!model) return <div className="card"><div className="card__content">Lade…</div></div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Produkt/Dienstleistung – {model.name}</div> {/* Product.name  */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={save} disabled={busy}>{busy ? "Speichern…" : "Speichern"}</button>
            <button className="btn btn--ghost" onClick={() => nav(-1)}>Zurück</button>
            <button className="btn btn--ghost" onClick={remove}>🗑️ Löschen</button>
          </div>
        </div>
        <div className="card__content">
          <div className="form-grid">
            <div className="form-col-6">
              <label className="label">Bezeichnung</label>
              <input className="input" value={model.name || ""} onChange={e => setModel({ ...model, name: e.target.value })} />
            </div>
            <div className="form-col-3">
              <label className="label">Nr. (Kategorie/Code)</label>
              <input className="input" value={model.categoryCode || ""} onChange={e => setModel({ ...model, categoryCode: e.target.value })} />
            </div>
            <div className="form-col-3">
              <label className="label">Art</label>
              <input className="input" value={model.kind || ""} onChange={e => setModel({ ...model, kind: e.target.value })} />
            </div>
            <div className="form-col-3">
              <label className="label">Preis (ct)</label>
              <input className="input" type="number" value={Number(model.priceCents ?? 0)} onChange={e => setModel({ ...model, priceCents: Number(e.target.value) })} />
            </div>
            <div className="form-col-3">
              <label className="label">Währung</label>
              <input className="input" value={model.currency || "EUR"} onChange={e => setModel({ ...model, currency: e.target.value })} />
            </div>
            <div className="form-col-6">
              <label className="label">Beschreibung</label>
              <textarea className="input" rows={3} value={model.description || ""} onChange={e => setModel({ ...model, description: e.target.value })}/>
            </div>
          </div>
          <div style={{ marginTop: 12 }}><span className="badge">Vorschau: {centsToMoney(model.priceCents ?? 0, model.currency || "EUR")}</span></div>
        </div>
      </div>
    </div>
  );
}
