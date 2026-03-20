import "./globals.css";
import React from "react";
import HeaderTop from "./components/HeaderTop";
import AppFooter from "./components/AppFooter";
import InstallPrompt from "./components/InstallPrompt";
import Sidebar from "./components/Sidebar";
import ViewportManager from "./components/ViewportManager";
import { getUser } from "@/lib/auth";

export const metadata = {
  title: "My BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default async function RootLayout({ children }) {
  const user = await getUser();

  return (
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body>
        <ViewportManager />
        {user ? (
          <>
            {/* Desktop Sidebar (Fixed) */}
            <Sidebar user={user} />

            {/* Main Content Wrapper */}
            <div className="app-shell">
              {/* Optionaler Header */}
              {HeaderTop ? <HeaderTop user={user} /> : null}

              {/* Hauptinhalt – alle Seiten nutzen <div className="page"> via UI.Page */}
              <main className="main-content">{children}</main>

              {/* Optionaler Footer */}
              {AppFooter ? <AppFooter /> : null}
            </div>

            {/* PWA-Installations-Hinweis (falls PWA) */}
            {InstallPrompt ? <InstallPrompt /> : null}
          </>
        ) : (
          <main className="auth-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg)" }}>
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
