// app/rechnungen/[id]/druck/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import Barcode from "react-barcode";

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function money(cents, code = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

export default function InvoicePrintPage({ params }) {
  const [data, setData] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.resolve(params).then(p => {
      load(p.id);
    });
  }, [params]);

  async function load(id) {
    try {
      const res = await fetch(`/api/invoices/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Rechnung nicht gefunden.");
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error || "Rechnung nicht gefunden.");

      const invoiceData = json.data;
      setData(invoiceData);

      const [custRes, sres] = await Promise.all([
        fetch(`/api/customers/${invoiceData.customerId}`).catch(() => null),
        fetch("/api/settings").catch(() => null)
      ]);

      if (custRes && custRes.ok) {
        const cjs = await custRes.json();
        setCustomer(cjs?.data || null);
      }

      if (sres && sres.ok) {
        const sjs = await sres.json();
        setSettings(sjs?.data || {});
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Lade Rechnung…</div>;
  if (err || !data) return <div style={{ padding: "2rem", color: "red", textAlign: "center" }}>Fehler: {err || "Rechnung nicht gefunden"}</div>;

  const firm = settings || {};
  const row = data;
  const currency = row.currency || firm.currency || "EUR";

  const dueTxt = row.dueDate ? new Date(row.dueDate).toLocaleDateString("de-DE") : null;

  const custName = customer?.name || row.customerName || "";
  const custStreet = customer?.addressStreet || row.customerStreet || "";
  const custZip = customer?.addressZip || row.customerZip || "";
  const custCity = customer?.addressCity || row.customerCity || "";

  const firmLineLeft = [
    (firm.companyName || "").trim(),
    (firm.address1 || "").trim(),
    [firm.postalCode, firm.city].filter(Boolean).join(" ")
  ].filter(Boolean).join(" • ");

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page { margin: 0; }
        @media print {
          html, body { height: auto !important; background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-scale-wrapper { transform: none !important; margin: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; }
          .print-area { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; min-height: 0; position: relative; }
          .ph-footer { position: relative; padding-left: 28px; padding-right: 28px; padding-bottom: 12px; background: white; margin-top: auto; }
          /* No margin bottom so we don't trigger browser footers */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          ::-webkit-scrollbar { display: none; }
        }
        body { background: #f8fafc; color: var(--color-text, #1e293b); margin: 0; overflow-x: hidden; }

        .print-scale-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
          overflow-x: auto;
          padding: 1rem;
          box-sizing: border-box;
        }

        .print-area {
          background: white;
          width: 210mm;
          min-width: 210mm;
          min-height: 297mm;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          box-sizing: border-box;
          --color-primary: ${firm.primaryColor || "var(--brand, #14b8a6)"};
          transform-origin: top center;
        }

        @media screen and (max-width: 220mm) {
          .print-scale-wrapper {
             padding: 0;
             margin-top: 1rem;
          }
          .print-area {
             /* Scale down the A4 container so it fits on mobile screens */
             transform: scale(calc(100vw / 210mm));
             margin-bottom: calc(-297mm * (1 - (100vw / 210mm)));
          }
        }

        .btn-print {
          display: block; margin: 2rem auto; padding: 0.75rem 1.5rem;
          background: var(--color-primary, #0aa); color: white; border: none; border-radius: 0.5rem;
          font-size: 1rem; cursor: pointer; font-weight: bold;
        }

        .print-page{ padding: 24px 28px; padding-bottom: 0px; font: 12pt/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#000; display: flex; flex-direction: column; box-sizing: border-box; flex: 1; min-height: calc(100% - 40px); }
        .ph-footer{ border-top: 1px solid #ddd; margin-top: auto; padding-top: 16px; font-size: 9pt; color:#333; display: flex; justify-content: space-between; gap: 16px; page-break-inside: avoid; margin-bottom: 12px; }
        .ph-footer-col{ line-height: 1.5; }
        .ph-head{ display:flex; justify-content:space-between; gap:18px; }
        .ph-left{ flex:1; min-width: 55%; }
        .ph-right{ text-align:right; min-width: 35%; }
        .ph-top-logo{ display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .ph-top-company{ font-size: 16pt; font-weight: 800; color: #333; }
        .ph-top-slogan{ font-size: 11pt; color: #666; margin-top: 2px; }
        .ph-logo{ max-height: 80px; }
        .ph-left { container-type: inline-size; }
        .ph-fromline {
          font-weight: normal;
          margin-top: 4px;
          white-space: nowrap;
          font-size: clamp(6px, 4cqi, 10pt);
          text-decoration: underline;
        }

        .ph-recipient{ margin: 2px 0 10px; }
        .ph-rec-name{ font-size:12pt; font-weight:700; }

        .ph-title{ font-size: 18pt; font-weight: 800; margin-bottom: 6px; }
        .ph-contact{ margin-top: 10px; }

        .ph-table{ width:100%; border-collapse: collapse; margin-top: 16px; }
        .ph-table th, .ph-table td{ border-bottom: 1px solid #ddd; padding: 8px; text-align:right; }
        .ph-table .ta-left{ text-align:left; }

        .ph-note{ margin-top: 3rem; margin-bottom: 14px; }

        .ph-totals{ margin-top: 12px; text-align: right; }
        .ph-total{ font-size: 14pt; font-weight: 800; margin-top: 6px; }

      `}} />

      <div style={{ textAlign: "center" }}>
        <button className="no-print btn-print" onClick={() => window.print()}>🖨️ Jetzt drucken / als PDF speichern</button>
      </div>

      <div className="print-scale-wrapper">
        <div className="print-area">
          <div className="print-page">
          {/* Top Logo and Company Name */}
          <div className="ph-top-logo">
            {firm.logoUrl && <img src={firm.logoUrl} alt="Logo" className="ph-logo" />}
            <div>
              {firm.companyName && <div className="ph-top-company">{firm.companyName}</div>}
              {firm.slogan && <div className="ph-top-slogan">{firm.slogan}</div>}
            </div>
          </div>

          {/* Kopf */}
          <div className="ph-head">
            <div className="ph-left">
              {firmLineLeft && <div className="ph-fromline">{firmLineLeft}</div>}
              <div className="ph-recipient">
                <div className="ph-rec-name">{custName}</div>
                {custStreet && <div>{custStreet}</div>}
                {(custZip || custCity) && <div>{custZip} {custCity}</div>}
              </div>
            </div>

            <div className="ph-right">
              <div className="ph-title">RECHNUNG</div>
              <div>Nr.: <strong>{row.invoiceNo}</strong></div>
              <div>Datum: <strong>{row.issueDate ? new Date(row.issueDate).toLocaleDateString("de-DE") : ""}</strong></div>
              {row.invoiceNo && (
                <div style={{ marginTop: "10px", textAlign: "right", display: "flex", justifyContent: "flex-end" }}>
                  <Barcode value={row.invoiceNo} width={1.5} height={40} displayValue={false} margin={0} />
                </div>
              )}
              {(firm.email || firm.phone) && (
                <div className="ph-contact">
                  {firm.email && <div>{firm.email}</div>}
                  {firm.phone && <div>{firm.phone}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Positionen */}
          <table className="ph-table">
            <thead>
              <tr>
                <th className="ta-left" style={{ width: "1%" }}>Pos.</th>
                <th className="ta-left">Bezeichnung</th>
                <th>Menge</th>
                <th>Einzelpreis</th>
                <th>Summe</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(row.items) && row.items.map((it, idx)=>(
                <tr key={idx}>
                  <td className="ta-left">{idx + 1}.</td>
                  <td className="ta-left">{it.name || ""}</td>
                  <td>{toInt(it.quantity || 0)}</td>
                  <td>{money(toInt(it.unitPriceCents || 0), row.currency || currency)}</td>
                  <td>{money(toInt(it.lineTotalCents || 0), row.currency || currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summen */}
          <div className="ph-totals">
            <div>Netto: <strong>{money(row.netCents, row.currency || currency)}</strong></div>
            {firm.kleinunternehmer ? (
              <div style={{ fontSize: "9pt", margin: "4px 0", color: "#555" }}>
                Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
              </div>
            ) : (
              <div>USt: <strong>{money(row.taxCents, row.currency || currency)}</strong></div>
            )}
            <div className="ph-total">Gesamt: <strong>{money(row.grossCents, row.currency || currency)}</strong></div>
          </div>

          {/* Zahlungsinfo/Hinweis */}
          <div className="ph-note">
            {dueTxt
              ? <>Bitte überweisen Sie den Gesamtbetrag bis zum <strong>{dueTxt}</strong> mit dem Verwendungszweck: "{row.invoiceNo}" auf das unten aufgeführte Bankkonto.</>
              : <>Bitte überweisen Sie den Gesamtbetrag mit dem Verwendungszweck: "{row.invoiceNo}" auf das unten aufgeführte Bankkonto.</>
            }
          </div>

          {/* Fußzeile – Bank/Steuer */}
          <div className="ph-footer">
            <div className="ph-footer-col">
              {(firm.bankInstitution || firm.bankRecipient || firm.bankIban || firm.bankBic || firm.bankAccount) && (
                <span>
                  <strong>Bankverbindung:</strong>{" "}
                  {firm.bankInstitution || firm.bankRecipient || firm.bankIban || firm.bankBic
                    ? `Institut: ${firm.bankInstitution || "-"} | Empfänger: ${firm.bankRecipient || "-"} | IBAN: ${firm.bankIban || "-"} | BIC: ${firm.bankBic || "-"}`
                    : firm.bankAccount.replace(/\n/g, " | ")}
                </span>
              )}
            </div>
            <div className="ph-footer-col" style={{ textAlign: "right" }}>
              {firm.vatId && <span><strong>USt-ID:</strong> {firm.vatId}</span>}
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
