"use client";

import Image from "next/image";
import { useState } from "react";
import ModuleLauncher from "./ModuleLauncher";

export default function HeaderTop() {
  const [openModules, setOpenModules] = useState(false);

  return (
    <header className="hero">
      <div className="container" style={{ paddingTop: 14, paddingBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo.png" alt="BuZiness Logo" width={42} height={42} priority style={{ borderRadius: 10 }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 className="page-title" style={{ margin: 0 }}>BuZiness</h1>
            <p className="subtle" style={{ marginTop: 4 }}>„Schnell erfassen, sicher verwalten.“</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <a href="/login" className="btn-ghost">Anmelden</a>
              <a href="/register" className="btn">Registrieren</a>
            </div>
          </div>

          <div>
            <button
              className="btn-ghost"
              onClick={() => setOpenModules(v => !v)}
              aria-expanded={openModules ? "true" : "false"}
              aria-controls="module-panel"
            >
              {openModules ? "Module schließen" : "Module öffnen"}
            </button>
          </div>
        </div>

        <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />
      </div>
    </header>
  );
}
