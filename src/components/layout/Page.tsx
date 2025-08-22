import React from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  return <div className="grid" style={{ display:"grid", gap: 16 }}>{children}</div>;
}
