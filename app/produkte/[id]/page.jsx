"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Modal from "@/app/components/Modal";
import { toCents } from "@/lib/money";

export default function ProductEditModalPage() {
  const { id } = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState({
    kind: "service",
    categoryCode: "",
    name: "",
    sku: "",
    price: "",
    currency: "EUR",
    description: "",
    travelEnabled: false,
    travelRate: "",
    travelUnit: "km",
    priceCents: 0,
    travelRateCents: 0,
  });

  function close() {
    setOpen(false);
    router.push("/produkte");
  }

  // robust laden: erst /api/products/[id] (falls vorhanden), sonst aus Liste filtern
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      let item = null;
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const json = await res.json();
          item = json.data || null;
        }
      } catch {}
      if (!item) {
        try {
          const resAll = await fetch(`/api/products`);
          const jsonAll = await resAll.json();
          item = (jsonAll.data || []).find((x) => x.id === id) || null;
        } catch {}
      }
      if (alive) {
        if (item) {
          setP({
            ...p,
            ...item,
            // komfortable Editfelder (Dezimalstring) vorbefüllen
            price: (item.priceCents / 100).toString().replace(".", ","),
            travelRate: (item.travelRateCents / 100).toString().replace(".", ","),
          });
        }
        setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e) {
    e.preventDefault();
    if (!p.name?.trim()) return alert("Name ist erforderlich.");
    setSaving(true);
    const payload = {
      kind: p.kind === "product" ? "product" : "service",
      categoryCode: p.categoryCode || null,
      name: p.name,
      sku: p.sku || null,
      priceCents: toCents(p.price || p.priceCents / 100 || 0),
      currency: p.currency || "EUR",
      description: p.description || null,
      travelEnabled: !!p.travelEnabled,
      travelRateCents: toCents(p.travelRate || p.travelRateCents / 100 || 0),
      travelUnit: p.travelUnit || "km",
    };
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!json?.ok) return alert(json?.error || "Speichern fehlgeschlagen.");
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Produkt/Dienstleistung bearbeiten" maxWidth={900}>
      {loading ? (
        <div>Bitte warten…</div>
      ) : (
        <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, 1fr)" }}>
            <Field label="Typ">
              <select
                value={p.kind}
                onChange={(e) => setP({ ...p, kind: e.target.value })}
                style={input}
              >
                <option value="service">Dienstleistung</option>
                <option value="product">Produkt</option>
              </select>
            </Field>
            <Field label="Kategorie-Code">
              <input
                value={p.categoryCode || ""}
                onChange={(e) => setP({ ...p, categoryCode: e.target.value })}
                style={input}
                placeholder="z. B. 1.1"
              />
            </Field>
            <Field label="Name *">
              <input
                value={p.name || ""}
                onChange={(e) => setP({ ...p, name: e.target.value })}
                style={input}
                required
              />
            </Field>
            <Field label="SKU">
              <input
                value={p.sku || ""}
                onChange={(e) => setP({ ...p, sku: e.target.value })}
                style={input}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, 1fr)" }}>
            <Field label="Preis (Einheit)">
              <input
                value={p.price ?? ""}
                onChange={(e) => setP({ ...p, price: e.target.value })}
                style={input}
                inputMode="decimal"
              />
            </Field>
            <Field label="Währung">
              <select
                value={p.currency || "EUR"}
                onChange={(e) => setP({ ...p, currency: e.target.value })}
                style={input}
              >
                <option>EUR</option>
                <option>USD</option>
              </select>
            </Field>
            <Field label="Fahrtkosten aktiv">
              <div style={{ display: "flex", alignItems: "center", height: 42 }}>
                <input
                  type="checkbox"
                  checked={!!p.travelEnabled}
                  onChange={(e) => setP({ ...p, travelEnabled: e.target.checked })}
                />
              </div>
            </Field>
            <Field label="Fahrtkosten (pro km)">
              <input
                value={p.travelRate ?? ""}
                onChange={(e) => setP({ ...p, travelRate: e.target.value })}
                style={input}
                inputMode="decimal"
              />
            </Field>
          </div>

          <Field label="Beschreibung">
            <textarea
              value={p.description || ""}
              onChange={(e) => setP({ ...p, description: e.target.value })}
              rows={3}
              style={{ ...input, resize: "vertical" }}
            />
          </Field>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={close} style={btnGhost}>
              Abbrechen
            </button>
            <button type="submit" disabled={saving} style={btnPrimary}>
              {saving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <strong>{label}</strong>
      {children}
    </label>
  );
}

const input = {
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid #ddd",
  background: "#fff",
  outline: "none",
};
const btnPrimary = {
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-primary)",
  background: "var(--color-primary)",
  color: "#fff",
  cursor: "pointer",
};
const btnGhost = {
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-primary)",
  background: "transparent",
  color: "var(--color-primary)",
  cursor: "pointer",
};
