// src/components/layout/Header.tsx
import React from "react";
import { useTheme } from "../../theme/ThemeProvider";

export const Header: React.FC = () => {
  const { settings } = useTheme();
  const title = settings?.headerTitle || settings?.companyName || "Dashboard";
  const logoShown = settings?.showLogo;
  const logoUrl = settings?.logoUrl;

  return (
    <header style={{position:"sticky", top:0, zIndex:50, backdropFilter:"saturate(140%) blur(6px)",
      borderBottom:"1px solid rgba(255,255,255,.08)"}}
      className="card" >
      <div className="container" style={{display:"flex", alignItems:"center", gap:12, padding:"10px 14px"}}>
        {logoShown && logoUrl ? <img src={logoUrl} alt="Logo" style={{height:32, borderRadius:8}}/> : (
          <div style={{width:32, height:32, borderRadius:8, background:"var(--color-primary)"}} />
        )}
        <div style={{display:"flex", alignItems:"baseline", gap:10}}>
          <h1 style={{margin:0, fontSize:18}}>{title}</h1>
          {settings?.ownerName ? <span className="badge">{settings.ownerName}</span> : null}
        </div>
        <div style={{marginLeft:"auto", display:"flex", gap:8}}>
          <button className="btn btn--ghost">🔔</button>
          <button className="btn btn--ghost">⚙️</button>
        </div>
      </div>
    </header>
  );
};
