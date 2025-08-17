"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Modal from "@/app/components/Modal";
import { fromCents } from "@/lib/money";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState(null);

  function close() {
    setOpen(false);
    router.push("/rechnungen");
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/invoices/${id}`, { cache: "no-store" });
      const json = await res.json().catch(()=>({}));
      if (alive) {
        if (json?.data) setInv(json.data);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function del() {
    if (!confirm("Rechnung wirklich löschen?")) return;
    const res = await fetch(`/api/invoices/${id}`, { method:"DELETE" });
    const json = await res.json().catch(()=>({}));
    if (!json?.ok) return alert(json?.error || "Löschen fehlgeschlagen.");
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Rechnung" maxWidth={900}>
      {loading || !inv ? (
        <div>Bitte warten…</div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            <Info label="Rechnungs-Nr.">{inv.invoiceNo}</Info>
            <Info label="Datum">{new Date(inv.issueDate).toLocaleDateString()}</Info>
            <Info label="Kunde">{inv.customerName}</Info>
            <Info label="Status">{inv.status}</Info>
          </div>

          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Bezeichnung</th>
                  <th style={th}>Menge</th>
                  <th style={th}>Einzelpreis</th>
                  <th style={th}>Summe</th>
                </tr>
              </thead>
              <tbody>
                {(inv.items||[]).map(it => (
                  <tr key={it.id}>
                    <td style={td}>{it.name}</td>
                    <td style={td}>{it.quantity}</td>
                    <td style={td}>{fromCents(it.unitPriceCents, inv.currency)}</td>
                    <td style={td}>{fromCents(it.lineTotalCents, inv.currency)}</td>
                  </tr>
                ))}
                {(!inv.items || inv.items.length===0) && (
                  <tr><td colSpan={4} style={{ ...td, textAlign:"center", color:"#999" }}>Keine Positionen</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign:"right", fontWeight:700 }}>
            Netto: {fromCents(inv.netCents, inv.currency)} &nbsp;·&nbsp;
            Steuer: {fromCents(inv.taxCents, inv.currency)} &nbsp;·&nbsp;
            Brutto: {fromCents(inv.grossCents, inv.currency)}
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={close} style={btnGhost}>Schließen</button>
            <button onClick={del} style={btnDanger}>Löschen</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, children }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #eee", borderRadius:"var(--radius)", padding:10 }}>
      <div style={{ fontSize:12, color:"#666" }}>{label}</div>
      <div style={{ fontWeight:700 }}>{children}</div>
    </div>
  );
}

const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"8px", fontSize:14 };
const btnGhost = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid var(--color-primary)", background:"transparent", color:"var(--color-primary)", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:"var(--radius)", border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
