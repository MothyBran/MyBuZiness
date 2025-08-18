"use client";

import { useEffect, useMemo, useState } from "react";

function useSettings() {
  const [s, setS] = useState(null);
  useEffect(() => {
    (async () => {
      const js = await fetch("/api/settings", { cache: "no-store" })
        .then(r => r.json())
        .catch(() => ({}));
      setS(js?.data || null);
    })();
  }, []);
  return s;
}

/**
 * InfoStripe
 * - position: "top" | "bottom" (nur semantisch, falls du später Unterschiede willst)
 * - showText: true => "Firmenname • E-Mail • Ort"
 *             false => nur Farbfläche (z. B. über der Fußzeile)
 */
export default function InfoStripe({ position = "top", showText = true }) {
  const s = useSettings();

  const primary = s?.primaryColor || "#06b6d4";
  const secondary = s?.secondaryColor || "#0ea5e9";
  const gradient = `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`;

  const text = useMemo(() => {
    if (!showText) return "";
    const parts = [
      s?.companyName || null,
      s?.email || null,
      s?.city || null,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [s, showText]);

  return (
    <div
      style={{
        width: "100%",
        background: gradient,
        color: "#fff",
        boxShadow: "inset 0 -1px 0 rgba(255,255,255,.2)",
      }}
      aria-hidden={!showText}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: showText ? "6px 16px" : "4px 16px",
          minHeight: 12,
          display: "flex",
          alignItems: "center",
        }}
      >
        {showText ? (
          <div
            style={{
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={text}
          >
            {text || "—"}
          </div>
        ) : (
          <div style={{ height: 4, width: "100%" }} />
        )}
      </div>
    </div>
  );
}
