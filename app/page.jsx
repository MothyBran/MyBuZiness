// app/page.jsx
export default function Home() {
  return (
    <main style={{
      fontFamily: "ui-sans-serif, system-ui",
      minHeight: "100vh",
      display: "grid",
      placeItems: "center"
    }}>
      <div style={{ textAlign: "center" }}>
        <h1>MyBuZiness läuft 🚀</h1>
        <p>Backend‑Checks: <a href="/api/ping">/api/ping</a> · <a href="/api/diagnose">/api/diagnose</a></p>
      </div>
    </main>
  );
}
