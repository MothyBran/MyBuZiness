"use client";

export default function Modal({ open, onClose, title, children, maxWidth = 980 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth }}
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="modal-head">
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <button onClick={onClose} className="modal-close" aria-label="Schließen">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
