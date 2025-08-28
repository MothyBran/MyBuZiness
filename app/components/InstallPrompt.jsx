// app/components/InstallPrompt.jsx
"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [open, setOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Prüfen, ob App bereits als PWA läuft (verhindert unnötiges Popup)
    const mq = window.matchMedia("(display-mode: standalone)");
    const alreadyStandalone = mq.matches || window.navigator.standalone === true;
    setIsStandalone(alreadyStandalone);

    const onChange = () => setIsStandalone(mq.matches || window.navigator.standalone === true);
    mq.addEventListener?.("change", onChange);

    // PWA-Install-Event abfangen
    const onBIP = (e) => {
      e.preventDefault();
      if (isStandalone) return; // bereits installiert -> kein Popup
      setDeferredPrompt(e);
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onBIP);

    // Falls die App bereits installiert wurde, Popup schließen
    const onInstalled = () => {
      setOpen(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onChange);
    };
  }, [isStandalone]);

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log("Install choice:", choice?.outcome);
    setDeferredPrompt(null);
    setOpen(false);
  }

  if (isStandalone) return null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Jetzt installieren">
      <p>Installiere diese App für schnellen Zugriff direkt vom Startbildschirm.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Später</button>
        <button className="btn" onClick={installApp}>Zum Startbildschirm hinzufügen</button>
      </div>
    </Modal>
  );
}
