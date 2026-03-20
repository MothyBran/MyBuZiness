"use client";

import { useEffect } from "react";

export default function ViewportManager() {
  useEffect(() => {
    function applyViewport() {
      const mode = localStorage.getItem("viewportMode") || "mobile";
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);
      }

      if (mode === "desktop") {
        // Desktop-Ansicht erzwingen: Feste Breite (z. B. 1024px), initial-scale dynamisch berechnen oder einfach feste Breite setzen
        meta.content = "width=1024";
      } else {
        // Standard Mobile-Ansicht
        meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
      }
    }

    applyViewport();

    // Event-Listener, um direkt auf Änderungen in den Einstellungen reagieren zu können
    window.addEventListener("viewportChanged", applyViewport);
    return () => window.removeEventListener("viewportChanged", applyViewport);
  }, []);

  return null;
}
