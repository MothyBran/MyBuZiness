"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.ok) {
        router.push("/admin");
      } else {
        setError(data.error || "Login fehlgeschlagen.");
        setLoading(false);
      }
    } catch (err) {
      setError("Ein Fehler ist aufgetreten.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Image src="/logo.png" alt="MyBuZiness" width={64} height={64} style={{ borderRadius: "12px", marginBottom: "1rem" }} />
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Admin Dashboard</h1>
          <p style={{ color: "var(--muted)" }}>Bitte authentifizieren Sie sich.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          {error && (
            <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", color: "var(--error)", borderRadius: "6px", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div className="field">
            <label className="label">Passwort</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn--primary" style={{ marginTop: "1rem", justifyContent: "center" }} disabled={loading}>
            {loading ? "Bitte warten..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
