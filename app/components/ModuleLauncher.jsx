// app/components/ModuleLauncher.jsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

function ModuleLink({ href, children }) {
  // prefetch={false} verhindert, dass Next die Seite im Hintergrund lädt (und 404 spammt)
  return (
    <Link
      href={href}
      prefetch={false}
      className="surface"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 64,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export default function ModuleLauncher({ open, onClose, id }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    if (open && onClose) onClose();
  }, [pathname]); // schließt bei Navigation

  if (!open) return null;

  return (
    <div
      id={id}
      className="surface"
      style={{ marginTop: 12, padding: 12, borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}
    >
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <ModuleLink href="/">Dashboard</ModuleLink>
        <ModuleLink href="/termine">Termine</ModuleLink>
        <ModuleLink href="/kunden">Kunden</ModuleLink>
        <ModuleLink href="/produkte">Produkte & Dienstleistungen</ModuleLink>
        <ModuleLink href="/rechnungen">Rechnungen</ModuleLink>
        <ModuleLink href="/belege">Belege</ModuleLink>
        <ModuleLink href="/einstellungen">Einstellungen</ModuleLink>

        {/*
          Wenn du den Finanz‑Reiter (geplant) sichtbar lassen willst, lass die Zeile drin.
          Dank prefetch={false} verursacht er keine 404 Spam mehr.
          Alternativ: Zeile auskommentieren, bis das Modul fertig ist.
        */}
        <ModuleLink href="/finanzen">Finanzen</ModuleLink>
      </div>
    </div>
  );
}
