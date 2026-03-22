const fs = require('fs');
const file = 'app/belege/[id]/druck/page.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const \[err, setErr\] = useState\(""\);/
const stateVars = `const [err, setErr] = useState("");
  const [settings, setSettings] = useState({});`;

content = content.replace(regex, stateVars);

const fetchRegex = /const json = await res\.json\(\);/
const fetchSettings = `const json = await res.json();
      const sres = await fetch("/api/settings");
      if (sres.ok) setSettings((await sres.json()) || {});`;

content = content.replace(fetchRegex, fetchSettings);

const cssRegex = /<style dangerouslySetInnerHTML=\{\{__html: \`/
const cssChanges = `<style dangerouslySetInnerHTML={{__html: \`
        @page {
          margin: 0;
        }
        @media print {
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-area { margin: 0 auto; padding: 4mm; width: 80mm; max-width: 80mm; box-shadow: none; border: none; font-size: 10pt; line-height: 1.2; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        body { background: #f8fafc; color: var(--color-text, #1e293b); font-family: var(--font-family, sans-serif); }
        .print-area {
          width: 80mm; max-width: 80mm; margin: 2rem auto; padding: 4mm;
          background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          font-size: 10pt; line-height: 1.2;
          --color-primary: \${settings.primaryColor || "#0aa"};
          font-family: \${settings.fontFamily || "sans-serif"};
        }
        .header { margin-bottom: 1rem; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.5rem; text-align: center; }
        .logo { max-width: 60mm; max-height: 20mm; margin: 0 auto 10px; display: block; object-fit: contain; }
        .title { font-size: 14pt; font-weight: bold; margin: 0 0 5px; }
        .meta-table { width: 100%; text-align: left; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
        .meta-table td { padding: 2px 0; }
        .meta-table td:last-child { text-align: right; }
        .meta-table strong { color: var(--color-text, #475569); }

        .items-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .items-table th, .items-table td { padding: 4px 0; text-align: left; vertical-align: top; }
        .items-table th { font-weight: bold; border-bottom: 1px dashed #e2e8f0; }
        .items-table .num { text-align: right; }
        .item-name { display: block; font-weight: bold; margin-bottom: 2px; }
        .item-details { font-size: 8pt; color: #555; }

        .totals { margin-top: 1rem; border-top: 1px dashed #e2e8f0; padding-top: 1rem; }
        .totals-table { width: 100%; border-collapse: collapse; }
        .totals-table td { padding: 3px 0; text-align: right; }
        .totals-table .label { text-align: left; }
        .totals-table .final { font-size: 12pt; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 5px; }

        .note { margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed #cbd5e1; font-size: 8pt; text-align: center; }

        .btn-print {
          display: block; margin: 2rem auto; padding: 0.75rem 1.5rem;
          background: var(--color-primary, #0aa); color: white; border: none; border-radius: 0.5rem;
          font-size: 1rem; cursor: pointer; font-weight: bold;
        }
\`;

content = content.replace(/<style dangerouslySetInnerHTML=\{\{__html: `[\s\S]*?`\}\} \/>/, cssChanges + "}} />");

const jsxRegex = /<div className="print-area">[\s\S]*?<\/div>\n    <\/>/
const jsxChanges = `<div className="print-area">
        <div className="header">
          {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="logo" />}
          <h1 className="title">{settings.companyName || "Quittung"}</h1>
          <div style={{ fontSize: "9pt", margin: "5px 0" }}>
            {settings.address1 && <div>{settings.address1}</div>}
            {settings.postalCode || settings.city ? <div>{settings.postalCode} {settings.city}</div> : null}
            {settings.email && <div>{settings.email}</div>}
          </div>

          <table className="meta-table">
            <tbody>
              <tr>
                <td><strong>Beleg-Nr:</strong></td>
                <td>{data.receiptNo || "—"}</td>
              </tr>
              <tr>
                <td><strong>Datum:</strong></td>
                <td>{fmtDEDate(data.date)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th className="num">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={{ paddingBottom: "8px" }}>
                  <span className="item-name">{idx + 1}. {it.name}</span>
                  <span className="item-details">{it.quantity} x {money(it.unitPriceCents, curr)}</span>
                </td>
                <td className="num" style={{ verticalAlign: "bottom", paddingBottom: "8px" }}>
                  {money(it.lineTotalCents || (it.quantity * it.unitPriceCents), curr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="label">Zwischensumme</td>
                <td>{money(data.netCents + (data.discountCents || 0), curr)}</td>
              </tr>
              {data.discountCents > 0 && (
                <tr>
                  <td className="label">Rabatt</td>
                  <td>- {money(data.discountCents, curr)}</td>
                </tr>
              )}
              <tr>
                <td className="label">Netto</td>
                <td>{money(data.netCents, curr)}</td>
              </tr>
              <tr>
                <td className="label">USt. {data.vatExempt ? "(Befreit)" : "19%"}</td>
                <td>{money(data.taxCents, curr)}</td>
              </tr>
              <tr>
                <td className="label final">Gesamt</td>
                <td className="final">{money(data.grossCents, curr)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {data.note && (
          <div className="note">
            <strong>Notiz:</strong><br/>
            {data.note}
          </div>
        )}
      </div>
    </>`;

content = content.replace(jsxRegex, jsxChanges);
fs.writeFileSync(file, content);
