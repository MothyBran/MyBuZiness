// src/components/layout/Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";

const NavItem: React.FC<{to:string; icon:string; label:string}> = ({to, icon, label}) => (
  <NavLink to={to} style={({isActive})=>({
    display:"grid", gridTemplateColumns:"24px 1fr", alignItems:"center", gap:10,
    padding:"10px 12px", borderRadius:12,
    background: isActive ? "rgba(255,255,255,.06)" : "transparent",
    color: isActive ? "white" : "var(--color-text)",
    border: "1px solid rgba(255,255,255,.06)"
  })}>
    <span style={{fontSize:18}}>{icon}</span>
    <span className="truncate" style={{fontSize:14, fontWeight:600}}>{label}</span>
  </NavLink>
);

export const Sidebar: React.FC = () => {
  return (
    <aside style={{position:"sticky", top:72}}>
      <div className="grid" style={{gap:8}}>
        <NavItem to="/" icon="🏠" label="Dashboard" />
        <NavItem to="/customers" icon="👤" label="Kunden" />
        <NavItem to="/products" icon="📦" label="Produkte" />
        <NavItem to="/quotes" icon="📝" label="Angebote" />
        <NavItem to="/orders" icon="🧾" label="Aufträge" />
        <NavItem to="/invoices" icon="💶" label="Rechnungen" />
        <NavItem to="/receipts" icon="🧾" label="Belege" />
        <NavItem to="/appointments" icon="📅" label="Termine" />
        <NavItem to="/settings" icon="⚙️" label="Einstellungen" />
      </div>
    </aside>
  );
};
