// app/nav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/belege", label: "Belege" },
  { href: "/kunden", label: "Kunden" },
  { href: "/produkte", label: "Produkte/DL" },
  { href: "/termine", label: "Termine" },
  { href: "/finanzen", label: "Finanzen" },
  { href: "/einstellungen", label: "Einstellungen" },
];

export default function Nav() {
  const pathname = usePathname() || "/";

  return (
    <nav>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}>
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== "/" && pathname.startsWith(it.href));

          return (
            <li key={it.href}>
              <Link
                href={it.href}
                style={{
                  display: "block",
                  padding: "0.55rem 0.65rem",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: active ? "#0f172a" : "#e5e7eb",
                  background: active ? "#38bdf8" : "transparent",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
