"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (data.ok) {
        window.location.href = "/";
      } else {
        setError(data.error || "Registrierung fehlgeschlagen.");
        setLoading(false);
      }
    } catch (err) {
      setError("Ein Fehler ist aufgetreten.");
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Image src="/logo.png" alt="MyBuZiness" width={64} height={64} style={{ borderRadius: "12px", marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Konto erstellen</h1>
        <p style={{ color: "var(--muted)" }}>Starten Sie mit MyBuZiness.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        {error && (
          <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", color: "var(--error)", borderRadius: "6px", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <div className="field">
          <label className="label">Name / Firmenname</label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="z.B. Max Mustermann"
          />
        </div>

        <div className="field">
          <label className="label">E-Mail Adresse</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="label">Passwort</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="btn btn--primary" style={{ marginTop: "1rem", justifyContent: "center" }} disabled={loading}>
          {loading ? "Wird erstellt..." : "Registrieren"}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--muted)" }}>
        Bereits ein Konto? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 500 }}>Anmelden</Link>
      </div>
    </div>
  );
}
