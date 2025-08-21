// src/components/ui/Table.tsx
import React from "react";

export const TableShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="card">
    <div className="card__content" style={{ paddingTop: 0 }}>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  </div>
);

export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table className="table table--compact">{children}</table>
);

export const Th: React.FC<React.PropsWithChildren> = ({ children }) => (
  <th style={{ background: "rgba(255,255,255,.03)", position: "sticky", top: 0, zIndex: 1 }}>{children}</th>
);

export const TrClickable: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, ...props }) => (
  <tr
    {...props}
    style={{
      cursor: "pointer",
      transition: ".15s ease",
      ...(props.style || {})
    }}
    onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = "rgba(255,255,255,.03)"))}
    onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = ""))}
  >
    {children}
  </tr>
);
