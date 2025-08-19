import "./globals.css";
import HeaderTop from "@/components/HeaderTop";
import InfoStripe from "@/components/InfoStripe";
import FooterStripe from "@/components/FooterStripe";
import ThemeBridge from "@/components/ThemeBridge";

export const metadata = {
  title: "BuZiness – Schnell erfassen, sicher verwalten.",
  description: "Leichtgewichtiges WebApp-Tool für Kleingewerbe",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {/* Globale Theme-Kopplung */}
        <ThemeBridge />

        {/* Top-Header der App (deine bestehende Komponente) */}
        <HeaderTop />

        {/* Info-Streifen (Farbleiste + Firmeninfos) */}
        <InfoStripe />

        {/* Haupt-Container */}
        <div className="container">
          {children}
        </div>

        {/* Farbstreifen über der Fußzeile */}
        <FooterStripe />

        {/* Fußzeile (falls vorhanden – hier sehr schlicht) */}
        <footer style={{ padding: "24px 16px", textAlign: "center", color: "var(--color-text,#0f172a)" }}>
          <small>© {new Date().getFullYear()} BuZiness – Schnell erfassen, sicher verwalten.</small>
        </footer>
      </body>
    </html>
  );
}
