// src/pages/Orders.tsx
import React, { useEffect, useState } from "react";
import { getOrders } from "../utils/api";
import { Order } from "../utils/types";
import { centsToMoney, statusBadgeClass } from "../utils/format";

export default function Orders() {
  const [rows, setRows] = useState<Order[]>([]);
  useEffect(()=>{ getOrders().then(setRows); }, []);
  return (
    <div className="card">
      <div className="card__header"><div className="card__title">Aufträge</div></div>
      <div className="card__content" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>Nr.</th><th>Datum</th><th>Status</th><th>Brutto</th></tr></thead>
          <tbody>
            {rows.map(o=>(
              <tr key={o.id}>
                <td className="truncate">{o.orderNo}</td> {/* Order.orderNo  */}
                <td>{o.orderDate}</td> {/* Order.orderDate  */}
                <td><span className={statusBadgeClass(o.status)}>{o.status || "—"}</span></td> {/* Order.status  */}
                <td>{centsToMoney(o.grossCents ?? 0, o.currency || "EUR")}</td> {/* Order.grossCents,currency  */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
