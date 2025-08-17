"use client";

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

export function Table({ head = [], children }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Muted({ children }) {
  return <span style={{ color: "var(--muted)" }}>{children}</span>;
}
