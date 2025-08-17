import "./globals.css";

export const metadata = {
  title: "BuZiness",
  description: "Schnell erfassen, sicher verwalten.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ overflowX: "hidden", width: "100%", maxWidth: "100%" }}>
        {/* ======= MARKER: Wenn du diesen Balken siehst, ist DIESES layout.jsx aktiv ======= */}
        <div id="layout-proof"
             style={{background:"#cffafe", borderBottom:"1px solid #06b6d4", padding:"6px 12px", fontSize:12}}>
          LAYOUT AKTIV ✅ (app/layout.jsx aus dem Root-/app)
        </div>

        {/* ======= Header + Module-Panel (inline, ohne externe Komponenten) ======= */}
        <header className="hero">
          <div className="container" style={{ paddingTop: 14, paddingBottom: 10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:14, alignItems:"center" }}>
              {/* Logo */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <img src="/logo.svg" alt="BuZiness Logo" width={42} height={42} style={{ borderRadius:10 }} />
              </div>

              {/* Titel, Claim, Auth */}
              <div style={{ minWidth:0 }}>
                <h1 className="page-title" style={{ margin:0 }}>BuZiness</h1>
                <p className="subtle" style={{ marginTop:4 }}>„Schnell erfassen, sicher verwalten.“</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
                  <a href="/login" className="btn-ghost">Anmelden</a>
                  <a href="/register" className="btn">Registrieren</a>
                </div>
              </div>

              {/* Module öffnen/schließen */}
              <div>
                <button id="module-toggle" className="btn-ghost">Module öffnen</button>
              </div>
            </div>

            {/* Module-Panel */}
            <div id="module-panel"
                 className="surface"
                 style={{
                   marginTop:12, padding:12, borderRadius:"var(--radius)",
                   boxShadow:"var(--shadow-md)", display:"none"
                 }}>
              <div style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))" }}>
                {[
                  { href:"/", label:"Dashboard" },
                  { href:"/kunden", label:"Kunden" },
                  { href:"/produkte", label:"Produkte & Dienstleistungen" },
                  { href:"/rechnungen", label:"Rechnungen" },
                  { href:"/belege", label:"Belege" },
                  { href:"/einstellungen", label:"Einstellungen" },
                ].map((m) => (
                  <a key={m.href} href={m.href}
                     className="module-pill"
                     style={{
                       display:"flex", alignItems:"center", justifyContent:"center",
                       padding:"12px 14px", borderRadius:12, border:"1px solid rgba(0,0,0,.08)",
                       background:"#fff", boxShadow:"var(--shadow-xs)", textDecoration:"none",
                       color:"inherit", fontWeight:600,
                       transition:"transform .12s ease, box-shadow .12s ease, border-color .12s ease"
                     }}>
                    {m.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* kleines Inline-Script, damit das Panel ohne React-Client-Code klappt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var btn = document.getElementById('module-toggle');
                var panel = document.getElementById('module-panel');
                if (btn && panel) {
                  btn.addEventListener('click', function(){
                    var open = panel.style.display !== 'none';
                    panel.style.display = open ? 'none' : 'block';
                    btn.textContent = open ? 'Module öffnen' : 'Module schließen';
                  });
                }
              })();
            `,
          }}
        />

        {/* ======= Inhalt ======= */}
        <main style={{ flex:1, width:"100%", maxWidth:"100%", overflowX:"hidden" }}>
          {children}
        </main>

        {/* ======= Footer ======= */}
        <footer className="container" style={{ paddingTop:30, paddingBottom:30, color:"var(--muted)", fontSize:13 }}>
          <div style={{ borderTop:"1px solid rgba(0,0,0,.06)", paddingTop:14 }}>
            © {new Date().getFullYear()} BuZiness – Eine WebApp der XYZ GmbH. Alle Rechte vorbehalten.
            <br />
            Kleinunternehmerregelung gem. § 19 UStG: Es erfolgt kein Ausweis der Umsatzsteuer.
          </div>
        </footer>
      </body>
    </html>
  );
}
