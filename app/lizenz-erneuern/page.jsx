"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function RenewLicensePage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError("Bitte geben Sie einen gültigen Lizenzschlüssel ein.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/renew-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Es ist ein Fehler aufgetreten.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--background)",
      padding: "1rem"
    }}>
      <div className="surface" style={{
        maxWidth: "400px",
        width: "100%",
        padding: "2rem",
        textAlign: "center"
      }}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={64}
          height={64}
          style={{ borderRadius: "12px", marginBottom: "1.5rem" }}
          priority
        />
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Lizenz abgelaufen</h1>
        <p style={{ color: "var(--muted)", marginBottom: "2rem", lineHeight: 1.5 }}>
          Ihre Testphase ist leider abgelaufen. Bitte geben Sie einen neuen Lizenzschlüssel ein, um weiterhin vollen Zugriff auf Ihre Unternehmensdaten zu haben.
        </p>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "var(--error)",
            padding: "0.75rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "0.875rem"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
              Neuer Lizenzschlüssel
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="XXX-XXX-XXX"
              className="input"
              style={{ width: "100%", textAlign: "center", letterSpacing: "2px", fontFamily: "monospace", fontSize: "1.1rem" }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
            disabled={loading}
          >
            {loading ? "Wird geprüft..." : "Lizenz aktivieren"}
          </button>
        </form>

        <button
          onClick={handleLogout}
          className="btn btn--secondary"
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}
