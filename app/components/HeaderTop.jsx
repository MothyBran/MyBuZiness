"use client";

import Link from "next/link";
import { BRAND } from "@/lib/appBrand";

export default function HeaderTop() {
  return (
    <header style={wrap}>
      <div style={inner}>
        {/* Zeile 1: Links Hamburger (gleich groß wie Login), rechts Login */}
        <div style={rowTop}>
          <button
            type="button"
            aria-label="Menü öffnen"
            style={btn}
            onClick={() => {
              const el = document.getElementById("modules-panel");
              if (el) el.toggleAttribute("data-open");
            }}
          >
            {/* Hamburger-Icon */}
            <span style={{ fontSize: 18, lineHeight: "1" }}>☰</span>
          </button>

          <Link href="/login" style={{ ...btn, textDecoration: "none", display: "inline-grid", placeItems: "center" }}>
            Login
          </Link>
        </div>

        {/* Zeile 2: Logo + Name/Claim zentriert */}
        <div style={brandRow}>
          {BRAND?.logoPath ? (
            <img
              src={BRAND.logoPath}
              alt={BRAND.appName || "Logo"}
              height={48}
              style={{ display: "block", objectFit: "contain", maxWidth: 220 }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}

          <div style={{ lineHeight: 1.15, textAlign: "center" }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.2, fontSize: 20 }}>
              {BRAND?.appName || "BuZiness"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>
              {BRAND?.tagline || "Schnell erfassen, sicher verwalten."}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Styles ---------- */
const wrap = {
  background: "var(--color-primary, #06b6d4)",
  color: "#fff",
};

const inner = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "12px 16px 10px",
};

const rowTop = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  alignItems: "center",
  marginBottom: 10,
};

const btn = {
  justifySelf: "start",
  background: "#fff",
  color: "var(--color-primary, #06b6d4)",
  border: "1px solid #fff",
  borderRadius: 12,
  height: 36,
  minWidth: 100,
  padding: "0 12px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(0,0,0,.1)",
};

const brandRow = {
  display: "grid",
  justifyItems: "center",
  alignItems: "center",
  gap: 8,
};
