"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // Can be actual password or initial login code
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Setup Password State (Step 2)
  const [step, setStep] = useState(1);
  const [newPassword, setNewPassword] = useState("");
  const [initialCode, setInitialCode] = useState("");

  useEffect(() => {
    // Read the email from the URL parameter if available
    const searchParams = new URLSearchParams(window.location.search);
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.ok) {
        if (data.needsPasswordSetup) {
          // Move to Step 2
          setInitialCode(data.initialCode);
          setStep(2);
          setLoading(false);
        } else {
          // Normal login
          window.location.href = "/";
        }
      } else {
        setError(data.error || "Anmeldung fehlgeschlagen.");
        setLoading(false);
      }
    } catch (err) {
      setError("Ein Fehler ist aufgetreten.");
      setLoading(false);
    }
  }

  async function handleSetupPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, initialCode, newPassword }),
      });
      const data = await res.json();

      if (data.ok) {
        window.location.href = "/"; // Logged in
      } else {
        setError(data.error || "Passwort konnte nicht gespeichert werden.");
        setLoading(false);
      }
    } catch (err) {
      setError("Ein Fehler ist aufgetreten.");
      setLoading(false);
    }
  }

  if (step === 2) {
    return (
      <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Image src="/logo.png" alt="MyBuZiness" width={64} height={64} style={{ borderRadius: "12px", marginBottom: "1rem" }} />
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Passwort festlegen</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Bitte legen Sie für Ihr Konto ein sicheres Passwort fest, um fortzufahren.</p>
        </div>

        <form onSubmit={handleSetupPassword} style={{ display: "grid", gap: "1rem" }}>
          {error && (
            <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", color: "var(--error)", borderRadius: "6px", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div className="field">
            <label className="label">Neues Passwort</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "0.25rem"
                }}
                title={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <span className="subtle" style={{ fontSize: "0.75rem", display: "block", marginTop: "4px" }}>
              Min. 8 Zeichen, mind. ein Großbuchstabe, ein Kleinbuchstabe und eine Zahl.
            </span>
          </div>

          <button type="submit" className="btn btn--primary" style={{ marginTop: "1rem", justifyContent: "center" }} disabled={loading}>
            {loading ? "Wird gespeichert..." : "Passwort speichern und anmelden"}
          </button>

          <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={loading} style={{ justifyContent: "center" }}>
            Zurück
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Image src="/logo.png" alt="MyBuZiness" width={64} height={64} style={{ borderRadius: "12px", marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Willkommen zurück</h1>
        <p style={{ color: "var(--muted)" }}>Bitte melden Sie sich an.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        {error && (
          <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", color: "var(--error)", borderRadius: "6px", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <div className="field">
          <label className="label">E-Mail Adresse</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label">Passwort (oder Erst-Login Code)</label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "0.25rem"
              }}
              title={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn--primary" style={{ marginTop: "1rem", justifyContent: "center" }} disabled={loading}>
          {loading ? "Wird angemeldet..." : "Anmelden"}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--muted)" }}>
        Noch kein Konto? <Link href="/register" style={{ color: "var(--brand)", fontWeight: 500 }}>Jetzt registrieren</Link>
      </div>
    </div>
  );
}
