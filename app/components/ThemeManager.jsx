"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    async function fetchAndApplyTheme() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const s = await res.json();
          const root = document.documentElement;
          if (s.primaryColor) {
            root.style.setProperty("--brand", s.primaryColor);
            root.style.setProperty("--color-primary", s.primaryColor);
          }
          if (s.secondaryColor) {
            root.style.setProperty("--brand-600", s.secondaryColor);
            root.style.setProperty("--color-secondary", s.secondaryColor);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    function applyColorMode() {
      const mode = localStorage.getItem("colorMode") || "system";
      const root = document.documentElement;

      root.classList.remove("theme-light", "theme-dark");

      if (mode === "light") {
        root.classList.add("theme-light");
      } else if (mode === "dark") {
        root.classList.add("theme-dark");
      } else {
        // system theme (do nothing, media queries handle it, or we can check matchMedia)
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isDark ? "theme-dark" : "theme-light");
      }
    }

    fetchAndApplyTheme();
    applyColorMode();

    const handleThemeChanged = () => {
      fetchAndApplyTheme();
      applyColorMode();
    };

    window.addEventListener("themeChanged", handleThemeChanged);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if ((localStorage.getItem("colorMode") || "system") === "system") {
        applyColorMode();
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener("themeChanged", handleThemeChanged);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [pathname]);

  return null;
}
