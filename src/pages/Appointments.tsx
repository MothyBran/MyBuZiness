// src/pages/Appointments.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getAppointments } from "../utils/api";
import { Appointment } from "../utils/types";
import { useNavigate } from "react-router-dom";

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export default function Appointments() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const nav = useNavigate();

  useEffect(() => {
  const y = cursor.getFullYear();
  const m = String(cursor.getMonth() + 1).padStart(2, "0");
  getAppointmentsByMonth(`${y}-${m}`).then(setRows);
}, [cursor]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days: Date[] = [];
    const leading = (start.getDay() + 6) % 7; // Mo=0 … So=6
    // vorherige Lücken auffüllen
    for (let i = leading; i > 0; i--) days.push(new Date(start.getFullYear(), start.getMonth(), 1 - i));
    // eigentliche Tage
    for (let d = 1; d <= end.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    // auf 5–6 Zeilen aufrunden
    while (days.length % 7 !== 0) days.push(new Date(end.getFullYear(), end.getMonth(), end.getDate() + (days.length % 7 ? 1 : 0)));
    return days;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    rows.forEach(a => {
      const key = a.date; // Appointment.date (DATE) 
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [rows]);

  const todayISO = toISODate(new Date());

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Termine / Aufträge</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>←</button>
            <button className="btn btn--ghost" onClick={() => setCursor(new Date())}>heute</button>
            <button className="btn btn--ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>→</button>
            <button className="btn btn--primary" onClick={() => nav("/appointments/new")}>+ Neuer Eintrag</button>
          </div>
        </div>
        <div className="card__content">
          <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
            <span className="badge badge--soft">{cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</span>
          </div>

          <div className="calendar">
            {["Mo","Di","Mi","Do","Fr","Sa","So"].map((w) => (
              <div key={w} style={{ textAlign: "center", color: "var(--color-muted)", fontWeight: 600 }}>{w}</div>
            ))}
            {monthDays.map((d, idx) => {
              const iso = toISODate(d);
              const outMonth = d.getMonth() !== cursor.getMonth();
              const items = byDate.get(iso) || [];
              return (
                <div
                  key={idx}
                  className={`day ${iso === todayISO ? "today" : ""} ${items.length ? "has-items" : ""}`}
                  style={{ opacity: outMonth ? .45 : 1 }}
                  onClick={() => nav(`/appointments?date=${iso}`)}
                  title={items.length ? `${items.length} Termin(e)` : ""}
                >
                  <div className="date">{d.getDate()}</div>
                  <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                    {items.slice(0, 3).map((a) => (
                      <div key={a.id} className="badge truncate" title={a.title || a.kind || ""}>
                        {a.startAt ?? ""} {(a.title || a.kind || "Termin")}
                      </div>
                    ))}
                    {items.length > 3 ? <small className="badge">+{items.length - 3} weitere</small> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formular-Card im Stil "Termin/Auftrag bearbeiten" */}
      <div className="card">
        <div className="card__header"><div className="card__title">Termin/Auftrag bearbeiten</div></div>
        <div className="card__content">
          <div className="form-grid">
            <div className="form-col-3">
              <label className="label">Datum</label>
              <input className="input" type="date" />
            </div>
            <div className="form-col-3">
              <label className="label">Start</label>
              <input className="input" type="time" />
            </div>
            <div className="form-col-3">
              <label className="label">Ende</label>
              <input className="input" type="time" />
            </div>
            <div className="form-col-3">
              <label className="label">Status</label>
              <input className="input" placeholder="geplant / bestätigt / erledigt" />
            </div>
            <div className="form-col-6">
              <label className="label">Kunde (Name/ID)</label>
              <input className="input" placeholder="Kundenname oder ID" />
            </div>
            <div className="form-col-6">
              <label className="label">Titel</label>
              <input className="input" placeholder="z. B. Nageltermin / Auftrag XY" />
            </div>
            <div className="form-col-12">
              <label className="label">Notiz</label>
              <textarea className="input" rows={3} placeholder="Optionale Details"></textarea>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn btn--ghost">Abbrechen</button>
            <button className="btn btn--primary">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
}
