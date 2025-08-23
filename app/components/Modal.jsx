// app/components/Modal.jsx
"use client";

export default function Modal({ open, onClose, title, children, maxWidth = 980 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{ maxWidth }}
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="modal-head">
          <strong className="modal-title">{title}</strong>
          <button onClick={onClose} className="modal-close" aria-label="Schließen">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      {/* Modal-Styles (scoped) */}
      <style jsx>{`
        .modal-overlay{
          position: fixed; inset: 0; background: rgba(0,0,0,.35);
          display:flex; align-items:center; justify-content:center;
          z-index: 1000; padding: 16px;
        }
        .modal-sheet{
          width: 100%; max-height: 90vh; overflow:auto;
          background:#fff; border:1px solid rgba(0,0,0,.12);
          border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.15);
        }
        .modal-head{
          position:sticky; top:0; z-index:1;
          display:flex; align-items:center; justify-content:space-between;
          padding: 12px 14px; border-bottom:1px solid rgba(0,0,0,.06); background:#fff;
          border-top-left-radius:14px; border-top-right-radius:14px;
        }
        .modal-title{ font-size: 16px; font-weight: 800; }
        .modal-close{
          border:1px solid rgba(0,0,0,.12); background:#fff; border-radius:10px;
          width:32px; height:32px; font-size:18px; line-height:1; cursor:pointer;
        }
        .modal-body{ padding: 14px; }
      `}</style>
    </div>
  );
}
