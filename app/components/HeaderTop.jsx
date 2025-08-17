"use client";

import Image from "next/image";
import { useState } from "react";
import ModuleLauncher from "./ModuleLauncher";

export default function HeaderTop() {
  const [openModules, setOpenModules] = useState(false);

  return (
    <header className="hero" style={{ borderBottom: "1px solid #eee", marginBottom: 10 }}>
      <div className="container" style={{ paddingTop: 14, paddingBottom: 10 }}>
        {/* Logo + Überschrift */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Image src="/logo.svg" alt="BuZiness Logo" width={42} height={42} priority style={{ borderRadius: 10 }} />
          <div style={{ lineHeight: 1.2 }}>
            <h1 className="page-title" style={{ margin: 0 }}>BuZiness</h1>
            <p className="subtle" style={{ marginTop: 2 }}>„Schnell erfassen, sicher verwalten.“</p>
          </div>
        </div>

        {/* Menü-Button links + Login rechts */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Hamburger Menü */}
          <button
            className="btn-ghost"
            onClick={() => setOpenModules(v => !v)}
            aria-expanded={openModules ? "true" : "false"}
            aria-controls="module-panel"
            style={{ fontSize: 22, fontWeight: "bold", lineHeight: 1 }}
          >
            &#9776;
          </button>

          {/* Login Button */}
          <a href="/login" className="btn">Anmelden</a>
        </div>

        {/* Modul-Panel */}
        <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />
      </div>
    </header>
  );
}
