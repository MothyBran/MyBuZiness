// src/pages/Dashboard.tsx  (Vorlage; linked an DB-Feldnamen)
import React, { useEffect, useState } from "react";
import { getAppointments, getCustomers, getInvoices, getOrders, getProducts, getQuotes, getReceipts } from "../utils/api";
import { centsToMoney, statusBadgeClass } from "../utils/format";
import { useTheme } from "../theme/ThemeProvider";

type CountCardProps = { title: string; value: string | number; icon?: string; hint?: string; };
const CountCard: React.FC<CountCardProps> = ({ title, value, icon="📊", hint }) => (
  <div className="card card--hover" style={{gridColumn:"span 4"}}>
    <div className="card__header"><span style={{fontSize:18}}>{icon}</span><div className="card__title">{title}</div></div>
    <div className="card__content" style={{ display:"flex", alignItems:"baseline", gap:12 }}>
      <div style={{ fontSize:28, fontWeight:700 }}>{value}</div>
      {hint ? <small className="badge">{hint}</small> : null}
    </div>
  </div>
);

export default function Dashboard() {
  const { settings } = useTheme();
  const [stats, setStats] = useState({
    customers: 0, products: 0, invoices: 0, receipts: 0, quotes: 0, orders: 0, appointments: 0,
    revenueGross: 0, invoiceLatest: [] as any[], receiptLatest: [] as any[]
  });

  useEffect(()=> {
    (async()=>{
      const [cs, ps, invs, rcs, qts, ords, appts] = await Promise.all([
        getCustomers(), getProducts(), getInvoices(), getReceipts(), getQuotes(), getOrders(), getAppointments()
      ]);
      const revGross = (invs?.reduce((a,b)=> a + (b.grossCents ?? 0), 0) ?? 0) + (rcs?.reduce((a,b)=> a + (b.grossCents ?? 0), 0) ?? 0);
      setStats({
        customers: cs?.length ?? 0,
        products: ps?.length ?? 0,
        invoices: invs?.length ?? 0,
        receipts: rcs?.length ?? 0,
        quotes: qts?.length ?? 0,
        orders: ords?.length ?? 0,
        appointments: appts?.length ?? 0,
        revenueGross: revGross,
        invoiceLatest: invs?.slice(0,5) ?? [],
        receiptLatest: rcs?.slice(0,5) ?? []
      });
    })();
  }, []);

  const curr = settings?.currency || settings?.currencyDefault || "EUR"; // Settings.currency / currencyDefault 

  return (
    <div className="grid grid--responsive">
      <CountCard title="Kunden" value={stats.customers} icon="👤" />
      <CountCard title="Produkte" value={stats.products} icon="📦" />
      <CountCard title="Rechnungen" value={stats.invoices} icon="💶" />
      <CountCard title="Belege" value={stats.receipts} icon="🧾" />
      <CountCard title="Angebote" value={stats.quotes} icon="📝" />
      <CountCard title="Aufträge" value={stats.orders} icon="📑" />
      <CountCard title="Termine" value={stats.appointments} icon="📅" />
      <CountCard title="Umsatz (brutto, ges.)" value={centsToMoney(stats.revenueGross, curr)} icon="💹" />

      <div className="card" style={{gridColumn:"span 12"}}>
        <div className="card__header"><div className="card__title">Neueste Rechnungen</div></div>
        <div className="card__content" style={{overflowX:"auto"}}>
          <table className="table">
            <thead><tr><th>Rechnungs‑Nr.</th><th>Status</th><th>Fällig am</th><th>Betrag</th></tr></thead>
            <tbody>
              {stats.invoiceLatest.map((i: any)=>(
                <tr key={i.id}>
                  <td className="truncate">{i.invoiceNo}</td> {/* Invoice.invoiceNo  */}
                  <td><span className={statusBadgeClass(i.status)}>{i.status || "—"}</span></td> {/* Invoice.status  */}
                  <td>{i.dueDate || "—"}</td> {/* Invoice.dueDate  */}
                  <td>{centsToMoney(i.grossCents ?? 0, curr)}</td> {/* Invoice.grossCents  */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{gridColumn:"span 12"}}>
        <div className="card__header"><div className="card__title">Neueste Belege</div></div>
        <div className="card__content" style={{overflowX:"auto"}}>
          <table className="table">
            <thead><tr><th>Beleg‑Nr.</th><th>Datum</th><th>Betrag</th><th>Notiz</th></tr></thead>
            <tbody>
              {stats.receiptLatest.map((r: any)=>(
                <tr key={r.id}>
                  <td className="truncate">{r.receiptNo}</td> {/* Receipt.receiptNo  */}
                  <td>{r.date}</td> {/* Receipt.date  */}
                  <td>{centsToMoney(r.grossCents ?? 0, curr)}</td> {/* Receipt.grossCents  */}
                  <td className="truncate">{r.note || "—"}</td> {/* Receipt.note  */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
