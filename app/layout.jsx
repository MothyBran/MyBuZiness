// app/layout.jsx (Ausschnitt)
import "./globals.css";
import TopBar from "@/components/TopBar";
import InfoStripe from "@/components/InfoStripe";
// ggf. dein Footer importieren
import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {/* Header oben */}
        <TopBar />

        {/* NEU: Info-Streifen direkt unter TopBar mit Text */}
        <InfoStripe position="top" showText={true} />

        {/* Hauptinhalt */}
        <div style={{ maxWidth: 960, margin: "12px auto 24px", padding: "0 16px" }}>
          {children}
        </div>

        {/* NEU: Farb-Streifen über der Fußzeile, ohne Text */}
        <InfoStripe position="bottom" showText={false} />

        {/* Footer unten */}
        <Footer />
      </body>
    </html>
  );
}
