// app/belege/[id]/druck/page.jsx
/* Server-Komponente: Druckansicht für Belege (ähnlich wie Rechnungen) */
import Image from "next/image";

async function fetchJson(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) return null;
  return res.json().catch(()=>null);
}

function money(cents=0, curr="EUR"){
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 })} ${curr}`;
}

export default async function PrintReceiptPage({ params }){
  const id = params.id;

  // API aufrufen (robust: data oder direktes Objekt)
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const detJs = await fetchJson(`${base}/api/receipts/${id}`);
  const setJs = await fetchJson(`${base}/api/settings`);

  const receipt = detJs?.data || detJs || {};
  const items   = Array.isArray(receipt.items) ? receipt.items : [];
  const currency = receipt.currency || setJs?.data?.currency || setJs?.currency || "EUR";

  const S = setJs?.data || setJs || {};

  // Settings (Firmendaten) – robust abgreifen:
  const companyName   = S.companyName || S.firmName || S.name || "Firma";
  const ownerName     = S.owner || S.ownerName || "";
  const street        = S.addressStreet || S.street || "";
  const zip           = S.addressZip || S.zip || "";
  const city          = S.addressCity || S.city || "";
  const country       = S.addressCountry || S.country || "";
  const email         = S.email || "";
  const phone         = S.phone || "";
  const logoUrl       = S.logoUrl || S.logo || "";
  const bankName      = S.bankName || "";
  const iban          = S.bankIban || S.iban || "";
  const bic           = S.bankBic || S.bic || "";
  const taxId         = S.taxId || S.steuerNr || "";
  const ustId         = S.ustId || S.vatId || "";

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <title>Beleg #{receipt.receiptNo || "—"} – Druckansicht</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          :root{
            --paper-w: 210mm; /* A4 */
            --paper-h: 297mm;
            --pad: 16mm;
            --border: #e5e7eb;
            --ink: #111827;
            --muted: #6b7280;
            --accent: #111827;
          }
          *{ box-sizing:border-box; }
          html,body{ margin:0; padding:0; color:var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }

          .sheet{
            width: var(--paper-w);
            min-height: var(--paper-h);
            margin: 0 auto;
            background: #fff;
            padding: var(--pad);
            display:flex; flex-direction:column; gap:12mm;
          }
          header{
            display:grid; grid-template-columns: 1fr auto; gap:10mm; align-items:center;
            border-bottom:1px solid var(--border); padding-bottom:6mm;
          }
          .brand{
            display:flex; gap:8mm; align-items:center;
          }
          .brand .logo{ width:24mm; height:24mm; object-fit:contain; border-radius:6px; border:1px solid var(--border); background:#fafafa; }
          .brand .name{ font-weight:800; font-size:18px; }
          .brand .line{ color:var(--muted); margin-top:2mm; font-size:12px; }

          .contact{
            text-align:right; font-size:12px; color:var(--muted);
          }

          .addr{
            display:grid; grid-template-columns: 1fr; gap:2mm;
            margin-top:2mm;
          }
          .addr .from{
            font-size:12px; color:var(--muted);
          }
          .addr .from .sep{ color:#9ca3af; }
          .addr .to{
            margin-top:6mm;
            border-top:1px solid var(--border);
            padding-top:6mm;
            line-height:1.4;
          }

          .doc-head{
            display:flex; align-items:baseline; justify-content:space-between; gap:8mm;
          }
          .doc-head h1{ margin:0; font-size:20px; }
          .meta{ color:var(--muted); font-size:12px; }

          table{
            width:100%; border-collapse:collapse; font-size:12px;
          }
          th, td{
            border-bottom:1px solid var(--border);
            padding:4mm 2mm;
            vertical-align:top;
          }
          th{ text-align:left; font-weight:700; }
          td.right, th.right{ text-align:right; }

          .totals{
            display:grid; grid-template-columns: 1fr minmax(40mm, 50mm);
            gap:8mm; margin-top:6mm; align-items:end;
          }
          .totals .box{
            border:1px solid var(--border);
            padding:4mm;
            border-radius:4px;
          }
          .totals .line{ display:flex; justify-content:space-between; margin:2mm 0; }
          .totals .grand{ font-weight:800; font-size:14px; margin-top:3mm; }

          footer{
            margin-top:auto;
            border-top:1px solid var(--border);
            padding-top:6mm;
            font-size:11px; color:var(--muted);
            display:grid; grid-template-columns: 2fr 1fr; gap:8mm;
          }
          .bank small{ display:block; color:#9ca3af; }

          .print-actions{
            position:sticky; top:0; background:#fff; padding:8px 0; margin-bottom:8px;
            display:flex; gap:8px; justify-content:flex-end;
          }
          .btn{ padding:8px 12px; border:1px solid #ccc; border-radius:8px; background:#fff; cursor:pointer; }
          .btn.primary{ background:#111827; color:#fff; border-color:#111827; }

          @media print{
            .print-actions{ display:none; }
            body{ background:#fff; }
          }
        `}</style>
      </head>
      <body>
        <div className="print-actions" aria-hidden="true">
          <button className="btn" onClick={() => history.back()}>Zurück</button>
          <button className="btn primary" onClick={() => print()}>Drucken</button>
        </div>

        <div className="sheet">
          <header>
            <div className="brand">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="logo" />
              ) : (
                <div className="logo" />
              )}
              <div>
                <div className="name">{companyName}</div>
                <div className="line">
                  {ownerName ? `${ownerName} • ` : ""}{street ? `${street} • ` : ""}
                  {zip} {city}
                </div>
              </div>
            </div>
            <div className="contact">
              {email && <div>{email}</div>}
              {phone && <div>{phone}</div>}
            </div>
          </header>

          <section className="addr">
            <div className="from">
              {/* Absenderzeile im Dokumentkopf */}
              {companyName}{street ? " • " + street : ""} • {zip} {city}
            </div>

            {/* Empfängerblock – bei Belegen oft optional; hier weggelassen, da das Belege-Modul keinen Kunden erzwingt */}
          </section>

          <section className="doc-head">
            <h1>Beleg</h1>
            <div className="meta">
              <div><strong>Nr.:</strong> {receipt.receiptNo || "—"}</div>
              <div><strong>Datum:</strong> {receipt.date ? new Date(receipt.date).toLocaleDateString("de-DE") : "—"}</div>
            </div>
          </section>

          <section>
            <table>
              <thead>
                <tr>
                  <th style={{ width:"60%" }}>Bezeichnung</th>
                  <th className="right" style={{ width:"10%" }}>Menge</th>
                  <th className="right" style={{ width:"15%" }}>Einzelpreis</th>
                  <th className="right" style={{ width:"15%" }}>Summe</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color:"#6b7280" }}>Keine Positionen vorhanden.</td>
                  </tr>
                )}
                {items.map((it, i) => {
                  const qty  = Number(it.quantity || 0);
                  const unit = Number(it.unitPriceCents || 0);
                  const line = Number(it.lineTotalCents ?? qty*unit);
                  return (
                    <tr key={i}>
                      <td>{it.name || "Position"}</td>
                      <td className="right">{qty}</td>
                      <td className="right">{money(unit, currency)}</td>
                      <td className="right">{money(line, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {receipt.note && (
              <div style={{ marginTop:"4mm", color:"#6b7280" }}>
                <strong>Notiz:</strong> {receipt.note}
              </div>
            )}
          </section>

          <section className="totals">
            <div />
            <div className="box">
              <div className="line"><span>Netto</span><span>{money(receipt.netCents, currency)}</span></div>
              <div className="line"><span>USt</span><span>{money(receipt.taxCents, currency)}</span></div>
              <div className="grand">Gesamt: {money(receipt.grossCents, currency)}</div>
            </div>
          </section>

          <footer>
            <div className="bank">
              <div><strong>Bankverbindung</strong></div>
              {bankName && <div>{bankName}</div>}
              {iban && <div>IBAN: {iban}</div>}
              {bic && <div>BIC: {bic}</div>}
              {taxId && <small>St.-Nr.: {taxId}</small>}
              {ustId && <small>USt-IdNr.: {ustId}</small>}
            </div>
            <div style={{ textAlign:"right" }}>
              <div>{companyName}</div>
              {street && <div>{street}</div>}
              {(zip || city) && <div>{zip} {city}</div>}
              {country && <div>{country}</div>}
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
