import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers, getInvoices } from "../utils/api";
import { Invoice } from "../utils/types";
import { centsToMoney, displayInvoiceNo, yyyymm } from "../utils/format";
import { RowActions } from "../components/ui/RowActions";
import { TableShell, Table, Th, TrClickable } from "../components/ui/Table";

export default function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [cust, setCust] = useState<Record<string, string>>({});
  const nav = useNavigate();

  useEffect(() => {
    getInvoices().then(setRows);
    getCustomers().then(cs => {
      const map: Record<string, string> = {};
      cs.forEach(c => { if (c.id) map[c.id] = c.name || ""; });
      setCust(map);
    });
  }, []);

  // Gruppiere pro Monat ausschließlich über issueDate (typesicher)
  const rowsWithSeq = useMemo(() => {
    const buckets = new Map<string, number>();
    return rows.map((i) => {
      const key = yyyymm(i.issueDate); // <— nur issueDate verwenden
      const idx = buckets.get(key) ?? 0;
      buckets.set(key, idx + 1);
      return { row: i, seq: idx };
    });
  }, [rows]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Rechnungen</div>
          <button className="btn btn--primary" onClick={() => nav("/invoices/new")}>+ neue Rechnung</button>
        </div>
      </div>

      <TableShell>
        <Table>
          <thead>
            <tr>
              <Th>Nr.</Th>
              <Th>Datum</Th>
              <Th>Kunde</Th>
              <Th>Gesamt</Th>
              <Th>Aktionen</Th>
            </tr>
          </thead>
          <tbody>
            {rowsWithSeq.map(({ row, seq }) => (
              <TrClickable key={row.id} onClick={() => nav(`/invoices/${row.id}`)}>
                <td className="truncate cell--mono">{displayInvoiceNo(row, seq)}</td>
                <td>{row.issueDate}</td>
                <td className="truncate">{cust[row.customerId] || row.customerId || "—"}</td>
                <td className="cell--num">{centsToMoney(row.grossCents ?? 0, row.currency || "EUR")}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    onDetail={() => nav(`/invoices/${row.id}`)}
                    onEdit={() => nav(`/invoices/${row.id}/edit`)}
                    onDelete={() => alert("Rechnung löschen (Backend‑Call implementieren)")}
                  />
                </td>
              </TrClickable>
            ))}
            {rowsWithSeq.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 16 }}>Keine Einträge.</td></tr>
            ) : null}
          </tbody>
        </Table>
      </TableShell>
    </div>
  );
}
