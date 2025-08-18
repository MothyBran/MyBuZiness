// app/layout.jsx
import "./globals.css";
import HeaderTop from "@/components/HeaderTop";
import InfoStripe from "@/components/InfoStripe";

export const metadata = {
  title: "BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {/* Dein Header (unverändert) */}
        <HeaderTop />

        {/* NEU: Streifen direkt unter dem Header mit Text */}
        <InfoStripe position="top" showText={true} />

        {/* Hauptinhalt */}
        <div style={{ maxWidth: 960, margin: "12px auto 24px", padding: "0 16px" }}>
          {children}
        </div>

        {/* NEU: Streifen über der Fußzeile ohne Text */}
        <InfoStripe position="bottom" showText={false} />

        {/* Footer */}
        <Footer />
      </body>
    </html>
  );
}
