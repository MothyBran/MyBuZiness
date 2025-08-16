// app/layout.js
import TopBar from "./components/TopBar";
import Header from "./components/Header";
import AppFooter from "./components/AppFooter";
import { initDb, q } from "@/lib/db";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "BuZiness",
  description: "Schnell erfassen, sicher Verwalten.",
};

async function getSettings() {
  try {
    await initDb();
    const row = (await q(`SELECT * FROM "Settings" WHERE "id"='singleton'`)).rows[0] || null;
    return row;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }) {
  const s = await getSettings();

  const title = s?.headerTitle || "MyBuZiness"; // Nutzer-Header (Menü) – darf von Einstellungen kommen
  const showLogo = !!s?.showLogo;
  const logoUrl = showLogo ? (s?.logoUrl ? s.logoUrl : "/api/settings/logo") : "";

  const theme = {
    primary: s?.primaryColor || "#111111",
    accent: s?.accentColor || "#2563eb",
    background: s?.backgroundColor || "#fafafa",
    text: s?.textColor || "#111111",
    radius: Number.isFinite(s?.borderRadius) ? s.borderRadius : 12,
    font: s?.fontFamily || "system-ui, sans-serif",
  };

  return (
    <html lang="de">
      <body>
        {/* CSS-Variablen setzen */}
        <style>{`
          :root {
            --color-primary: ${theme.primary};
            --color-accent: ${theme.accent};
            --color-bg: ${theme.background};
            --color-text: ${theme.text};
            --radius: ${theme.radius}px;
            --font-family: ${theme.font};
          }
          body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-family); }
        `}</style>

        {/* NEU: Brand-Leiste ganz oben */}
        <TopBar />

        {/* Bestehender Navigations-Header deiner App */}
        <Header title={title} showLogo={showLogo} logoUrl={logoUrl} />

        {/* Inhalt */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
          {children}
        </div>

        {/* NEU: Footer mit Anbieterangaben */}
        <AppFooter />
      </body>
    </html>
  );
}
