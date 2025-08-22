// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Settings = {
  primaryColor?: string; secondaryColor?: string; accentColor?: string;
  backgroundColor?: string; textColor?: string; borderRadius?: number;
  fontFamily?: string; headerTitle?: string; companyName?: string;
  currency?: string; currencyDefault?: string;
};

type Ctx = { settings: Settings | null; loading: boolean; refresh: () => void; };
const ThemeContext = createContext<Ctx>({ settings: null, loading: true, refresh: () => {} });

function apply(s: Settings | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  const set = (k: string, v?: string | number, fb?: string | number) => root.setProperty(k, String(v ?? fb));
  set("--color-primary", s?.primaryColor, "#111827");
  set("--color-secondary", s?.secondaryColor, "#0ea5e9");
  set("--color-accent", s?.accentColor, "#22c55e");
  set("--color-bg", s?.backgroundColor, "#0b1220");
  set("--color-text", s?.textColor, "#e5e7eb");
  set("--radius", s?.borderRadius ?? 12);
  set("--font-family", s?.fontFamily ?? "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial");
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      let payload: any = {};
      try { payload = await res.json(); } catch {}
      // Akzeptiere sowohl {data:{...}} als auch {...}:
      const data = payload?.data ?? payload ?? {};
      setSettings(data);
    } catch {
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { apply(settings); }, [settings]);

  const value = useMemo(() => ({ settings, loading, refresh: load }), [settings, loading]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
