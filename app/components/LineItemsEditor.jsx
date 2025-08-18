"use client";

import { useEffect, useMemo, useState } from "react";
import { toCents, fromCents } from "@/lib/money";

export default function LineItemsEditor({
  currency = "EUR",
  value = [],
  onChange,
  allowFreeText = true,      // freie Positionen ohne Produkt-ID
}) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/products");
      const json = await res.json().catch(() => ({ data: [] }));
      setProducts(json.data || []);
    })();
  }, []);

  const rows = value;
  const setRows = (next) => onChange?.(next);

  function addRow() {
    setRows([
      ...rows,
      { id: crypto.randomUUID(), productId: null, name: "", quantity: 1, unitPrice: "", currency }
    ]);
  }
  function removeRow(id) {
    setRows(rows.filter(r => r.id !== id));
  }
  function updateRow(id, patch) {
    setRows(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  function pickProduct(id, rowId) {
    if (!id) {
      updateRow(rowId, { productId: null });
      return;
    }
    const p = products.find(x => x.id === id);
    if (!p) return;
    updateRow(rowId, {
      productId: p.id,
      name: p.name,
      unitPrice: (p.priceCents / 100).toString().replace(".", ","),
      currency: p.currency || currency,
    });
  }

  const totals = useMemo(() => {
    const sum = rows.reduce((acc, r) => {
      const qty = Number(r.quantity || 0);
      const up = toCents(r.unitPrice || 0);
      return acc + qty * up;
    }, 0);
    return { itemsTotalCents: sum };
  }, [rows]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Produkt</th>
              <th style={th}>Bezeichnung</th>
              <th style={th}>Menge</th>
              <th style={th}>Einzelpreis</th>
              <th style={th}>Summe</th>
              <th style={{ ...th, textAlign: "right" }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const qty = Number(r.quantity || 0);
              const upCents = toCents(r.unitPrice || 0);
              const lineTotal = qty * upCents;
              return (
                <tr key={r.id}>
                  <td style={td}>
                    <select
                      value={r.productId || ""}
                      onChange={(e) => pickProduct(e.target.value || null, r.id)}
                      style={input}
                    >
                      <option value="">(frei wählen)</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.kind === "product" ? "🧩" : "🛠️"} {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <input
                      value={r.name || ""}
                      onChange={(e) => updateRow(r.id, { name: e.target.value })}
                      style={input}
                      placeholder="Freitext / Positionsname"
                      disabled={!allowFreeText && !r.productId}
                    />
                  </td>
                  <td style={td}>
                    <input
                      value={r.quantity ?? 1}
                      onChange={(e) => updateRow(r.id, { quantity: parseInt(e.target.value || "1", 10) })}
                      style={input}
                      inputMode="numeric"
                    />
                  </td>
                  <td style={td}>
                    <input
                      value={r.unitPrice ?? ""}
                      onChange={(e) => updateRow(r.id, { unitPrice: e.target.value })}
                      style={input}
                      inputMode="decimal"
                    />
                  </td>
                  <td style={td}>{fromCents(lineTotal, r.currency || currency)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button type="button" onClick={() => removeRow(r.id)} style={btnDanger}>Entfernen</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#999" }}>
                  Keine Positionen – füge unten eine hinzu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <button type="button" onClick={addRow} style={btnGhost}>+ Position</button>
        <div style={{ fontWeight: 600 }}>
          Zwischensumme: {fromCents(totals.itemsTotalCents, currency)}
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 8px", fontSize: 13, color: "#555" };
const td = { borderBottom: "1px solid #f2f2f2", padding: "8px 8px", fontSize: 14 };
const input = { padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid #ddd", background: "#fff", outline: "none", width: "100%" };
const btnGhost = { padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid var(--color-primary)", background: "transparent", color: "var(--color-primary)", cursor: "pointer" };
const btnDanger = { padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" };
