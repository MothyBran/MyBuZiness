"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ModuleLauncher({ open, onClose, id = "module-panel" }) {
  // Body-Scroll sperren, wenn offen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => { document.body.style.overflow = prev || ""; };
  }, [open]);

  // Klick auf Link schließt Panel + feuert globales Nav-Event
  function onItemClick() {
    onClose?.();
    document.dispatchEvent(new Event("app:nav"));
  }

  return (
    <>
      {/* halbtransparenter Hintergrund */}
      <div
        className={`ml-scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* linker Drawer */}
      <aside
        id={id}
        className={`ml-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Modul-Navigation"
      >
        <div className="ml-head">
          <div className="ml-title">Module</div>
          <button type="button" className="ml-close" onClick={onClose} aria-label="Schließen">×</button>
        </div>

        <nav className="ml-list" role="menu" aria-orientation="vertical">
          {[
            { href:"/",            icon:"🏠", label:"Dashboard" },
            { href:"/termine",     icon:"📆", label:"Termine" },
            { href:"/kunden",      icon:"👤", label:"Kunden" },
            { href:"/produkte",    icon:"📦", label:"Produkte" },
            { href:"/rechnungen",  icon:"📄", label:"Rechnungen" },
            { href:"/belege",      icon:"🧾", label:"Belege" },
            { href:"/settings",    icon:"⚙️", label:"Einstellungen" },
          ].map((m)=>(
            <Link
              key={m.href}
              href={m.href}
              className="ml-item"
              onClick={onItemClick}
              role="menuitem"
            >
              <span className="ml-ico" aria-hidden>{m.icon}</span>
              <span className="ml-txt">{m.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <style jsx>{`
        /* Hintergrund (über der Seite, Seite verschiebt sich NICHT) */
        .ml-scrim{
          position: fixed; inset: 0;
          background: rgba(17,24,39,.3);   /* dezent dunkel */
          backdrop-filter: blur(1px);
          opacity: 0; pointer-events: none;
          transition: opacity .18s ease;
          z-index: 59;
        }
        .ml-scrim.is-open{ opacity: 1; pointer-events: auto; }

        /* Drawer links */
        .ml-drawer{
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(300px, 86vw);
          transform: translateX(-102%);
          background: #fff; border-right: 1px solid #e5e7eb;
          box-shadow: 0 10px 40px rgba(0,0,0,.18);
          transition: transform .22s ease;
          z-index: 60;
          display: grid; grid-template-rows: auto 1fr;
        }
        .ml-drawer.is-open{ transform: translateX(0); }

        .ml-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 12px 14px; border-bottom: 1px solid #e5e7eb;
        }
        .ml-title{ font-weight: 800; }
        .ml-close{
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid #e5e7eb; background:#fff; cursor:pointer;
          line-height: 1; font-size: 18px;
        }

        /* Liste: eine Zeile pro Modul; Panel selbst scrollbar wenn zu lang */
        .ml-list{
          overflow-y: auto; padding: 8px;
          display: grid; gap: 6px;
        }
        .ml-item{
          display: grid; grid-template-columns: 28px 1fr; align-items: center;
          gap: 10px; padding: 10px 12px;
          border: 1px solid transparent; border-radius: 10px;
          text-decoration: none; color: #111827; background: #fff;
        }
        .ml-item:hover{ border-color:#e5e7eb; background:#fafafa; }
        .ml-ico{ font-size: 18px; width: 28px; text-align: center; }
        .ml-txt{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @media (max-width: 420px){
          .ml-drawer{ width: min(88vw, 320px); }
        }
      `}</style>
    </>
  );
}
