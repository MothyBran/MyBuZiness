export const metadata = {
  title: "MyBuZiness",
  description: "WebApp – Business Tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: "#fafafa" }}>
        {/* >>> TEST-NAV direkt im Layout (Header.jsx wird NICHT benutzt) <<< */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16,
          borderBottom: "1px solid #eee",
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 10
        }}>
          <strong>MyBuZiness • LAYOUT v3</strong>
          <nav style={{ display: "flex", gap: 8 }}>
            <a href="/" style={linkStyle("/")}>Start</a>
            <a href="/kunden" style={linkStyle("/kunden")}>Kunden</a>
            <a href="/produkte" style={linkStyle("/produkte")}>Produkte</a>
          </nav>
        </header>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
          {children}
          <p style={{marginTop: 32, fontSize: 12, color: "#999"}}>
            Build-Stamp: LAYOUT-V3—{new Date().toISOString()}
          </p>
        </div>

        <style>{`
          a { text-decoration: none }
        `}</style>
      </body>
    </html>
  );
}

function linkStyle(href) {
  // simpler Style, ohne aktive Route
  return {
    padding: "8px 12px",
    borderRadius: 8,
    color: "#111",
    background: "transparent",
    border: "1px solid #111",
    fontSize: 14,
  };
}
