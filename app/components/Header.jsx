"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const linkStyle = (href) => ({
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: pathname === href ? "#fff" : "#111",
    background: pathname === href ? "#111" : "transparent",
    border: "1px solid #111",
    fontSize: 14,
  });

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottom: "1px solid #eee",
      position: "sticky",
      top: 0,
      background: "#fff",
      zIndex: 10
    }}>
      <strong>MyBuZiness • HDR-R1</strong>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/" style={linkStyle("/")}>Start</Link>
        <Link href="/kunden" style={linkStyle("/kunden")}>Kunden</Link>
        <Link href="/produkte" style={linkStyle("/produkte")}>Produkte</Link>
        <Link href="/rechnungen" style={linkStyle("/rechnungen")}>Rechnungen</Link>
      </nav>
    </header>
  );
}
