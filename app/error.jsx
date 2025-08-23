// app/error.jsx
"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Stack im Server-Log sichtbar machen
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f7",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0, marginBottom: 8 }}>
          Es ist ein Fehler aufgetreten
        </h1>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Bitte versuche es erneut oder lade die Seite neu.
        </p>

        <pre
          style={{
            background: "#111827",
            color: "#e5e7eb",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto",
            marginTop: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
{String(error?.message || "Unknown error")}
        </pre>

        <button
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#fafafa",
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
