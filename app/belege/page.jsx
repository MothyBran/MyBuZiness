"use client";
import { useEffect, useMemo, useState } from "react";

// Hilfsfunktionen
function toCents(v) {
  if (!v) return 0;
  const str = String(v).replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  return Math.round((Number.isFinite(num) ? num : 0) * 100);
}
function currency(cents, code = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: code,
  }).format((cents || 0) / 100);
}
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 13, opacity: 0.75 }}>{label}</span>
      {children}
    </label>
  );
}

// --------- Hauptseite Belege ---------
export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const [rj, cj, pj] = await Promise.all([
      fetch("/api/receipts").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/customers").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/products").then(r => r.json()).catch(() => ({ data: [] })),
    ]);

    setReceipts(rj.data || []);
    setCustomers(cj.data || []);

    const mappedProducts = (pj?.data || []).map(p => ({
      id: p.id,
      name: p.name,
      priceCents: Number.isFinite(p.priceCents) ? p.priceCents : 0,
      currency: p.currency || "EUR",
    }));
    setProducts(mappedProducts);

    if (mappedProducts.length > 0) setCurrencyCode(mappedProducts[0].currency);
  }
  useEffect(() => { load(); }, []);

  async function onCreate(form) {
    form.preventDefault();
    const fd = new FormData(form.target);
    const js = Object.fromEntries(fd.entries());
    js.items = JSON.parse(js.items || "[]");

    await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(js),
    });

    setShowNew(false);
    await load();
  }

  return (
    <div className="page">
      <h1>Belege</h1>
      <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Neuer Beleg</button>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Datum</th>
              <th>Kunde</th>
              <th>Betrag</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map(r => (
              <tr key={r.id}>
                <td>{r.receiptNo}</td>
                <td>{r.date}</td>
                <td>{r.customer?.name || "–"}</td>
                <td>{currency(r.totalCents, r.currency || "EUR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewReceiptSheet
          currencyCode={currencyCode}
          products={products}
          customers={customers}
          onClose={() => setShowNew(false)}
          onSubmit={onCreate}
        />
      )}
    </div>
  );
}

// --------- Modal für neuen Beleg ---------
function NewReceiptSheet({ currencyCode, products, customers, onClose, onSubmit }) {
  const [receiptNo, setReceiptNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");

  const [localProducts, setLocalProducts] = useState(Array.isArray(products) ? products : []);
  useEffect(() => {
    let ignore = false;
    async function ensureProducts() {
      if (Array.isArray(products) && products.length > 0) {
        setLocalProducts(products);
        return;
      }
      const res = await fetch("/api/products", { cache: "no-store" });
      const js = await res.json().catch(() => ({ data: [] }));
      const mapped = (js.data || []).map(p => ({
        id: p.id,
        name: p.name,
        priceCents: Number.isFinite(p.priceCents) ? p.priceCents : 0,
        currency: p.currency || "EUR",
      }));
      if (!ignore) setLocalProducts(mapped);
    }
    ensureProducts();
    return () => { ignore = true; };
  }, [products]);

  const [items, setItems] = useState([
    { id: crypto.randomUUID(), productId: "", name: "", quantity: 1, unitPrice: "" },
  ]);

  const itemsTotal = useMemo(
    () => items.reduce((s, it) => s + toCents(it.unitPrice || 0) * Number(it.quantity || 0), 0),
    [items]
  );
  const discountCents = toCents(discount || 0);
  const gross = Math.max(0, itemsTotal - discountCents);

  function addRow() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), productId: "", name: "", quantity: 1, unitPrice: "" }]);
  }
  function updateRow(id, patch) {
    setItems(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function removeRow(id) { setItems(prev => prev.filter(r => r.id !== id)); }
  function onPickProduct(rowId, productId) {
    const p = localProducts.find(x => x.id === productId);
    if (!p) return updateRow(rowId, { productId: "", name: "", unitPrice: "" });
    updateRow(rowId, {
      productId,
      name: p.name,
      unitPrice: (p.priceCents / 100).toString().replace(".", ","),
    });
  }

  return (
    <div className="surface" style={modalWrap}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <b>Neuen Beleg erfassen</b>
        <button onClick={onClose} className="btn-ghost">×</button>
      </div>

      <form
        onSubmit={(e) => {
          const hidden = document.querySelector("#new-receipt-items");
          hidden.value = JSON.stringify(items.map(({ id, ...rest }) => rest));
          onSubmit(e);
        }}
        style={{ display: "grid", gap: 12 }}
      >
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <Field label="Nr.">
            <input style={input} name="receiptNo" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
          </Field>
          <Field label="Datum">
            <input type="date" style={input} name="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Kunde (optional)">
            <select style={input} name="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">– kein Kunde –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Menge</th>
                <th>Einzelpreis</th>
                <th>Summe</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const qty = Number(r.quantity || 0);
                const upCents = toCents(r.unitPrice || 0);
                const line = qty * upCents;
                return (
                  <tr key={r.id}>
                    <td>
                      <select value={r.productId} onChange={(e) => onPickProduct(r.id, e.target.value)} style={input}>
                        <option value="">– auswählen –</option>
                        {localProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={r.quantity}
                        onChange={(e) => updateRow(r.id, { quantity: parseInt(e.target.value || "1", 10) })}
                        style={input}
                        inputMode="numeric"
                      />
                    </td>
                    <td>{currency(upCents, currencyCode)}</td>
                    <td>{currency(line, currencyCode)}</td>
                    <td><button type="button" onClick={() => removeRow(r.id)} style={btnDanger}>X</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
        </div>

        <Field label="Rabatt">
          <input name="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} style={input} />
        </Field>

        <div style={{ fontWeight: 700, textAlign: "right" }}>Gesamt: {currency(gross, currencyCode)}</div>

        <input type="hidden" id="new-receipt-items" name="items" />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={btnGhost}>Abbrechen</button>
          <button type="submit" style={btnPrimary}>Speichern</button>
        </div>
      </form>
    </div>
  );
}

// --------- Styles ---------
const input = { padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4 };
const btnPrimary = { background: "#0aa", color: "#fff", padding: "6px 12px", borderRadius: 4 };
const btnGhost = { background: "#eee", padding: "6px 12px", borderRadius: 4 };
const btnDanger = { background: "#c33", color: "#fff", padding: "4px 8px", borderRadius: 4 };
const modalWrap = { position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", background: "#fff", padding: 20, borderRadius: 8, zIndex: 1000, width: "90%", maxWidth: 800 };
