"use client";

import { useEffect, useState } from "react";

/**
 * Zeigt: "Firmenname • E‑Mail • Ort" im Farbverlauf aus --color-primary/--color-secondary.
 * Liest die Daten aus /api/settings (no-store).
 */
export default function InfoStripe() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const js = await res.json();
      const s = js?.data || {};
      setCompanyName(s.companyName || "");
      setEmail(s.email || "");
      setCity(s.city || "");
    } catch {
      // soft-fail
    }
  }

  useEffect(() => {
    load();

    // Live-Refresh, wenn /einstellungen speichert
    const onPing = () => load();
    window.addEventListener("settings:saved", onPing);
    return () => window.removeEventListener("settings:saved", onPing);
  }, []);

  const parts = [
    companyName && String(companyName).trim(),
    email && String(email).trim(),
    city && String(city).trim()
  ].filter(Boolean);

  return (
    <div style={wrap} aria-label="InfoStripe">
      <div style={inner}>
        <div style={text}>
          {parts.length ? parts.join(" • ") : "—"}
        </div>
      </div>
    </div>
  );
}

const wrap = {
  background: "linear-gradient(135deg, var(--color-primary,#06b6d4) 0%, var(--color-secondary,#0ea5e9) 100%)",
  color: "#fff"
};
const inner = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "6px 16px",
};
const text = {
  fontSize: 13,
  letterSpacing: 0.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};
