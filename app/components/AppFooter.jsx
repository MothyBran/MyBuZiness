"use client";

import { BRAND } from "@/lib/appBrand";

export default function AppFooter() {
  const linesLeft = [
    BRAND.companyName,
    `${BRAND.street}, ${BRAND.zipCity}`,
    BRAND.country
  ].filter(Boolean);

  const linesRight = [
    BRAND.email && `E-Mail: ${BRAND.email}`,
    BRAND.phone && `Tel: ${BRAND.phone}`,
    BRAND.website && BRAND.website,
    BRAND.hrb && `Handelsregister: ${BRAND.hrb}`,
    BRAND.vatId && `USt-ID: ${BRAND.vatId}`
  ].filter(Boolean);

  return (
    <footer style={wrap}>
      <div style={inner}>
        <div style={{ display: "grid", gap: 4 }}>
          {linesLeft.map((x, i) => <div key={i}>{x}</div>)}
        </div>
        <div style={{ display: "grid", gap: 4, textAlign: "right" }}>
          {linesRight.map((x, i) => <div key={i}>{x}</div>)}
        </div>
      </div>
      {BRAND.footerNote && (
        <div style={bottomNote}>{BRAND.footerNote}</div>
      )}
    </footer>
  );
}

const wrap = {
  marginTop: 32,
  borderTop: "1px solid #eee",
  background: "#fff",
  color: "var(--color-text)"
};
const inner = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "16px 24px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  fontSize: 14
};
const bottomNote = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "8px 24px 20px",
  fontSize: 12,
  color: "#666"
};
