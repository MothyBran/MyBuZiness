import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../theme/ThemeProvider";

const tabs = [
  { to: "/", label: "Dashboard" },
  { to: "/customers", label: "Kunden" },
  { to: "/products", label: "Produkte" },
  { to: "/invoices", label: "Rechnungen" },
  { to: "/receipts", label: "Belege" },
  { to: "/appointments", label: "Termine" },
  { to: "/settings", label: "Einstellungen" }
];

export default function Header() {
  const { settings } = useTheme();
  const { pathname } = useLocation();
  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__brand">
          {settings?.headerTitle || "MyBuZiness"}
        </div>
        <nav className="nav">
          {tabs.map(t => {
            const active = pathname === t.to;
            return (
              <Link key={t.to} to={t.to} style={active ? { borderColor: "rgba(255,255,255,.22)", background: "rgba(255,255,255,.06)" } : undefined}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
