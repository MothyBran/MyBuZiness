// app/[...slug]/page.tsx
"use client";

export default function CatchAll() {
  return (
    <div
      style={{
        background: "#fff",
        border: "6px dashed #0ea5e9",
        padding: 20,
        maxWidth: 1000,
        margin: "24px auto",
        borderRadius: 12,
      }}
    >
      <h1 style={{ marginTop: 0, color: "#0ea5e9" }}>APP ROUTER: CATCH-ALL</h1>
      <p>
        Wenn du diese Box siehst, rendert die <strong>Catch‑All‑Seite</strong> des App Routers
        (alle Pfade außer /api werden hier gefangen).
      </p>
    </div>
  );
}
