// app/components/InstallPrompt.jsx
"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Standard-Dialog blockieren
      e.preventDefault();
      setDeferredPrompt(e);
      setOpen(true); // eigenes Popup öffnen
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); // offizielles Installationsfenster öffnen
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      console.log("App installiert");
    } else {
      console.log("Installation abgelehnt");
    }
    setDeferredPrompt(null);
    setOpen(false);
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Jetzt installieren">
      <p>Installiere diese App auf deinem Gerät für schnellen Zugriff vom Startbildschirm.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent:"flex-end" }}>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Später</button>
        <button className="btn" onClick={installApp}>Zum Startbildschirm hinzufügen</button>
      </div>
    </Modal>
  );
}
