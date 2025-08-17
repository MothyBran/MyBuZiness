"use client";

import Image from "next/image";
import { useState } from "react";
import ModuleLauncher from "@/app/components/ModuleLauncher";

export default function HeaderTop() {
  const [openModules, setOpenModules] = useState(false);

  return (
    <header className="hero">
      <div className="container" style={{ paddingTop: 14, paddingBottom: 10 }}>
        {/* Brand Row */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Passe Pfad/Größe an dein Logo an (public/logo.svg oder logo.png) */}
            <Image
              src="/logo.svg"
              alt="BuZiness Logo"
              width={42}
              height={42}
              priority
              style={{ borderRadius: 10 }}
            />
          </div>

          {/* Titel & Claim */}
          <div style={{ minWidth: 0 }}>
            <h1 className="page-title" style={{ margin: 0 }}>BuZiness</h1>
            <p className="subtle" style={{ marginTop: 4 }}>„Schnell erfassen, sicher verwalten.“</p>
            {/* Auth Buttons direkt UNTER der Überschrift */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <a href="/login" className="btn-ghost">Anmelden</a>
              <a href="/register" className="btn">Registrieren</a>
            </div>
          </div>

          {/* Module Toggle */}
          <div>
            <button
              className="btn-ghost"
              onClick={() => setOpenModules((v) => !v)}
              aria-expanded={openModules ? "true" : "false"}
              aria-controls="module-panel"
            >
              {openModules ? "Module schließen" : "Module öffnen"}
            </button>
          </div>
        </div>

        {/* Module Panel (auf/zu) */}
        <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />
      </div>
    </header>
  );
}
