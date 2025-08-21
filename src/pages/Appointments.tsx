// src/pages/Appointments.tsx
import React, { useEffect, useState } from "react";
import { getAppointments } from "../utils/api";
import { Appointment } from "../utils/types";

export default function Appointments() {
  const [rows, setRows] = useState<Appointment[]>([]);
  useEffect(()=>{ getAppointments().then(setRows); }, []);
  return (
    <div className="card">
      <div className="card__header"><div className="card__title">Termine</div></div>
      <div className="card__content" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>Datum</th><th>Start</th><th>Ende</th><th>Kunde</th><th>Titel</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(a=>(
              <tr key={a.id}>
                <td>{a.date}</td> {/* Appointment.date  */}
                <td>{a.startAt || "—"}</td> {/* Appointment.startAt  */}
                <td>{a.endAt || "—"}</td> {/* Appointment.endAt  */}
                <td className="truncate">{a.customerName || a.customerId || "—"}</td> {/* Appointment.customerName / customerId  */}
                <td className="truncate">{a.title || a.kind || "—"}</td> {/* Appointment.title / kind  */}
                <td className="truncate">{a.status || "—"}</td> {/* Appointment.status  */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
