import "./globals.css";
import React from "react";

/* Falls du eigene Komponenten schon hast, importiere sie hier.
   Wenn nicht vorhanden, die Imports einfach entfernen oder anpassen. */
import HeaderTop from "./components/HeaderTop";
import AppFooter from "./components/AppFooter";
import InstallPrompt from "./components/InstallPrompt";

export const metadata = {
  title: "My BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ overflowX: "hidden" }}>
        {/* Optionaler Header */}
        {HeaderTop ? <HeaderTop /> : null}

        {/* Hauptinhalt – alle Seiten nutzen <div className="page"> via UI.Page */}
        <main>{children}</main>

        {/* Optionaler Footer */}
        {AppFooter ? <AppFooter /> : null}

        {/* PWA-Installations-Hinweis (falls PWA) */}
        {InstallPrompt ? <InstallPrompt /> : null}
      </body>
    </html>
  );
}
