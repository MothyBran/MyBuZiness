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
          <Image src="/logo.png" alt="BuZiness Logo" width={42} height={42} priority style={{ borderRadius: 10 }} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <h1 className="page-title" style={{ margin: 0, whiteSpace: "nowrap" }}>BuZiness</h1>
            <p className="subtle" style={{ marginTop: 2 }}>„Schnell erfassen, sicher verwalten.“</p>
          </div>
        </div>

        {/* Menü links – Login rechts */}
        <div className="header-row">
          {/* Hamburger Menü */}
          <button
            type="button"
            className="btn header-btn"
            aria-label={openModules ? "Module schließen" : "Module öffnen"}
            aria-expanded={openModules ? "true" : "false"}
            aria-controls="module-panel"
            onClick={() => setOpenModules(v => !v)}
          >
            <span className="hamburger" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
          </button>

          {/* Login rechts */}
          <a href="/login" className="btn header-btn">Login</a>
        </div>

        {/* Modul-Panel */}
        <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />
      </div>
    </header>
  );
}
