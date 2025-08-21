import React from "react";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Anzeigeleiste unter dem Header. Inhalte & Farben kommen aus Settings:
 * - primaryColor, secondaryColor, accentColor, backgroundColor, textColor, borderRadius, fontFamily
 * - headerTitle, companyName, ownerName, city, currency, iban, vatId, taxNumber, taxOffice, phone, email
 */
const InfoStripe: React.FC = () => {
  const { settings } = useTheme();
  if (!settings) return null;

  return (
    <div
      style={{
        background: `linear-gradient(90deg, var(--color-primary), var(--color-accent))`,
        color: "#0b1220",
        borderRadius: "12px",
        padding: "10px 14px",
        margin: "12px 0",
        boxShadow: "var(--shadow-md)"
      }}
    >
      <div className="container" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <strong>{settings.companyName || "Unternehmen"}</strong>
        {settings.city ? <span className="badge">📍 {settings.city}</span> : null}
        {settings.currency || settings.currencyDefault ? (
          <span className="badge">💱 {settings.currency || settings.currencyDefault}</span>
        ) : null}
        {settings.iban ? <span className="badge">🏦 IBAN: {settings.iban}</span> : null}
        {settings.vatId ? <span className="badge">💼 USt‑ID: {settings.vatId}</span> : null}
        {settings.taxNumber ? <span className="badge">🧾 St‑Nr.: {settings.taxNumber}</span> : null}
        {settings.phone ? <span className="badge">📞 {settings.phone}</span> : null}
        {settings.email ? <span className="badge">✉️ {settings.email}</span> : null}
      </div>
    </div>
  );
};

export default InfoStripe;

