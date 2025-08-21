// src/pages/Customers.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers } from "../utils/api";
import { Customer } from "../utils/types";
import { RowActions } from "../components/ui/RowActions";
import { TableShell, Table, Th, TrClickable } from "../components/ui/Table";

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  useEffect(() => { getCustomers().then(setRows); }, []);
  const filtered = useMemo(
    () => rows.filter(r => (r.name || "").toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Kunden</div>
          <button className="btn btn--primary" onClick={() => nav("/customers/new")}>+ neuen Kunden anlegen</button>
        </div>
        <div className="card__content">
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="form-col-6">
              <label className="label">Suche</label>
              <input className="input" placeholder="Nach Name oder E‑Mail suchen…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <TableShell>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>E‑Mail</Th>
              <Th>Telefon</Th>
              <Th>Adresse</Th>
              <Th>Aktionen</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <TrClickable key={c.id} onClick={() => nav(`/customers/${c.id}`)}>
                <td className="truncate">{c.name}</td> {/* Customer.name  */}
                <td className="truncate">{c.email || "—"}</td> {/* Customer.email  */}
                <td className="truncate">{c.phone || "—"}</td> {/* Customer.phone  */}
                <td className="truncate">
                  {[c.addressStreet, c.addressZip, c.addressCity, c.addressCountry].filter(Boolean).join(", ") || "—"} {/* Customer.address*  */}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    onDetail={() => nav(`/customers/${c.id}`)}
                    onEdit={() => nav(`/customers/${c.id}/edit`)}
                    onDelete={() => alert("Kunde löschen (Backend‑Call implementieren)")}
                  />
                </td>
              </TrClickable>
            ))}
            {filtered.length === 0 ? <tr><td colSpan={5} style={{ padding: 16 }}>Keine Einträge.</td></tr> : null}
          </tbody>
        </Table>
      </TableShell>
    </div>
  );
}
