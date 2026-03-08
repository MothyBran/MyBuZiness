"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const calculateStrength = (pwd) => {
    if (!pwd) return { label: "", color: "transparent", score: 0 };

    let baseScore = 0;
    if (pwd.length >= 8) baseScore += 1;
    if (/[a-z]/.test(pwd)) baseScore += 1;
    if (/[A-Z]/.test(pwd)) baseScore += 1;
    if (/[0-9]/.test(pwd)) baseScore += 1;

    // If not all mandatory requirements are met, it's unsafe
    if (baseScore < 4) {
      return { label: "Unsicher", color: "var(--error)", score: baseScore };
    }

    // Bonus for special characters only if base requirements are met
    if (/[^A-Za-z0-9]/.test(pwd)) {
      return { label: "Sehr sicher", color: "var(--success)", score: 5 };
    }

    return { label: "Sicher", color: "var(--warning)", score: 4 };
  };

  const strength = calculateStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();

    if (strength.score < 4) {
      setError("Das Passwort ist zu unsicher.");
      return;
    }

    if (!passwordsMatch) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

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
        window.location.href = `/login?email=${encodeURIComponent(email)}`;
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
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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
          {password && (
            <div style={{ marginTop: "0.25rem" }}>
              <div style={{
                height: "4px",
                width: "100%",
                backgroundColor: "var(--panel-2)",
                borderRadius: "2px",
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: strength.score < 4 ? "33%" : strength.score === 4 ? "66%" : "100%",
                  backgroundColor: strength.color,
                  transition: "all 0.3s ease"
                }} />
              </div>
              <div style={{ fontSize: "0.75rem", color: strength.color, marginTop: "0.25rem", textAlign: "right" }}>
                {strength.label}
              </div>
            </div>
          )}
        </div>

        <div className="field">
          <label className="label">Passwort wiederholen</label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={{ paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              title={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
             <div style={{ fontSize: "0.75rem", color: "var(--error)", marginTop: "0.25rem" }}>
                Passwörter stimmen nicht überein
             </div>
          )}
        </div>

        <button type="submit" className="btn btn--primary" style={{ marginTop: "1rem", justifyContent: "center" }} disabled={loading || (password && strength.score < 4)}>
          {loading ? "Wird erstellt..." : "Registrieren"}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--muted)" }}>
        Bereits ein Konto? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 500 }}>Anmelden</Link>
      </div>
    </div>
  );
}
