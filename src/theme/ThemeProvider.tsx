// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSettings } from "../utils/api";
import { Settings } from "../utils/types";

type ThemeContextType = {
  settings: Settings | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  settings: null,
  isLoading: true,
  reload: async () => {},
});

function applyCssVars(s?: Settings | null) {
  const r = document.documentElement;
  const withFallback = <T extends string | number | undefined>(v: T, fb: string) =>
    (v === undefined || v === null || v === "" ? fb : String(v));

  r.style.setProperty("--color-primary", withFallback(s?.primaryColor, "#0ea5e9"));
  r.style.setProperty("--color-secondary", withFallback(s?.secondaryColor ?? s?.accentColor, "#22c55e"));
  r.style.setProperty("--color-accent", withFallback(s?.accentColor ?? s?.secondaryColor, "#6366f1"));
  r.style.setProperty("--color-bg", withFallback(s?.backgroundColor, "#0b1220"));
  r.style.setProperty("--color-text", withFallback(s?.textColor ?? s?.fontColor, "#e5e7eb"));
  r.style.setProperty("--radius", withFallback(String(s?.borderRadius ?? 16), "16"));
  r.style.setProperty("--font-family", withFallback(s?.fontFamily, "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"));
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = async () => {
    setIsLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
      applyCssVars(data);
    } catch (e) {
      console.error("Settings load failed", e);
      applyCssVars(null);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const value = useMemo(() => ({ settings, isLoading, reload }), [settings, isLoading]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
