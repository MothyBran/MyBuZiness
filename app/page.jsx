"use client";

export default function HomeTest() {
  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>Startseite</h2>
      <p style={{ color: "#666" }}>
        Wenn du oben den cyanfarbenen „LAYOUT: app/layout.jsx aktiv“-Balken siehst, läuft das Root-Layout korrekt.  
        Darunter sollte der Header mit Logo, Claim, Anmelden, Registrieren und Modul-Button zu sehen sein.
      </p>
      <div className="surface" style={{ padding: 14, marginTop: 12 }}>
        Inhalt deiner Startseite kommt hier hin.
      </div>
    </div>
  );
}
