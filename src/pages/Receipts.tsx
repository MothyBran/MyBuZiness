// src/pages/Receipts.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReceipts } from "../utils/api";
import { Receipt } from "../utils/types";
import { centsToMoney, displayReceiptNo, yyyymm } from "../utils/format";
import { RowActions } from "../components/ui/RowActions";
import { TableShell, Table, Th, TrClickable } from "../components/ui/Table";

export default function Receipts() {
  const [rows, setRows] = useState<Receipt[]>([]);
  const nav = useNavigate();

  useEffect(() => { getReceipts().then(setRows); }, []);

  const rowsWithSeq = useMemo(() => {
    const buckets = new Map<string, number>();
    return rows.map((r) => {
      const key = yyyymm(r.date || r.createdAt);
      const idx = buckets.get(key) ?? 0;
      buckets.set(key, idx + 1);
      return { row: r, seq: idx };
    });
  }, [rows]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card__header" style={{ justifyContent: "space-between" }}>
          <div className="card__title">Belege</div>
          <button className="btn btn--primary" onClick={() => nav("/receipts/new")}>+ neuer Beleg</button>
        </div>
      </div>

      <TableShell>
        <Table>
          <thead>
            <tr>
              <Th>Nr.</Th>
              <Th>Datum</Th>
              <Th>Gesamt</Th>
              <Th>Notiz</Th>
              <Th>Aktionen</Th>
            </tr>
          </thead>
          <tbody>
            {rowsWithSeq.map(({ row, seq }) => (
              <TrClickable key={row.id} onClick={() => nav(`/receipts/${row.id}`)}>
                <td className="truncate cell--mono">{displayReceiptNo(row, seq)}</td>
                <td>{row.date}</td> {/* Receipt.date  */}
                <td className="cell--num">{centsToMoney(row.grossCents ?? 0, row.currency || "EUR")}</td> {/* Receipt.grossCents,currency  */}
                <td className="truncate">{row.note || "—"}</td> {/* Receipt.note  */}
                <td onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    onDetail={() => nav(`/receipts/${row.id}`)}
                    onEdit={() => nav(`/receipts/${row.id}/edit`)}
                    onDelete={() => alert("Beleg löschen (Backend‑Call implementieren)")}
                  />
                </td>
              </TrClickable>
            ))}
          </tbody>
        </Table>
      </TableShell>
    </div>
  );
}
