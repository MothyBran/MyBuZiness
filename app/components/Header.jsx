"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header({ title = "MyBuZiness", showLogo = true, logoUrl = "" }) {
  const pathname = usePathname();
  const [hideImg, setHideImg] = useState(false);

  const linkStyle = (href) => ({
    padding: "8px 12px",
    borderRadius: "var(--radius)",
    textDecoration: "none",
    color: pathname === href ? "#fff" : "var(--color-text)",
    background: pathname === href ? "var(--color-primary)" : "transparent",
    border: "1px solid var(--color-primary)",
    fontSize: 14,
  });

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        justifyContent: "space-between",
        padding: 16,
        borderBottom: "1px solid #eee",
        position: "sticky",
        top: 0,
        background: "#fff",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showLogo && !!logoUrl && !hideImg && (
          <img
            src={logoUrl}
            alt="Logo"
            height={28}
            style={{ display: "block", objectFit: "contain", maxWidth: 140 }}
            onError={() => setHideImg(true)} // verstecken, falls DB-Logo 404 liefert
          />
        )}
        <strong style={{ color: "var(--color-primary)" }}>{title}</strong>
      </div>

      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/" style={linkStyle("/")}>Start</Link>
        <Link href="/kunden" style={linkStyle("/kunden")}>Kunden</Link>
        <Link href="/produkte" style={linkStyle("/produkte")}>Produkte</Link>
        <Link href="/rechnungen" style={linkStyle("/rechnungen")}>Rechnungen</Link>
        <Link href="/belege" style={linkStyle("/belege")}>Belege</Link>
        <Link href="/einstellungen" style={linkStyle("/einstellungen")}>Einstellungen</Link>
      </nav>
    </header>
  );
}
