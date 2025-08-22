import React from "react";
import { useTheme } from "../theme/ThemeProvider";

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
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <strong>{settings.companyName || "Unternehmen"}</strong>
        {settings.currency || settings.currencyDefault ? (
          <span className="badge">💱 {settings.currency || settings.currencyDefault}</span>
        ) : null}
      </div>
    </div>
  );
};

export default InfoStripe;
