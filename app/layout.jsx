import "./globals.css";
import HeaderTop from "./components/HeaderTop";
import InfoStripe from "./components/InfoStripe";

export const metadata = {
  title: "BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ overflowX: "hidden", width: "100%", maxWidth: "100%" }}>
        {/* Obere Kopfzeile bleibt unverändert */}
        <HeaderTop />
        {/* Farbstreifen darunter (Text ein/aus je nach Position) */}
        <InfoStripe position="top" showText={true} />

        {/* Seiten-Container */}
        <main className="container" style={{ width: "100%", maxWidth: "100%" }}>
          {children}
        </main>

        {/* Unterer Farbstreifen ohne Text */}
        <InfoStripe position="bottom" showText={false} />

        {/* Footer */}
        <footer
          className="container"
          style={{ paddingTop: 30, paddingBottom: 30, color: "var(--muted)", fontSize: 13 }}
        >
          <div style={{ borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 14 }}>
            © {new Date().getFullYear()} BuZiness – Eine WebApp der XYZ GmbH. Alle Rechte vorbehalten.
            <br />
            Kleinunternehmerregelung gem. § 19 UStG: Es erfolgt kein Ausweis der Umsatzsteuer.
          </div>
        </footer>
      </body>
    </html>
  );
}
