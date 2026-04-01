// app/finanzen/bericht/[year]/page.jsx
"use client";

import { useEffect, useState } from "react";
import React from "react";

function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}

function fmtDEDate(input){
  if (!input) return "—";
  const d = new Date(input);
  return isNaN(d) ? "—" : d.toLocaleDateString("de-DE");
}

export default function BerichtPrintPage({ params }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [year, setYear] = useState(null);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      setYear(p.year);
      load(p.year);
    });
  }, [params]);

  async function load(y) {
    try {
      // Datum-Grenzen für das Jahr
      const start = `${y}-01-01`;
      const end = `${y}-12-31`;

      const [resTx, resSet, resRec, resInv] = await Promise.all([
        fetch(`/api/finanzen/transactions?from=${start}&to=${end}&limit=5000`, { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch(`/api/receipts?limit=5000`, { cache: "no-store" }),
        fetch(`/api/invoices?limit=5000`, { cache: "no-store" })
      ]);

      if (!resTx.ok) throw new Error("Transaktionen konnten nicht geladen werden.");

      const jsonTx = await resTx.json();
      const jsonSet = await resSet.json().catch(() => ({}));
      const jsonRec = await resRec.json().catch(() => ({ data: [] }));
      const jsonInv = await resInv.json().catch(() => ({ data: [] }));

      if (!jsonTx.ok) throw new Error(jsonTx.error || "Fehler beim Laden.");

      const incomes = [];
      const expenses = [];
      let totalIncome = 0;
      let totalExpense = 0;

      // 1. Finance Transactions
      const rows = jsonTx.rows || [];
      rows.forEach(r => {
        if (r.kind === 'income') {
          incomes.push(r);
          totalIncome += Number(r.grossCents || 0);
        } else if (r.kind === 'expense') {
          expenses.push(r);
          totalExpense += Number(r.grossCents || 0);
        }
      });

      // 2. Receipts (immer Einnahmen)
      const receipts = Array.isArray(jsonRec.data) ? jsonRec.data : [];
      receipts.forEach(rec => {
        const d = new Date(rec.date);
        const recYear = d.getFullYear();
        if (recYear === Number(y)) {
           incomes.push({
             id: rec.id,
             bookedOn: rec.date,
             categoryName: "Kasse/Beleg",
             note: `Beleg-Nr: ${rec.receiptNo || '-'} ${rec.note ? `(${rec.note})` : ''}`,
             grossCents: rec.grossCents
           });
           totalIncome += Number(rec.grossCents || 0);
        }
      });

      // 3. Invoices (nur bezahlte/abgeschlossene als Einnahmen im gewählten Jahr)
      const invoices = Array.isArray(jsonInv.data) ? jsonInv.data : [];
      invoices.forEach(inv => {
        if (inv.status === 'canceled' || inv.status === 'storniert') return;

        let invDate = null;
        if (inv.paidAt) {
          invDate = new Date(inv.paidAt);
        } else if (inv.status === 'paid' || inv.status === 'done') {
          invDate = new Date(inv.issueDate);
        }

        if (invDate) {
           const invYear = invDate.getFullYear();
           if (invYear === Number(y)) {
              incomes.push({
                id: inv.id,
                bookedOn: invDate.toISOString().slice(0, 10),
                categoryName: "Rechnung",
                note: `Rechnung-Nr: ${inv.invoiceNo || '-'} an ${inv.customerName || '-'}`,
                grossCents: inv.grossCents
              });
              totalIncome += Number(inv.grossCents || 0);
           }
        }
      });

      // Sort chronological
      incomes.sort((a,b) => new Date(a.bookedOn) - new Date(b.bookedOn));
      expenses.sort((a,b) => new Date(a.bookedOn) - new Date(b.bookedOn));

      setData({
        incomes,
        expenses,
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense
      });

      if (jsonSet?.data) {
        setSettings(jsonSet.data);
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Lade Bericht…</div>;
  if (err || !data) return <div style={{ padding: "2rem", color: "red", textAlign: "center" }}>Fehler: {err || "Bericht nicht gefunden"}</div>;

  const curr = settings.currency || "EUR";

  return (
    <>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          margin: 15mm 15mm 25mm 15mm; /* Platz für Footer unten */
        }
        @media print {
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          aside, nav, header { display: none !important; } /* Sidebar/Nav ausblenden */
          .no-print { display: none !important; }
          .print-area { margin: 0 auto; box-shadow: none; border: none; font-size: 10pt; line-height: 1.3; width: 100%; max-width: none; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Kopf- und Fußzeile auf jeder Seite durch Thead/Tfoot Tricks oder position: fixed */
          .ph-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding-bottom: 5mm;
          }
        }
        body { background: #f8fafc; color: var(--color-text, #1e293b); }

        .print-area {
          max-width: 210mm; /* A4 */
          margin: 2rem auto; padding: 20mm 15mm 25mm 15mm;
          background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          font-size: 10pt; line-height: 1.4;
          position: relative;
          min-height: 297mm;
          box-sizing: border-box;
        }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
        .logo { max-width: 60mm; max-height: 25mm; object-fit: contain; }
        .company-info { text-align: right; font-size: 9pt; }

        .title { font-size: 18pt; font-weight: bold; margin: 0 0 1rem; text-align: center; }

        .section-title { font-size: 14pt; font-weight: bold; margin: 2rem 0 0.5rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; color: #334155; }

        .items-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 9.5pt; }
        .items-table th, .items-table td { padding: 6px 4px; text-align: left; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
        .items-table th { font-weight: bold; background: #f8fafc; border-bottom: 1px solid #cbd5e1; }
        .items-table .num { text-align: right; white-space: nowrap; }

        .sum-row { font-weight: bold; font-size: 11pt; background: #f8fafc; }
        .sum-row td { border-top: 2px solid #cbd5e1; border-bottom: none; padding: 8px 4px; }

        .totals-box {
          margin-top: 3rem;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          padding: 1.5rem;
          background: #f8fafc;
          page-break-inside: avoid;
        }
        .totals-table { width: 100%; font-size: 12pt; }
        .totals-table td { padding: 4px 0; }
        .totals-table .num { text-align: right; font-weight: bold; }
        .totals-table .final { font-size: 14pt; border-top: 2px solid #94a3b8; padding-top: 8px; margin-top: 8px; }

        .ph-footer { border-top: 1px solid #ddd; margin-top: 2rem; padding-top: 0.5rem; font-size: 8pt; color: #64748b; text-align: center; }

        .btn-print {
          display: block; margin: 2rem auto; padding: 0.75rem 1.5rem;
          background: ${settings.primaryColor || "#0aa"}; color: white; border: none; border-radius: 0.5rem;
          font-size: 1rem; cursor: pointer; font-weight: bold;
        }
      `}} />

      <button className="no-print btn-print" onClick={() => window.print()}>🖨️ Jetzt drucken / als PDF speichern</button>

      <div className="print-area">
        <div className="header">
          <div>
            {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="logo" />}
          </div>
          <div className="company-info">
            <strong>{settings.companyName || "Unternehmen"}</strong><br />
            {settings.address1 && <>{settings.address1}<br /></>}
            {(settings.postalCode || settings.city) && <>{settings.postalCode} {settings.city}<br /></>}
            {settings.email && <>{settings.email}<br /></>}
            {settings.phone && <>{settings.phone}<br /></>}
          </div>
        </div>

        <h1 className="title">Umsatzbericht {year}</h1>

        {/* Einnahmen */}
        <div className="section-title">Einnahmen</div>
        <table className="items-table">
          <thead>
            <tr>
              <th style={{width: "15%"}}>Datum</th>
              <th style={{width: "25%"}}>Kategorie</th>
              <th style={{width: "45%"}}>Bezeichnung / Notiz</th>
              <th className="num" style={{width: "15%"}}>Betrag</th>
            </tr>
          </thead>
          <tbody>
            {data.incomes.length === 0 ? (
              <tr><td colSpan={4} style={{textAlign: "center", color: "#64748b"}}>Keine Einnahmen in diesem Jahr.</td></tr>
            ) : (
              data.incomes.map((r, i) => (
                <tr key={r.id || i}>
                  <td>{fmtDEDate(r.bookedOn)}</td>
                  <td>{r.categoryName || r.categoryCode || "—"}</td>
                  <td>{r.note || r.reference || "—"}</td>
                  <td className="num">{money(r.grossCents, curr)}</td>
                </tr>
              ))
            )}
            <tr className="sum-row">
              <td colSpan={3} style={{textAlign: "right"}}>Summe Einnahmen:</td>
              <td className="num">{money(data.totalIncome, curr)}</td>
            </tr>
          </tbody>
        </table>

        {/* Ausgaben */}
        <div className="section-title">Ausgaben</div>
        <table className="items-table">
          <thead>
            <tr>
              <th style={{width: "15%"}}>Datum</th>
              <th style={{width: "25%"}}>Kategorie</th>
              <th style={{width: "45%"}}>Bezeichnung / Notiz</th>
              <th className="num" style={{width: "15%"}}>Betrag</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.length === 0 ? (
              <tr><td colSpan={4} style={{textAlign: "center", color: "#64748b"}}>Keine Ausgaben in diesem Jahr.</td></tr>
            ) : (
              data.expenses.map((r, i) => (
                <tr key={r.id || i}>
                  <td>{fmtDEDate(r.bookedOn)}</td>
                  <td>{r.categoryName || r.categoryCode || "—"}</td>
                  <td>{r.note || r.reference || "—"}</td>
                  <td className="num">{money(r.grossCents, curr)}</td>
                </tr>
              ))
            )}
            <tr className="sum-row">
              <td colSpan={3} style={{textAlign: "right"}}>Summe Ausgaben:</td>
              <td className="num">{money(data.totalExpense, curr)}</td>
            </tr>
          </tbody>
        </table>

        {/* Zusammenfassung */}
        <div className="totals-box">
          <table className="totals-table">
            <tbody>
              <tr>
                <td>Gesamteinnahmen:</td>
                <td className="num" style={{color: "#065f46"}}>{money(data.totalIncome, curr)}</td>
              </tr>
              <tr>
                <td>Gesamtausgaben:</td>
                <td className="num" style={{color: "#b91c1c"}}>- {money(data.totalExpense, curr)}</td>
              </tr>
              <tr>
                <td className="final"><strong>Umsatz / Gewinn:</strong></td>
                <td className="num final"><strong style={{color: data.net >= 0 ? "#065f46" : "#b91c1c"}}>{money(data.net, curr)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer for Print */}
        <div className="ph-footer">
          <div style={{display: "flex", justifyContent: "space-between", gap: "20px"}}>
            <div style={{flex: 1, textAlign: "left"}}>
              <strong>{settings.companyName || "—"}</strong><br />
              {settings.address1 && <span>{settings.address1}, </span>}
              {(settings.postalCode || settings.city) && <span>{settings.postalCode} {settings.city}</span>}
            </div>
            <div style={{flex: 1, textAlign: "center"}}>
              {settings.vatId && <span><strong>USt-ID:</strong> {settings.vatId}<br/></span>}
              {settings.taxId && <span><strong>St.-Nr.:</strong> {settings.taxId}</span>}
            </div>
            <div style={{flex: 1, textAlign: "right"}}>
              {(settings.bankInstitution || settings.bankRecipient || settings.bankIban || settings.bankBic || settings.bankAccount) && (
                <>
                  <strong>Bankverbindung:</strong><br/>
                  {settings.bankInstitution || settings.bankRecipient || settings.bankIban || settings.bankBic
                    ? `${settings.bankInstitution || "-"} | ${settings.bankIban || "-"} | ${settings.bankBic || "-"}`
                    : settings.bankAccount.replace(/\n/g, " | ")}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
