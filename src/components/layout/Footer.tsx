import React from "react";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.08)", marginTop: 24 }}>
      <div className="container" style={{ padding: "16px", color: "var(--color-muted)" }}>
        © {new Date().getFullYear()} MyBuZiness
      </div>
    </footer>
  );
}
