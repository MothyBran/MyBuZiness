"use client";

import React, { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

/* ===== Icons (inline, keine extra Abhängigkeit) ===== */
const icons = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>
    </svg>
  ),
  save: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M17 3H7a2 2 0 0 0-2 2v14l7-3 7 3V5a2 2 0 0 0-2-2z"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29 10.59 10.59 16.89 4.29z"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M5 20h14v-2H5v2zm7-18l-5 5h3v6h4V7h3l-5-5z"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 011 1v15a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3V2zm13 20V9H4v13h16z"/>
    </svg>
  ),
  euro: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M4 13h2.09a6 6 0 006.91 4 6 6 0 004.58-2.12l-1.52-1.29A4 4 0 0113 15a4 4 0 01-3.66-2H16v-2H9.34A4 4 0 0113 9a4 4 0 012.06.57l1.52-1.29A6 6 0 0013 7a6 6 0 00-6.91 4H4v2z"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M9 16.17l-3.88-3.88L3.7 13.71 9 19l12-12-1.41-1.41z"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
};

/* ===== Primitives ===== */
export function Icon({ name, className, title }) {
  return (
    <span className={className} title={title} aria-hidden>
      {icons[name] ?? null}
    </span>
  );
}

/* Page, Header, Actions */
export function Page({ children }) {
  return <div className="page">{children}</div>;
}
export function PageHeader({ title, actions }) {
  return (
    <div className="page__header">
      <div className="page__title">{title}</div>
      {actions ? <div className="page__actions">{actions}</div> : null}
    </div>
  );
}

/* Card */
export function Card({ title, actions, children, scrollX = false, className = "" }) {
  return (
    <section className={`card ${scrollX ? "card--scrollx" : ""} ${className}`}>
      {(title || actions) && (
        <div className="card__header">
          <div className="card__title">{title}</div>
          <div className="card__actions">{actions}</div>
        </div>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}

/* Buttons */
export function Button({ variant = "default", icon, children, className = "", ...rest }) {
  const cls = [
    "btn",
    variant === "primary" ? "btn--primary" : "",
    variant === "danger" ? "btn--danger" : "",
    variant === "ghost" ? "btn--ghost" : "",
    variant === "subtle" ? "btn--subtle" : "",
    icon && !children ? "btn--icon" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

/* Fields */
export function Field({ label, required, hint, error, children, className = "" }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label">
          <span>{label}</span>
          {required ? <span className="req">*</span> : null}
        </label>
      )}
      {children}
      {hint && !error && <div className="help">{hint}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

/* Inputs */
export function Input(props) {
  return <input className={`input ${props.className || ""}`} {...props} />;
}
export function Textarea(props) {
  return <textarea className={`textarea ${props.className || ""}`} {...props} />;
}
export function Select({ options = [], ...props }) {
  return (
    <select className={`select ${props.className || ""}`} {...props}>
      {options.map((opt) => (
        <option key={String(opt.value ?? opt)} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}
export function DateInput(props) {
  return <input type="date" className={`input ${props.className || ""}`} {...props} />;
}
export function TimeInput(props) {
  return <input type="time" className={`input ${props.className || ""}`} {...props} />;
}
export function CurrencyInput({ value, onChange, currency = "EUR", locale = "de-DE", ...rest }) {
  // Text-Eingabe, Anzeige rechtsbündig; keine harte Formatierung beim Tippen (vermeidet Cursor-Sprünge).
  return (
    <input
      inputMode="decimal"
      className={`input input--right ${rest.className || ""}`}
      placeholder="0,00"
      value={value}
      onChange={onChange}
      {...rest}
    />
  );
}
export function CurrencyGroup({ value, onChange, currency = "€", ...rest }) {
  return (
    <div className="input-group">
      <span className="addon"><Icon name="euro" /></span>
      <input className="control mono" inputMode="decimal" value={value} onChange={onChange} placeholder="0,00" {...rest}/>
    </div>
  );
}

/* Badges / Status */
export function Badge({ children, tone = "muted", icon }) {
  const cls = `badge badge--${tone}`;
  return (
    <span className={cls}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}
export function StatusPill({ status }) {
  const map = {
    offen: { tone: "warning", label: "Offen" },
    bezahlt: { tone: "success", label: "Bezahlt" },
    überfällig: { tone: "danger", label: "Überfällig" },
    storniert: { tone: "muted", label: "Storniert" },
    entwurf: { tone: "info", label: "Entwurf" },
    abgeschlossen: { tone: "success", label: "Abgeschlossen" },
    geplant: { tone: "info", label: "Geplant" },
  };
  const m = map[(status || "").toLowerCase()] ?? { tone: "muted", label: status || "—" };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/* Table */
export function Table({ columns = [], rows = [], keyProp = "id", className = "" }) {
  return (
    <div className="table-wrap">
      <table className={`table tr-hover ${className}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key || c.accessor} className={c.align === "right" ? "tx-right" : ""}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r[keyProp] ?? idx}>
              {columns.map((c) => {
                const val = typeof c.accessor === "function" ? c.accessor(r) : r[c.accessor];
                return (
                  <td key={(c.key || c.accessor) + "_" + idx} className={c.align === "right" ? "tx-right mono" : ""}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableBar({ left, right }) {
  return (
    <div className="tablebar">
      <div>{left}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div>
    </div>
  );
}

/* Modal */
export function Modal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <Button variant="ghost" icon="x" onClick={onClose} aria-label="Schließen" />
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

/* Helpers */
export function PageGrid({ children }) {
  return <div className="grid">{children}</div>;
}
export function Col({ span = 12, children, className = "" }) {
  const style = { gridColumn: `span ${Math.max(1, Math.min(12, span))} / span ${Math.max(1, Math.min(12, span))}` };
  return <div style={style} className={className}>{children}</div>;
}
