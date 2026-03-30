"use client";

import { BRAND } from "@/lib/appBrand";

export default function AppFooter() {
  return (
    <footer className="no-print" style={wrap}>
      {BRAND.footerNote && (
        <div style={bottomNote}>{BRAND.footerNote}</div>
      )}
    </footer>
  );
}

const wrap = {
  marginTop: 32,
  borderTop: "1px solid var(--border)",
  background: "var(--panel)",
  color: "var(--text)"
};
const bottomNote = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "16px 24px",
  fontSize: 12,
  color: "var(--text-weak)",
  textAlign: "center"
};
