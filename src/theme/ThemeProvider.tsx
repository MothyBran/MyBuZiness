import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Settings = {
  primaryColor?: string; secondaryColor?: string; accentColor?: string;
  backgroundColor?: string; textColor?: string; borderRadius?: number;
  fontFamily?: string; headerTitle?: string; companyName?: string;
  currency?: string; currencyDefault?: string;
};

type ThemeCtx = { settings: Settings | null; loading: boolean; refresh: () => void; };

const ThemeContext = createContext<ThemeCtx>({ settings: null, loading: true, refresh: () => {} });

function applyCssVariables(s: Settings | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  const set = (k: string, v?: string | number, fallback?: string | number) => {
    root.setProperty(k, String(v ?? fallback));
  };

  set("--color-primary", s?.primaryColor, "#111827");
  set("--color-secondary", s?.secondaryColor, "#0ea5e9");
  set("--color-accent", s?.accentColor, "#22c55e");
  set("--color-bg", s?.backgroundColor, "#0b1220");
  set("--color-text", s?.textColor, "#e5e7eb");
  set("--radius", s?.borderRadius ?? 12);
  set("--font-family", s?.fontFamily ?? "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji");
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = res.ok ? await res.json() : null;
      setSettings(data || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { applyCssVariables(settings); }, [settings]);

  const value = useMemo(() => ({ settings, loading, refresh: load }), [settings, loading]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
