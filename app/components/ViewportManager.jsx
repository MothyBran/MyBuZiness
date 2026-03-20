"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ViewportManager() {
  const pathname = usePathname();

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
        // Desktop-Ansicht erzwingen: Feste Breite, erlaubtes Zoomen.
        meta.content = "width=1024, initial-scale=1";
      } else {
        // Standard Mobile-Ansicht
        meta.content = "width=device-width, initial-scale=1, maximum-scale=5";
      }
    }

    // Bei jedem Rendering/Mounten und Routenwechsel anwenden
    applyViewport();

    // Event-Listener für sofortige Updates bei Einstellungs-Änderung
    window.addEventListener("viewportChanged", applyViewport);

    // Fallback: Einen MutationObserver auf den <head> setzen, falls Next.js
    // den meta-Tag beim Client-Side-Routing überschreibt.
    const observer = new MutationObserver(() => {
      const mode = localStorage.getItem("viewportMode") || "mobile";
      const meta = document.querySelector('meta[name="viewport"]');
      const expectedContent = mode === "desktop"
        ? "width=1024, initial-scale=1"
        : "width=device-width, initial-scale=1, maximum-scale=5";

      if (meta && meta.content !== expectedContent) {
        meta.content = expectedContent;
      }
    });

    observer.observe(document.head, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("viewportChanged", applyViewport);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
