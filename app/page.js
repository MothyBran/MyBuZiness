"use client";

import { useEffect, useState } from "react";

export default function DashboardTest() {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(true); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0 }}>Test: App Router aktiv</h2>
      <p style={{ marginTop: 6, color: "#666" }}>
        Wenn du oben <strong>Logo + „BuZiness“ + Anmelden/Registrieren</strong> siehst,
        kommt der Header aus <code>app/components/HeaderTop.jsx</code> und
        <code>app/layout.jsx</code> wird genutzt.
      </p>

      <div style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid #eee",
        borderRadius: 12,
        background: "#fff"
      }}>
        <div><strong>Client Hooks laufen:</strong> {ok ? "JA ✅" : "NEIN ❌"}</div>
        <div style={{ marginTop: 6 }}>
          <code>app/page.jsx</code> rendert diese Box. Wenn sich hier etwas ändert, greift die Datei.
        </div>
      </div>
    </div>
  );
}
