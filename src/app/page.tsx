// app/page.tsx
"use client";

export default function Page() {
  return (
    <div
      style={{
        background: "#fff",
        border: "6px dashed #111827",
        padding: 20,
        maxWidth: 1000,
        margin: "24px auto",
        borderRadius: 12,
      }}
    >
      <h1 style={{ marginTop: 0 }}>APP ROUTER: /</h1>
      <p>
        Wenn du diese Box siehst, rendert die <strong>App Router Startseite</strong>.
        (Noch ohne dein SPA, nur zum Test.)
      </p>
    </div>
  );
}
