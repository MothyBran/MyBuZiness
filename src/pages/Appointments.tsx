import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import s from "./Appointments.module.css";

export default function Appointments() {
  const nav = useNavigate();
  const [tick, setTick] = useState(0);

  // Sichtbares Lebenszeichen im Console-Log
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("%c[Appointments] mounted", "background:#22c55e;color:#0b1220;padding:2px 6px;border-radius:4px");
  }, []);

  // Kleiner Ticker, damit man ein Update sieht
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>Termine / Aufträge (DEBUG)</div>
          <div className={s.headerActions}>
            <button className={s.btnGhost} onClick={() => nav("/")}>Dashboard</button>
            <button className={s.btnPrimary} onClick={() => nav("/appointments/new")}>+ Neuer Eintrag</button>
          </div>
        </div>
        <div className={s.cardContent}>
          <div className={s.banner}>
            ✅ Wenn du diesen gelben Banner und den knallgrünen Seiten‑Hintergrund siehst,
            ist die <strong>Appointments</strong>-Komponente aktiv und das <strong>CSS‑Module</strong> geladen.
          </div>
          <div className={s.placeholder}>
            Debug‑Ticker: {tick}s – Route: /appointments
          </div>
        </div>
      </div>
    </div>
  );
}
