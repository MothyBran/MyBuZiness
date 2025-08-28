"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ModuleLauncher from "./ModuleLauncher";

export default function HeaderTop() {
  const [openModules, setOpenModules] = useState(false);
  const pathname = usePathname();

  // Bei Routenwechsel/externem Nav-Event schließen
  useEffect(() => { setOpenModules(false); }, [pathname]);
  useEffect(() => {
    const close = () => setOpenModules(false);
    document.addEventListener("app:nav", close);
    return () => document.removeEventListener("app:nav", close);
  }, []);

  return (
    <>
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

          {/* Rechts: Login (ohne Hamburger im Header) */}
          <div className="header-row">
            <span aria-hidden />
            <a
              href="/login"
              className="btn header-btn"
              onClick={() => document.dispatchEvent(new Event("app:nav"))}
            >
              Login
            </a>
          </div>
        </div>
      </header>

      {/* Linker, dezenter Reiter (öffnet Overlay) */}
      <button
        type="button"
        className="edge-tab"
        aria-label={openModules ? "Module schließen" : "Module öffnen"}
        aria-expanded={openModules ? "true" : "false"}
        aria-controls="module-panel"
        onClick={() => setOpenModules(v => !v)}
      >
        <span className="edge-icon" aria-hidden>≡</span>
        <span className="edge-text">Menü</span>
      </button>

      {/* Modul-Panel als Overlay, schwebt über der Seite */}
      <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />

      <style jsx>{`
        .header-row{
          display:flex; justify-content:space-between; align-items:center;
        }
        /* Linker Reiter */
        .edge-tab{
          position: fixed;
          left: 0; top: 50%;
          transform: translateY(-50%);
          z-index: 60;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 10px 10px 8px;
          border: 1px solid #e5e7eb;
          border-left: none;
          background: #ffffff;
          color: #111827;
          border-radius: 0 12px 12px 0;
          box-shadow: 0 4px 24px rgba(0,0,0,.08);
          cursor: pointer;
        }
        .edge-icon{ font-size: 16px; line-height: 1 }
        .edge-text{ font-size: 14px }
        @media (max-width: 720px){
          .edge-text{ display:none; }          /* mobil nur Icon */
          .edge-tab{ padding: 10px 10px 10px 6px; }
        }
      `}</style>
    </>
  );
}
