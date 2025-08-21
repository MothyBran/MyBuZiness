// src/components/layout/Page.tsx (Grid-Layout zwischen Header & Footer)
import React from "react";
import { Sidebar } from "./Sidebar";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <main className="container" style={{display:"grid", gridTemplateColumns:"260px 1fr", gap:16, padding:"16px 0"}}>
      <div className="sidebar">
        <div className="card card--hover">
          <div className="card__content">
            <Sidebar />
          </div>
        </div>
      </div>
      <section>{children}</section>
    </main>
  );
};
