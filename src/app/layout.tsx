// app/layout.tsx
// ⚠️ DEBUG: radikal sichtbarer Inline-Style am <body>, unabhängig von CSS-Dateien
export const metadata = {
  title: "MyBuZiness",
  description: "Business Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body
        data-css-hook="on"
        style={{
          background: "#ff00aa",              // KNALL-PINK
          color: "#0b1220",
          minHeight: "100vh",
          margin: 0,
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial",
        }}
      >
        {/* DEBUG-Badge ohne CSS */}
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            zIndex: 99999,
            background: "#22c55e",
            color: "#0b1220",
            fontWeight: 700,
            padding: "6px 10px",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,.35)",
            letterSpacing: ".4px",
          }}
        >
          LAYOUT AKTIV
        </div>
        {children}
      </body>
    </html>
  );
}
