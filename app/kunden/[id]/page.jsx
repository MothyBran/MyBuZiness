"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Modal from "@/app/components/Modal";

export default function CustomerEditModalPage() {
  const { id } = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [c, setC] = useState({
    name: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressZip: "",
    addressCity: "",
    addressCountry: "",
    note: "",
  });

  function close() {
    setOpen(false);
    router.push("/kunden");
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/customers/${id}`);
      const json = await res.json().catch(() => ({}));
      if (alive) {
        if (json?.data) setC({ ...c, ...json.data });
        setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e) {
    e.preventDefault();
    if (!c.name?.trim()) return alert("Name ist erforderlich.");
    setSaving(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        addressStreet: c.addressStreet || null,
        addressZip: c.addressZip || null,
        addressCity: c.addressCity || null,
        addressCountry: c.addressCountry || null,
        note: c.note || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!json?.ok) return alert(json?.error || "Speichern fehlgeschlagen.");
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Kunde bearbeiten" maxWidth={860}>
      {loading ? (
        <div>Bitte warten…</div>
      ) : (
        <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Name *">
              <input
                value={c.name || ""}
                onChange={(e) => setC({ ...c, name: e.target.value })}
                style={input}
                required
              />
            </Field>
            <Field label="E-Mail">
              <input
                value={c.email || ""}
                onChange={(e) => setC({ ...c, email: e.target.value })}
                style={input}
              />
            </Field>
            <Field label="Telefon">
              <input
                value={c.phone || ""}
                onChange={(e) => setC({ ...c, phone: e.target.value })}
                style={input}
              />
            </Field>
            <div />
            <Field label="Straße">
              <input
                value={c.addressStreet || ""}
                onChange={(e) => setC({ ...c, addressStreet: e.target.value })}
                style={input}
              />
            </Field>
            <Field label="PLZ">
              <input
                value={c.addressZip || ""}
                onChange={(e) => setC({ ...c, addressZip: e.target.value })}
                style={input}
              />
            </Field>
            <Field label="Ort">
              <input
                value={c.addressCity || ""}
                onChange={(e) => setC({ ...c, addressCity: e.target.value })}
                style={input}
              />
            </Field>
            <Field label="Land">
              <input
                value={c.addressCountry || ""}
                onChange={(e) => setC({ ...c, addressCountry: e.target.value })}
                style={input}
              />
            </Field>
          </div>

          <Field label="Notiz">
            <textarea
              value={c.note || ""}
              onChange={(e) => setC({ ...c, note: e.target.value })}
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
