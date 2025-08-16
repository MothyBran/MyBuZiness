"use client";

import Link from "next/link";
import { BRAND } from "@/lib/appBrand";

export default function TopBar() {
  return (
    <div style={wrap}>
      <div style={inner}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo */}
          <img
            src={BRAND.logoPath}
            alt={BRAND.appName}
            height={32}
            style={{ display: "block", objectFit: "contain", maxWidth: 160 }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          {/* Name + Tagline */}
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>
              {BRAND.appName}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {BRAND.tagline}
            </div>
          </div>
        </div>

        {/* Rechts: Auth-Links (Platzhalter) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={btnLink}>Login</Link>
          <Link href="/register" style={btnOutline}>Registrieren</Link>
        </div>
      </div>
    </div>
  );
}

const wrap = {
  background: "var(--color-primary)",
  color: "#fff"
};
const inner = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "8px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};
const btnLink = {
  color: "#fff",
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: "var(--radius)",
  border: "1px solid rgba(255,255,255,.25)"
};
const btnOutline = {
  color: "var(--color-primary)",
  background: "#fff",
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: "var(--radius)",
  border: "1px solid #fff"
};
