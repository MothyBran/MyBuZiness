"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminDashboardPage() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [licenseKind, setLicenseKind] = useState("lifetime");
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchLicenses();
  }, []);

  async function fetchLicenses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licenses");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setLicenses(data.licenses);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Fehler beim Laden der Lizenzen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateLicense() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: licenseKind })
      });
      const data = await res.json();
      if (data.ok) {
        await fetchLicenses();
      } else {
        alert(data.error || "Fehler beim Generieren");
      }
    } catch (err) {
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <header style={{
        background: "var(--panel)",
        borderBottom: "1px solid var(--border)",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Image src="/logo.png" alt="Logo" width={40} height={40} style={{ borderRadius: "8px" }} />
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Admin Dashboard</h1>
        </div>
        <button onClick={handleLogout} className="btn btn--secondary" style={{ padding: "0.5rem 1rem" }}>
          Abmelden
        </button>
      </header>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Lizenzverwaltung</h2>
            <p style={{ color: "var(--muted)", margin: 0 }}>Verwalten und generieren Sie Lizenzschlüssel für die Registrierung.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <select
              value={licenseKind}
              onChange={(e) => setLicenseKind(e.target.value)}
              style={{
                padding: "0.5rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--text)"
              }}
            >
              <option value="lifetime">Lifetime</option>
              <option value="trial">14 Tage Test</option>
            </select>
            <button
              onClick={handleGenerateLicense}
              className="btn btn--primary"
              disabled={generating}
            >
              {generating ? "Generiere..." : "+ Neuen Schlüssel generieren"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: "1rem", background: "rgba(239,68,68,0.1)", color: "var(--error)", borderRadius: "8px", marginBottom: "2rem" }}>
            {error}
          </div>
        )}

        <div className="surface" style={{ padding: 0, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Lade Lizenzen...</div>
          ) : licenses.length === 0 ? (
             <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Noch keine Lizenzen vorhanden.</div>
          ) : (
            <table className="table" style={{ width: "100%", minWidth: "600px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Lizenzschlüssel</th>
                  <th style={{ textAlign: "left" }}>Typ</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th style={{ textAlign: "left" }}>Benutzer</th>
                  <th style={{ textAlign: "left" }}>Erstellt am</th>
                  <th style={{ textAlign: "left" }}>Registriert am</th>
                  <th style={{ textAlign: "left" }}>Ablaufdatum</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(lic => {
                  const isExpired = lic.expiresAt && new Date(lic.expiresAt) < new Date();
                  return (
                  <tr key={lic.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{lic.key}</td>
                    <td>
                      {lic.kind === "trial" ? (
                        <span style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.25rem 0.5rem", borderRadius: "999px", fontSize: "0.875rem" }}>14 Tage Trial</span>
                      ) : (
                        <span style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", padding: "0.25rem 0.5rem", borderRadius: "999px", fontSize: "0.875rem" }}>Lifetime</span>
                      )}
                    </td>
                    <td>
                      {lic.userId ? (
                        <span style={{
                          display: "inline-block", padding: "0.25rem 0.5rem", borderRadius: "999px",
                          background: isExpired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                          color: isExpired ? "var(--error)" : "var(--success)",
                          fontSize: "0.875rem"
                        }}>
                          {isExpired ? "Abgelaufen" : "Verwendet"}
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-block", padding: "0.25rem 0.5rem", borderRadius: "999px",
                          background: "rgba(234,179,8,0.1)", color: "var(--warning)", fontSize: "0.875rem"
                        }}>
                          Offen
                        </span>
                      )}
                    </td>
                    <td>
                      {lic.userId ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{lic.userName || "Unbekannt"}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>{lic.userEmail || lic.userId}</div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </td>
                    <td>{new Date(lic.createdAt).toLocaleString("de-DE")}</td>
                    <td>{lic.usedAt ? new Date(lic.usedAt).toLocaleString("de-DE") : <span style={{ color: "var(--muted)" }}>-</span>}</td>
                    <td>{lic.expiresAt ? new Date(lic.expiresAt).toLocaleString("de-DE") : <span style={{ color: "var(--muted)" }}>-</span>}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
