// app/components/ModuleLauncher.jsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ModuleLauncher({ open, onClose, id = "module-panel" }) {
  const pathname = usePathname();

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

  const LINKS = [
    { href:"/",              icon:"🏠", label:"Dashboard" },
    { href:"/termine",       icon:"📆", label:"Termine" },
    { href:"/kunden",        icon:"👤", label:"Kunden" },
    { href:"/produkte",      icon:"📦", label:"Produkte" },
    { href:"/rechnungen",    icon:"📄", label:"Rechnungen" },
    { href:"/belege",        icon:"🧾", label:"Belege" },
    { href:"/finanzen",      icon:"💶", label:"Finanzen" },
    { href:"/einstellungen", icon:"⚙️", label:"Einstellungen" }, // <-- korrigiert
  ];

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
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

        {/* Panel selbst scrollbar; eine Zeile pro Link */}
        <nav className="ml-list" role="menu" aria-orientation="vertical">
          {LINKS.map((m)=>(
            <Link
              key={m.href}
              href={m.href}
              className={`ml-item ${isActive(m.href) ? "is-active" : ""}`}
              onClick={onItemClick}
              role="menuitem"
            >
              <span className="ml-ico" aria-hidden>{m.icon}</span>
              <span className="ml-txt">{m.label}</span>
              <span className="ml-chevron" aria-hidden>›</span>
            </Link>
          ))}
        </nav>
      </aside>

      <style jsx>{`
        /* Hintergrund (über der Seite, Seite verschiebt sich NICHT) */
        .ml-scrim{
          position: fixed; inset: 0;
          background: rgba(0,0,0,.5);
          backdrop-filter: blur(2px);
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
          background: var(--panel);
          border-right: 1px solid var(--border);
          box-shadow: 0 10px 40px rgba(0,0,0,.18);
          transition: transform .22s ease;
          z-index: 60;
          display: grid; grid-template-rows: auto 1fr;
          color: var(--text);
        }
        .ml-drawer.is-open{ transform: translateX(0); }

        .ml-head{
          display:flex; align-items:center; justify-content:space-between;
          padding: 12px 14px; border-bottom: 1px solid var(--border);
        }
        .ml-title{ font-weight: 800; }
        .ml-close{
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--panel-2); cursor:pointer;
          line-height: 1; font-size: 18px; color: var(--text);
          transition: background .12s ease, border-color .12s ease;
        }
        .ml-close:hover{ background: var(--border); }

        /* Liste: Panel scrollbar wenn zu lang */
        .ml-list{
          overflow-y: auto; padding: 10px;
          display: grid; gap: 8px;
        }

        /* Hochwertige Card-Links */
        .ml-item{
          display:grid;
          grid-template-columns: 36px 1fr 16px;
          align-items:center;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--panel);
          text-decoration: none;
          color: var(--text);
          box-shadow: var(--shadow-sm);
          transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
          position: relative;
          overflow: hidden;
        }
        .ml-item:hover{
          border-color: var(--border);
          background: var(--panel-2);
          box-shadow: var(--shadow-1);
          transform: translateY(-1px);
        }
        .ml-item:focus-visible{
          outline: 2px solid var(--brand);
          outline-offset: 2px;
        }

        /* Active-Zustand mit Akzent links */
        .ml-item.is-active{
          border-color: var(--brand);
          background: rgba(20,184,166,0.05);
          box-shadow: var(--shadow-1);
        }
        .ml-item.is-active::before{
          content:"";
          position:absolute; left:0; top:0; bottom:0;
          width: 4px; border-radius: 4px 0 0 4px;
          background: var(--brand);
        }

        .ml-ico{
          width: 36px; height: 36px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 10px;
          background: var(--panel-2);
          font-size: 18px;
          transition: transform .12s ease, background .12s ease;
        }
        .ml-item:hover .ml-ico{ transform: scale(1.04); background: var(--border); }

        .ml-txt{
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-weight: 600;
        }

        .ml-chevron{
          color: var(--muted); font-size:18px; line-height:1;
          transition: transform .12s ease, color .12s ease;
        }
        .ml-item:hover .ml-chevron{ transform: translateX(2px); color: var(--text-weak); }

        @media (max-width: 420px){
          .ml-drawer{ width: min(88vw, 320px); }
        }
      `}</style>
    </>
  );
}
