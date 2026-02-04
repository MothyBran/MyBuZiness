import "./globals.css";
import React from "react";
import HeaderTop from "./components/HeaderTop";
import AppFooter from "./components/AppFooter";
import InstallPrompt from "./components/InstallPrompt";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "My BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {/* Desktop Sidebar (Fixed) */}
        <Sidebar />

        {/* Main Content Wrapper */}
        <div className="app-shell">
          {/* Optionaler Header */}
          {HeaderTop ? <HeaderTop /> : null}

          {/* Hauptinhalt – alle Seiten nutzen <div className="page"> via UI.Page */}
          <main className="main-content">{children}</main>

          {/* Optionaler Footer */}
          {AppFooter ? <AppFooter /> : null}
        </div>

        {/* PWA-Installations-Hinweis (falls PWA) */}
        {InstallPrompt ? <InstallPrompt /> : null}
      </body>
    </html>
  );
}
