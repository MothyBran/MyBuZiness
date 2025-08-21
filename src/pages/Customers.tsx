// src/pages/Customers.tsx
import React, { useEffect, useState } from "react";
import { getCustomers } from "../utils/api";
import { Customer } from "../utils/types";

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  useEffect(()=>{ getCustomers().then(setRows); }, []);

  const filtered = rows.filter(r => (r.name||"").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid" style={{gap:16}}>
      <div className="card">
        <div className="card__header"><div className="card__title">Kunden</div></div>
        <div className="card__content">
          <div style={{display:"flex", gap:10, marginBottom:12}}>
            <input className="input" placeholder="Suchen nach Name…" value={q} onChange={e=>setQ(e.target.value)} />
            <button className="btn btn--primary">Neuer Kunde</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr><th>Name</th><th>E‑Mail</th><th>Telefon</th><th>Adresse</th><th>Aktionen</th></tr></thead>
              <tbody>
                {filtered.map(c=>(
                  <tr key={c.id}>
                    <td className="truncate">{c.name}</td> {/* Customer.name  */}
                    <td className="truncate">{c.email || "—"}</td> {/* Customer.email  */}
                    <td className="truncate">{c.phone || "—"}</td> {/* Customer.phone  */}
                    <td className="truncate">
                      {[c.addressStreet, c.addressZip, c.addressCity, c.addressCountry].filter(Boolean).join(", ") || "—"} {/* Customer.address*  */}
                    </td>
                    <td className="row-actions">
                      <button className="btn btn--ghost">Details</button>
                      <button className="btn">Bearbeiten</button>
                      <button className="btn btn--secondary">Neues Dokument</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? <tr><td colSpan={5} style={{padding:"20px 12px"}}>Keine Einträge.</td></tr>: null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
