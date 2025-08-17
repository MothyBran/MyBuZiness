import "./globals.css";

import HeaderTop from "@/app/components/HeaderTop";

export const metadata = {
  title: "BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {/* Neuer Header mit Logo, Claim, Auth-Buttons & Modul-Panel */}
        <HeaderTop />

        {/* Hauptinhalt */}
        <main style={{ flex: 1, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
          {children}
        </main>

        {/* Footer mit Firmendaten */}
        <footer
          className="container"
          style={{
            paddingTop: 30,
            paddingBottom: 30,
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,.06)",
              paddingTop: 14,
            }}
          >
            © {new Date().getFullYear()} BuZiness – Eine WebApp der XYZ GmbH. Alle Rechte
            vorbehalten.
            <br />
            Kleinunternehmerregelung gem. § 19 UStG: Es erfolgt kein Ausweis der Umsatzsteuer.
          </div>
        </footer>
      </body>
    </html>
  );
}
