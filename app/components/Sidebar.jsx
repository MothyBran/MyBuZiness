"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Sidebar({ user }) {
  const pathname = usePathname();

  const LINKS = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/termine", label: "Termine", icon: "📆" },
    { href: "/kunden", label: "Kunden", icon: "👤" },
    { href: "/produkte", label: "Produkte", icon: "📦" },
    { href: "/rechnungen", label: "Rechnungen", icon: "📄" },
    { href: "/belege", label: "Belege", icon: "🧾" },
    { href: "/finanzen", label: "Finanzen", icon: "💶", adminOnly: true },
    { href: "/mitarbeiter", label: "Mitarbeiter", icon: "👥", adminOnly: true },
    { href: "/einstellungen", label: "Einstellungen", icon: "⚙️", adminOnly: true },
  ].filter(link => !link.adminOnly || user?.role !== "employee");

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="sidebar hide-mobile no-print">
      <div className="sidebar__logo">
        <Link href="/" title="Dashboard">
          <Image
            src="/logo.png"
            alt="BuZiness"
            width={40}
            height={40}
            style={{ borderRadius: "8px" }}
          />
        </Link>
      </div>

      <nav className="sidebar__nav">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar__item ${isActive(link.href) ? "is-active" : ""}`}
            title={link.label}
          >
            <span className="sidebar__icon">{link.icon}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar__footer">
        {user && (
          <Link
            href="/profil"
            className={`sidebar__item ${isActive("/profil") ? "is-active" : ""}`}
            title="Profil"
          >
            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase" }}>
              {(user.name || "U").substring(0, 2)}
            </span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="sidebar__item"
          title="Abmelden"
          style={{ cursor: "pointer", background: "transparent", border: "none", color: "var(--error)" }}
        >
          <span className="sidebar__icon">🚪</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 72px;
          background-color: var(--panel); /* Dark/Light based on theme */
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 0;
          z-index: 50;
        }

        .sidebar__logo {
          margin-bottom: 2rem;
        }

        .sidebar__nav {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          align-items: center;
          flex: 1;
          overflow-y: auto;
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
          -webkit-overflow-scrolling: touch; /* Momentum scrolling on iOS */
        }

        .sidebar__nav::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }

        .sidebar__footer {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
            align-items: center;
            margin-bottom: 1rem;
            padding-top: 1rem; /* Add some padding so it doesn't touch the scrollable nav directly */
            margin-top: auto; /* Push footer to the bottom */
            flex-shrink: 0; /* Prevent the footer from shrinking */
        }

        .sidebar__item {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          min-height: 48px; /* Ensure elements don't shrink on small screens */
          flex-shrink: 0; /* Prevent elements from shrinking */
          border-radius: 12px;
          color: var(--text-weak);
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .sidebar__item:hover {
          background-color: var(--panel-2);
          color: var(--text);
        }

        .sidebar__item.is-active {
          background-color: rgba(20, 184, 166, 0.1); /* Brand opacity */
          color: var(--brand);
          border-color: rgba(20, 184, 166, 0.2);
        }

        .sidebar__icon {
          font-size: 1.5rem;
          line-height: 1;
        }

        @media (max-width: 768px) {
            .sidebar {
                display: none;
            }
        }
      `}</style>
    </aside>
  );
}
