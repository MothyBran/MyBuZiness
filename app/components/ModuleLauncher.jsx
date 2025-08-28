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
    { href:"/",            icon:"🏠", label:"Dashboard" },
    { href:"/termine",     icon:"📆", label:"Termine" },
    { href:"/kunden",      icon:"👤", label:"Kunden" },
    { href:"/produkte",    icon:"📦", label:"Produkte" },
    { href:"/rechnungen",  icon:"📄", label:"Rechnungen" },
    { href:"/belege",      icon:"🧾", label:"Belege" },
    { href:"/finanzen",    icon:"💶", label:"Finanzen" },
    { href:"/settings",    icon:"⚙️", label:"Einstellungen" },
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
          background: rgba(17,24,39,.3);
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
          transition: background .12s ease, border-color .12s ease;
        }
        .ml-close:hover{ background:#f9fafb; border-color:#d1d5db; }

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
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          text-decoration: none;
          color: #111827;
          box-shadow: 0 1px 2px rgba(0,0,0,.02);
          transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
          position: relative;
          overflow: hidden;
        }
        .ml-item:hover{
          border-color:#d1d5db;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 6px 16px rgba(0,0,0,.06);
          transform: translateY(-1px);
        }
        .ml-item:focus-visible{
          outline: 2px solid var(--color-primary, #06a);
          outline-offset: 2px;
        }

        /* Active-Zustand mit Akzent links */
        .ml-item.is-active{
          border-color: var(--color-primary, #06a);
          background: linear-gradient(180deg, #f0f9ff 0%, #ecfeff 100%);
          box-shadow: 0 6px 18px rgba(8,145,178,.12);
        }
        .ml-item.is-active::before{
          content:"";
          position:absolute; left:0; top:0; bottom:0;
          width: 4px; border-radius: 4px 0 0 4px;
          background: var(--color-primary, #06a);
        }

        .ml-ico{
          width: 36px; height: 36px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 10px;
          background: #f3f4f6;
          font-size: 18px;
          transition: transform .12s ease, background .12s ease;
        }
        .ml-item:hover .ml-ico{ transform: scale(1.04); background:#eef2f7; }

        .ml-txt{
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-weight: 600;
        }

        .ml-chevron{
          color:#9ca3af; font-size:18px; line-height:1;
          transition: transform .12s ease, color .12s ease;
        }
        .ml-item:hover .ml-chevron{ transform: translateX(2px); color:#6b7280; }

        @media (max-width: 420px){
          .ml-drawer{ width: min(88vw, 320px); }
        }
      `}</style>
    </>
  );
}
