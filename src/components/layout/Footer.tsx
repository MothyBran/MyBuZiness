// src/components/layout/Footer.tsx
import React from "react";
import { useTheme } from "../../theme/ThemeProvider";

export const Footer: React.FC = () => {
  const { settings } = useTheme();
  return (
    <footer style={{borderTop:"1px solid rgba(255,255,255,.08)", marginTop:24}}>
      <div className="container" style={{padding:"18px 14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <small style={{color:"var(--color-muted)"}}>
          © {new Date().getFullYear()} {settings?.companyName || "My Business"}
        </small>
        {settings?.website ? <a href={settings.website} target="_blank" rel="noreferrer" className="badge">{settings.website}</a> : null}
      </div>
    </footer>
  );
};
