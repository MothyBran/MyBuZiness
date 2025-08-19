// app/components/AppThemeClient.jsx
"use client";

import { useEffect, useState, useMemo } from "react";

export default function AppThemeClient() {
  const [s, setS] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const js = await fetch("/api/settings", { cache: "no-store" })
        .then(r => r.json())
        .catch(() => ({ ok: false }));
      if (!alive) return;
      const data = js?.data || {};
      setS(data);
      applyThemeFromSettings(data);
    })();
    return () => { alive = false; };
  }, []);

  const lineText = useMemo(() => {
    if (!s) return "";
    const bits = [];
    if (s.companyName) bits.push(s.companyName);
    if (s.email)       bits.push(s.email);
    if (s.city)        bits.push(s.city);
    return bits.join(" • ");
  }, [s]);

  return (
    <>
      {/* Info‑Streifen unter HeaderTop */}
      <div className="infoStripe" role="note" aria-label="Firmeninfo-Streifen">
        <div className="container">
          <div className="infoStripe__text" title={lineText || ""}>
            {lineText || "—"}
          </div>
        </div>
      </div>

      {/* Farb‑Streifen über der Fußzeile */}
      <div className="footerStripe" aria-hidden />
    </>
  );
}

/** CSS‑Variablen & Schrift anwenden */
function applyThemeFromSettings(s = {}) {
  const root = document.documentElement;
  if (s.primaryColor)   root.style.setProperty("--color-primary", s.primaryColor);
  if (s.secondaryColor) root.style.setProperty("--color-secondary", s.secondaryColor);
  if (s.textColor)      root.style.setProperty("--color-text", s.textColor);
  if (s.fontFamily)     document.body.style.fontFamily = s.fontFamily;
}
