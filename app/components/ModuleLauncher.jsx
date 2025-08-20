"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ModuleLauncher({ open, onClose, id }) {
  const pathname = usePathname();
  useEffect(() => { if (open) onClose?.(); }, [pathname]); // schließt bei Navigation
  if (!open) return null;

  return (
    <div id={id} className="surface" style={{ marginTop: 12, padding: 12, borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <ModuleLink href="/">Dashboard</ModuleLink>
        <ModuleLink href="/termine'">Termine</ModuleLink>
        <ModuleLink href="/kunden">Kunden</ModuleLink>
        <ModuleLink href="/produkte">Produkte & Dienstleistungen</ModuleLink>
        <ModuleLink href="/rechnungen">Rechnungen</ModuleLink>
        <ModuleLink href="/belege">Belege</ModuleLink>
        <ModuleLink href="/einstellungen">Einstellungen</ModuleLink>
      </div>
    </div>
  );
}

function ModuleLink({ href, children }) {
  return (
    <Link
      href={href}
      className="module-pill"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 14px", borderRadius: "12px",
        border: "1px solid rgba(0,0,0,.08)", background: "#fff",
        boxShadow: "var(--shadow-xs)", textDecoration: "none",
        color: "inherit", fontWeight: 600,
        transition: "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
      }}
    >
      {children}
    </Link>
  );
}
