// app/layout.jsx
import "./globals.css";
import Nav from "./nav";

export const metadata = {
  title: "MyBuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
          background: "#f7f7fb",
          color: "#111827",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
          <aside
            style={{
              background: "#0f172a",
              color: "#e5e7eb",
              padding: "1rem",
              position: "sticky",
              top: 0,
              height: "100vh",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>
              MyBuZiness
            </div>
            <Nav />
          </aside>

          <main style={{ padding: "1.25rem 1.5rem" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
