"use client";

import { useEffect } from "react";

/**
 * Lädt Settings beim Start und setzt CSS-Variablen (--color-primary usw.).
 * Reagiert außerdem auf "settings:saved" Events, um Farben/Schrift live zu aktualisieren.
 */
export default function ThemeBridge() {
  async function applyFromServer() {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const js = await res.json();
      const s = js?.data || {};
      applyTheme({
        primaryColor: s.primaryColor || "#06b6d4",
        secondaryColor: s.secondaryColor || "#0ea5e9",
        textColor: s.textColor || "#0f172a",
        fontFamily: s.fontFamily || "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      });
    } catch {
      // ignore
    }
  }

  function applyTheme({ primaryColor, secondaryColor, textColor, fontFamily }) {
    const root = document.documentElement;
    if (primaryColor) root.style.setProperty("--color-primary", primaryColor);
    if (secondaryColor) root.style.setProperty("--color-secondary", secondaryColor);
    if (textColor) root.style.setProperty("--color-text", textColor);
    if (fontFamily) document.body.style.fontFamily = fontFamily;
  }

  useEffect(() => {
    applyFromServer();

    const onSaved = (ev) => {
      const s = ev.detail; // optional: page.jsx kann detail mitsenden
      if (s && typeof s === "object") {
        applyTheme({
          primaryColor: s.primaryColor,
          secondaryColor: s.secondaryColor,
          textColor: s.textColor,
          fontFamily: s.fontFamily
        });
      } else {
        applyFromServer();
      }
    };
    window.addEventListener("settings:saved", onSaved);
    return () => window.removeEventListener("settings:saved", onSaved);
  }, []);

  return null;
}
