// app/layout.js
import Header from "./components/Header";
import { initDb, q } from "@/lib/db";

export const dynamic = "force-dynamic"; // stellt sicher, dass Settings bei jedem Request frisch sind

export const metadata = {
  title: "MyBuZiness",
  description: "WebApp – Business Tool",
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

  const title = s?.headerTitle || "MyBuZiness";
  const showLogo = !!s?.showLogo;
  // Logo-Reihenfolge: DB-Logo-Endpunkt → explizite URL → (kein Logo)
  const logoUrl = showLogo
    ? (s?.logoUrl ? s.logoUrl : "/api/settings/logo")
    : "";

  // Theme-Variablen (Fallbacks)
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
      <body
        style={{
          margin: 0,
          background: theme.background,
          color: theme.text,
          fontFamily: theme.font,
        }}
      >
        {/* CSS-Variablen global setzen */}
        <style>{`
          :root{
            --color-primary: ${theme.primary};
            --color-accent: ${theme.accent};
            --color-bg: ${theme.background};
            --color-text: ${theme.text};
            --radius: ${theme.radius}px;
            --font-family: ${theme.font};
          }
          a { color: inherit; }
          button { font-family: var(--font-family); }
        `}</style>

        <Header
          title={title}
          showLogo={showLogo}
          logoUrl={logoUrl}
        />

        <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
