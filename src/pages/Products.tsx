// src/pages/Products.tsx
import React, { useEffect, useState } from "react";
import { getProducts } from "../utils/api";
import { Product } from "../utils/types";
import { centsToMoney } from "../utils/format";

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  useEffect(()=>{ getProducts().then(setRows); }, []);
  return (
    <div className="card">
      <div className="card__header"><div className="card__title">Produkte & Leistungen</div></div>
      <div className="card__content" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>Name</th><th>SKU</th><th>Preis</th><th>Art</th><th>Kategorie</th></tr></thead>
          <tbody>
            {rows.map(p=>(
              <tr key={p.id}>
                <td className="truncate">{p.name}</td> {/* Product.name  */}
                <td className="truncate">{p.sku || "—"}</td> {/* Product.sku  */}
                <td className="truncate">{centsToMoney(p.priceCents ?? 0, p.currency || "EUR")}</td> {/* Product.priceCents,currency  */}
                <td className="truncate">{p.kind || "—"}</td> {/* Product.kind  */}
                <td className="truncate">{p.categoryCode || "—"}</td> {/* Product.categoryCode  */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
