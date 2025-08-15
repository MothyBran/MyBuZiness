"use client";

import { useEffect, useMemo, useState } from "react";
import { toCents, fromCents } from "@/lib/money";

export default function RechnungenPage() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [form, setForm] = useState({
    customerId: "",
    taxRate: 19,
    currency: "EUR",
    issueDate: "",
    dueDate: "",
    note: "",
    items: [
      { productId: "", name: "", description: "", quantity: 1, unitPrice: "" }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Load base data
  useEffect(() => {
    (async () => {
      const [cs, ps, inv] = await Promise.all([
        fetch("/api/customers").then(r => r.json()).catch(() => ({data: []})),
        fetch("/api/products").then(r => r.json()).catch(() => ({data: []})),
        fetch("/api/invoices").then(r => r.json()).catch(() => ({data: []}))
      ]);
      setCustomers(cs.data || []);
      setProducts(ps.data || []);
      setInvoices(inv.data || []);
    })();
  }, []);

  async function reloadInvoices(q = "") {
    setLoading(true);
    const res = await fetch(`/api/invoices${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setInvoices(json.data || []);
    setLoading(false);
  }

  function addRow() {
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: "", name: "", description: "", quantity: 1, unitPrice: "" }]
    }));
  }

  function removeRow(idx) {
    setForm(f => {
      const arr = f.items.slice();
      arr.splice(idx, 1);
      return { ...f, items: arr.length ? arr : [{ productId: "", name: "", description: "", quantity: 1, unitPrice: "" }] };
    });
  }

  function onProductSelect(idx, pid) {
    const p = products.find(x => x.id === pid);
    setForm(f => {
      const arr = f.items.slice();
      arr[idx] = {
        ...arr[idx],
        productId: pid,
        name: p ? p.name : arr[idx].name,
        unitPrice: p ? (p.priceCents / 100).toString().replace(".", ",") : arr[idx].unitPrice
      };
      return { ...f, items: arr };
    });
  }

  const totals = useMemo(() => {
    const net = form.items.reduce((s, it) => {
      const qty = Number.parseInt(it.quantity || 1);
      const cents = toCents(it.unitPrice || 0);
      return s + qty * cents;
    }, 0);
    const tax = Math.round(net * (Number(form.taxRate || 0) / 100));
    const gross = net + tax;
    return { net, tax, gross };
  }, [form.items, form.taxRate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.customerId) return alert("Bitte einen Kunden wählen.");
    const items = form.items
      .map(it => ({
        productId: it.productId || null,
        name: (it.name || "").trim(),
        description: (it.description || "").trim(),
        quantity: Number.parseInt(it.quantity || 1),
        unitPriceCents: toCents(it.unitPrice || 0)
      }))
      .filter(it => it.name && it.quantity > 0);

    if (!items.length) return alert("Mindestens eine gültige Position angeben.");

    const payload = {
      customerId: form.customerId,
      taxRate: Number(form.taxRate || 0),
      currency: form.currency || "EUR",
      issueDate: form.issueDate || null,
      dueDate: form.dueDate || null,
      note: form.note || "",
      items
    };

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Fehler beim Erstellen.");

    // reset + reload
    setForm({
      customerId: "",
      taxRate: 19,
      currency: "EUR",
      issueDate: "",
      dueDate: "",
      note: "",
      items: [{ productId: "", name: "", description: "", quantity: 1, unitPrice: "" }]
    });
    reloadInvoices(search);
  }

  return (
    <main>
      <h1>Rechnungen</h1>
      <p style={{ marginTop: -8, color: "#666" }}>Erstelle Rechnungen aus Kunden & Produkten. (Server-gespeichert)</p>

      <section style={grid}>
        <form onSubmit={handleSubmit} style={card}>
          <strong>Neue Rechnung</strong>

          <div style={row}>
            <div style={col}>
              <label><strong>Kunde *</strong></label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                style={input}
                required
              >
                <option value="">— auswählen —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{...col, maxWidth: 140}}>
              <label><strong>Steuer %</strong></label>
              <input
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                style={input}
                inputMode="decimal"
              />
            </div>
            <div style={{...col, maxWidth: 140}}>
              <label><strong>Währung</strong></label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={input}
              >
                <option>EUR</option>
                <option>USD</option>
              </select>
            </div>
          </div>

          <div style={row}>
            <div style={col}>
              <label><strong>Rechnungsdatum</strong></label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                style={input}
              />
            </div>
            <div style={col}>
              <label><strong>Fällig bis</strong></label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                style={input}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label><strong>Notiz (optional)</strong></label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{ ...input, resize: "vertical" }}
              rows={3}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Positionen</strong>
            {form.items.map((it, idx) => (
              <div key={idx} style={{ ...row, alignItems: "end", marginTop: 8 }}>
                <div style={col}>
                  <label>Produkt</label>
                  <select
                    value={it.productId}
                    onChange={(e) => onProductSelect(idx, e.target.value)}
                    style={input}
                  >
                    <option value="">— frei —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={col}>
                  <label>Bezeichnung *</label>
                  <input
                    value={it.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm(f => {
                        const arr = f.items.slice();
                        arr[idx] = { ...arr[idx], name: v };
                        return { ...f, items: arr };
                      });
                    }}
                    style={input}
                    placeholder="z. B. Maniküre Basic"
                    required
                  />
                </div>
                <div style={{...col, maxWidth: 130}}>
                  <label>Menge</label>
                  <input
                    value={it.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm(f => {
                        const arr = f.items.slice();
                        arr[idx] = { ...arr[idx], quantity: v };
                        return { ...f, items: arr };
                      });
                    }}
                    style={input}
                    inputMode="numeric"
                  />
                </div>
                <div style={{...col, maxWidth: 160}}>
                  <label>Einzelpreis</label>
                  <input
                    value={it.unitPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm(f => {
                        const arr = f.items.slice();
                        arr[idx] = { ...arr[idx], unitPrice: v };
                        return { ...f, items: arr };
                      });
                    }}
                    style={input}
                    inputMode="decimal"
                    placeholder="z. B. 29,90"
                  />
                </div>
                <div style={{...col, maxWidth: 110}}>
                  <label>Summe</label>
                  <div style={{ padding: "10px 0" }}>
                    {fromCents(toCents(it.unitPrice || 0) * (parseInt(it.quantity || 1)), form.currency)}
                  </div>
                </div>
                <div style={{...col, maxWidth: 120}}>
                  <button type="button" onClick={() => removeRow(idx)} style={btnDanger}>Entfernen</button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={addRow} style={btnGhost}>+ Position hinzufügen</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            <div>Netto: <strong>{fromCents(totals.net, form.currency)}</strong></div>
            <div>Steuer ({form.taxRate}%): <strong>{fromCents(totals.tax, form.currency)}</strong></div>
            <div>Brutto: <strong>{fromCents(totals.gross, form.currency)}</strong></div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" style={btnPrimary}>Rechnung erstellen</button>
          </div>
        </form>

        <div style={card}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); reloadInvoices(e.target.value); }}
              placeholder="Suchen (Rechnungsnummer, Kunde)"
              style={{ ...input, maxWidth: 380 }}
            />
            <span style={{ color: "#666", fontSize: 14 }}>
              {invoices.length} Rechnung(en)
            </span>
            <button onClick={() => reloadInvoices(search)} style={btnGhost}>{loading ? "Lade..." : "Neu laden"}</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Nr.</th>
                  <th style={th}>Kunde</th>
                  <th style={th}>Datum</th>
                  <th style={th}>Brutto</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={td}>{inv.invoiceNo}</td>
                    <td style={td}>{inv.customerName}</td>
                    <td style={td}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td style={td}>{fromCents(inv.grossCents, inv.currency)}</td>
                    <td style={td}>
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...td, textAlign: "center", color: "#999" }}>Keine Rechnungen gefunden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "open");
  const style = {
    open:   { border: "1px solid #e69b00", color: "#e69b00", padding: "4px 8px", borderRadius: 8, fontSize: 12 },
    paid:   { border: "1px solid #2e7d32", color: "#2e7d32", padding: "4px 8px", borderRadius: 8, fontSize: 12 },
    canceled: { border: "1px solid #b00020", color: "#b00020", padding: "4px 8px", borderRadius: 8, fontSize: 12 }
  }[s] || {};
  return <span style={style}>{s}</span>;
}

const grid = { display: "grid", gap: 16, gridTemplateColumns: "1fr", marginTop: 24 };
const card = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 };
const row = { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" };
const col = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", outline: "none" };
const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: "10px 8px", fontSize: 13, color: "#555" };
const td = { borderBottom: "1px solid #f2f2f2", padding: "10px 8px", fontSize: 14 };
const btnPrimary = { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" };
const btnGhost = { padding: "8px 10px", borderRadius: 8, border: "1px solid #111", background: "transparent", color: "#111", cursor: "pointer" };
const btnDanger = { padding: "8px 10px", borderRadius: 8, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" };
