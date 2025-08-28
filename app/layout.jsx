// app/layout.jsx
import "./globals.css";
import HeaderTop from "./components/HeaderTop";
import InfoStripe from "./components/InfoStripe";
import InstallPrompt from "./components/InstallPrompt";
import RegisterSW from "./register-sw";

export const metadata = {
  title: "BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  // Hinweis: Alternativ könntest du hier auch manifest: "/manifest.webmanifest" setzen.
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        {/* PWA: Manifest + Theme Color */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        {/* iOS Standalone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body style={{ overflowX: "hidden" }}>
        {/* Kopfzeile */}
        <HeaderTop />
        {/* Farbstreifen darunter */}
        <InfoStripe position="top" showText={true} />

        {/* Seiten-Container */}
        <main className="container">
          {children}
        </main>

        {/* Unterer Farbstreifen */}
        <InfoStripe position="bottom" showText={false} />

        {/* Footer */}
        <footer
          className="container"
          style={{ paddingTop: 30, paddingBottom: 30, color: "var(--color-muted)", fontSize: 13 }}
        >
          <div style={{ borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 14 }}>
            © {new Date().getFullYear()} BuZiness – Eine WebApp der XYZ GmbH. Alle Rechte vorbehalten.
            <br />
            Kleinunternehmerregelung gem. § 19 UStG: Es erfolgt kein Ausweis der Umsatzsteuer.
          </div>
        </footer>

        {/* PWA: Service Worker registrieren */}
        <RegisterSW />

        {/* Installations-Popup (PWA „Zum Startbildschirm hinzufügen“) */}
        <InstallPrompt />
      </body>
    </html>
  );
}
