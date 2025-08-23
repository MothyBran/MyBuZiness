// /lib/appBrand.js
// Leitet Theme/Brand-Informationen aus den Settings ab.

const DEFAULTS = {
  headerTitle: "MyBuZiness",
  primaryColor: "#111111",
  accentColor: "#2563eb",
  backgroundColor: "#fafafa",
  textColor: "#111111",
  borderRadius: 12,
  fontFamily: "system-ui, sans-serif",
  showLogo: true,
  logoUrl: null,
};

export function brandFromSettings(settings = {}) {
  const s = { ...DEFAULTS, ...settings };
  return {
    title: s.headerTitle || DEFAULTS.headerTitle,
    colors: {
      primary: s.primaryColor || DEFAULTS.primaryColor,
      accent: s.accentColor || DEFAULTS.accentColor,
      background: s.backgroundColor || DEFAULTS.backgroundColor,
      text: s.textColor || DEFAULTS.textColor,
    },
    borderRadius: Number.isFinite(+s.borderRadius) ? +s.borderRadius : DEFAULTS.borderRadius,
    fontFamily: s.fontFamily || DEFAULTS.fontFamily,
    logo: {
      show: s.showLogo !== false,
      url: s.logoUrl || null,
      // optional: dataUrl aus logoDataBase64
      dataUrl:
        s.logoDataBase64 && s.logoMime
          ? `data:${s.logoMime};base64,${s.logoDataBase64}`
          : null,
    },
  };
}

export function cssVars(brand) {
  const b = brandFromSettings(brand);
  return {
    "--brand-primary": b.colors.primary,
    "--brand-accent": b.colors.accent,
    "--brand-bg": b.colors.background,
    "--brand-text": b.colors.text,
    "--brand-radius": `${b.borderRadius}px`,
    "--brand-font": b.fontFamily,
  };
}
