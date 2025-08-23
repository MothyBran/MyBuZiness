"use client";

// app/components/UI.jsx
import Link from "next/link";

export function ModuleLink({ href, children }) {
  return (
    <Link href={href} className="btn module-link">
      {children}
    </Link>
  );
}

/**
 * Nutzung:
 * <Table head={["Nr.","Kunde","Datum","Brutto"]} hideOnSmall={[2]}>
 *   <tr>
 *     <td>1001</td>
 *     <td className="ellipsis">Muster GmbH…</td>
 *     <td className="hide-sm">01.08.2025</td>  // Spalte 3 mobil ausblenden
 *     <td>€ 199,00</td>
 *   </tr>
 * </Table>
 */
export function Table({ head = [], hideOnSmall = [], children }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={hideOnSmall.includes(i) ? "hide-sm" : ""}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(children)
            ? children.map((row, ri) => cloneRow(row, hideOnSmall, ri))
            : cloneRow(children, hideOnSmall, 0)}
        </tbody>
      </table>
    </div>
  );
}

function cloneRow(row, hideOnSmall, key) {
  if (!row || !row.props) return row;
  const tds = Array.isArray(row.props.children) ? row.props.children : [row.props.children];
  const mapped = tds.map((td, i) => {
    if (!td || !td.props) return td;
    const cls = td.props.className || "";
    const extra = hideOnSmall.includes(i) ? " hide-sm" : "";
    return { ...td, props: { ...td.props, className: (cls + extra).trim() } };
  });
  return { ...row, key, props: { ...row.props, children: mapped } };
}

export function Section({ children, className = "" }) {
  return <section className={`container ${className}`}>{children}</section>;
}
export function Card({ children, className = "", hover = true, as: Tag = "div" }) {
  return <Tag className={`surface ${className}`} data-hover={hover ? "1" : "0"}>{children}</Tag>;
}
export function StatCard({ title, value, foot }) {
  return (
    <Card className="stat">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </Card>
  );
}
export function Panel({ title, children }) {
  return (
    <Card className="panel">
      <div className="panel-title">{title}</div>
      {children}
    </Card>
  );
}
export function Muted({ children }) {
  return <span style={{ color: "var(--muted)" }}>{children}</span>;
}
