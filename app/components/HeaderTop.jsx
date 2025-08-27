"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ModuleLauncher from "./ModuleLauncher";

export default function HeaderTop() {
  const [openModules, setOpenModules] = useState(false);
  const pathname = usePathname();

  // 1) Bei jedem Routenwechsel Menü schließen
  useEffect(() => {
    setOpenModules(false);
  }, [pathname]);

  // 2) Globales Nav-Event (z. B. aus Dashboard-Links) schließt das Menü
  useEffect(() => {
    const close = () => setOpenModules(false);
    document.addEventListener("app:nav", close);
    return () => document.removeEventListener("app:nav", close);
  }, []);

  // 3) Klick-Delegation im Modul-Panel: Klick auf <a> oder [data-nav] schließt Menü
  useEffect(() => {
    if (!openModules) return;
    const el = document.getElementById("module-panel");
    if (!el) return;
    const onClick = (e) => {
      const trigger = e.target.closest("a, [data-nav]");
      if (trigger) {
        setOpenModules(false);
        // optional: Event feuern, falls andere Komponenten lauschen
        document.dispatchEvent(new Event("app:nav"));
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [openModules]);

  return (
    <header className="hero" style={{ borderBottom: "1px solid #eee", marginBottom: 10 }}>
      <div className="container" style={{ paddingTop: 10, paddingBottom: 10 }}>
        
        {/* Logo + Überschrift */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Image src="/logo.png" alt="BuZiness Logo" width={80} height={80} priority style={{ borderRadius: 4 }} />
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
          <a
            href="/login"
            className="btn header-btn"
            onClick={() => {
              // sofort schließen, ohne auf Route-Change zu warten
              setOpenModules(false);
              document.dispatchEvent(new Event("app:nav"));
            }}
          >
            Login
          </a>
        </div>

        {/* Modul-Panel */}
        <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />
      </div>
    </header>
  );
}
