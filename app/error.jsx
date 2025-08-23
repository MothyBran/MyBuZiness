// app/error.jsx
"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Serverseitiges Log für den Stack
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
        <h1>Es ist ein Fehler aufgetreten</h1>
        <p>Bitte versuche es erneut oder lade die Seite neu.</p>
        <pre
          style={{
            background: "#111",
            color: "#eee",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto",
            marginTop: 12,
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
            border: "1px solid #ccc",
            background: "#
