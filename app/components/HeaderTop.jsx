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

          {/* Menü links – Login rechts (gleiche Button-Optik) */}
          <div className="header-row">
            <button
              type="button"
              className="btn header-btn show-mobile"
              aria-label={openModules ? "Module schließen" : "Module öffnen"}
              aria-expanded={openModules ? "true" : "false"}
              aria-controls="module-panel"
              onClick={() => setOpenModules(v => !v)}
            >
              ≡ Menü
            </button>

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

      {/* Modul-Panel als Overlay (schwebt über der Seite, verschiebt nichts) */}
      <ModuleLauncher open={openModules} id="module-panel" onClose={() => setOpenModules(false)} />

      <style jsx>{`
        .header-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
        }
        /* Optional: gleiche Mindesthöhe für beide Buttons sicherstellen */
        :global(.btn.header-btn){
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </>
  );
}
