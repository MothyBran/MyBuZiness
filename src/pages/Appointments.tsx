import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import s from "./Appointments.module.css";
import { getAppointmentsByMonth } from "../utils/api";
import { Appointment } from "../utils/types";

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export default function Appointments() {
  const nav = useNavigate();
  const [cursor, setCursor] = useState<Date>(new Date());
  const [rows, setRows] = useState<Appointment[]>([]);

  // Aktuellen Monat laden
  useEffect(() => {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    getAppointmentsByMonth(`${y}-${m}`).then(setRows).catch(() => setRows([]));
  }, [cursor]);

  // Tage für die Monatsansicht (inkl. vor/nachlaufender Tage zum Auffüllen der Wochen)
  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days: Date[] = [];

    // Montag=0 … Sonntag=6
    const leading = (start.getDay() + 6) % 7;
    for (let i = leading; i > 0; i--) {
      days.push(new Date(start.getFullYear(), start.getMonth(), 1 - i));
    }
    for (let d = 1; d <= end.getDate(); d++) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    // trailing auffüllen
    const trailing = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      days.push(new Date(end.getFullYear(), end.getMonth(), end.getDate() + i));
    }
    return days;
  }, [cursor]);

  // Gruppierung: ISO‑Datum → Termine[]
  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    rows.forEach((a) => {
      const key = a.date; // ISO "YYYY-MM-DD"
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [rows]);

  const todayISO = toISODate(new Date());
  const monthLabel = cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className={s.wrap}>
      {/* Kopf / Aktionen */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>Termine / Aufträge</div>
          <div className={s.headerActions}>
            <button
              className={s.btnGhost}
              aria-label="Vormonat"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              ←
            </button>
            <button className={s.btnGhost} onClick={() => setCursor(new Date())}>
              heute
            </button>
            <button
              className={s.btnGhost}
              aria-label="Nächster Monat"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              →
            </button>
            <button className={s.btnPrimary} onClick={() => nav("/appointments/new")}>
              + Neuer Eintrag
            </button>
          </div>
        </div>
        <div className={s.cardContent}>
          <div className={s.subhead}>
            <span className={s.badge}>{monthLabel}</span>
            <div className={s.legend}>
              <span className={s.dotToday} /> Heute
              <span className={s.dotHasItems} /> Termin(e)
            </div>
          </div>

          {/* Kalender */}
          <div className={s.calendar} role="grid" aria-label={`Kalender ${monthLabel}`}>
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => (
              <div key={w} className={s.weekday} role="columnheader">
                {w}
              </div>
            ))}

            {monthDays.map((d, idx) => {
              const iso = toISODate(d);
              const outMonth = d.getMonth() !== cursor.getMonth();
              const items = byDate.get(iso) || [];

              return (
                <button
                  key={idx}
                  type="button"
                  className={[
                    s.day,
                    iso === todayISO ? s.today : "",
                    items.length ? s.hasItems : "",
                    outMonth ? s.outMonth : "",
                  ].join(" ")}
                  onClick={() => nav(`/appointments?date=${iso}`)}
                  aria-label={`${d.getDate()}. ${d.toLocaleDateString("de-DE", { month: "long" })}`}
                >
                  <div className={s.date}>
                    <span>{d.getDate()}</span>
                  </div>

                  <div className={s.itemsBox}>
                    {items.slice(0, 3).map((a) => (
                      <div key={a.id} className={s.itemBadge} title={a.title || a.kind || "Termin"}>
                        <span className={s.itemTime}>{a.startAt ?? ""}</span>
                        <span className={s.itemText}>{a.title || a.kind || "Termin"}</span>
                      </div>
                    ))}
                    {items.length > 3 ? (
                      <small className={s.moreBadge}>+{items.length - 3} weitere</small>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optional: Hier kannst du später die Tages-/Detail-Liste einblenden */}
    </div>
  );
}
