import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers } from "../utils/api";
import { Customer } from "../utils/types";
import s from "./Customers.module.css"; // ⬅️ lokales CSS

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const nav = useNavigate();

  useEffect(() => { getCustomers().then(setRows); }, []);

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>Kunden</div>
          <button className={s.btnPrimary} onClick={() => nav("/customers/new")}>
            + Kunde anlegen
          </button>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardContent}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>E‑Mail</th>
                <th>Telefon</th>
                <th style={{ textAlign: "right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} onClick={() => nav(`/customers/${c.id}`)} className={s.rowClickable}>
                  <td className={s.truncate}>{c.name}</td>
                  <td className={s.truncate}>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td className={s.actions} onClick={(e) => e.stopPropagation()}>
                    <button className={s.btn}>Details</button>
                    <button className={s.btn}>Bearbeiten</button>
                    <button className={s.btnDanger}>Löschen</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className={s.emptyCell}>Keine Einträge.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
