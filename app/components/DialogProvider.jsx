"use client";

import React, { createContext, useContext, useState } from "react";

const DialogContext = createContext(null);

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);

  function confirm(message) {
    return new Promise((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type: "confirm",
          message,
          onClose: (result) => resolve(result),
        },
      ]);
    });
  }

  function alert(message) {
    return new Promise((resolve) => {
      setDialogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type: "alert",
          message,
          onClose: () => resolve(true),
        },
      ]);
    });
  }

  function closeDialog(id, result) {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog) dialog.onClose(result);
      return prev.filter((d) => d.id !== id);
    });
  }

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialogs.map((dialog) => (
        <div key={dialog.id} className="ivx-modal" style={{ zIndex: 9999 }}>
          <div className="ivx-modal-box" style={{ maxWidth: "400px", margin: "auto", alignSelf: "center", marginTop: "20vh" }}>
            <div className="ivx-modal-head" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <div className="h5">{dialog.type === "confirm" ? "Bestätigung" : "Hinweis"}</div>
            </div>
            <div className="surface section" style={{ padding: "16px", paddingTop: "8px" }}>
              <p>{dialog.message}</p>
            </div>
            <div className="ivx-modal-actions" style={{ borderTop: "none", paddingTop: 0 }}>
              {dialog.type === "confirm" && (
                <button
                  className="btn btn--subtle"
                  onClick={() => closeDialog(dialog.id, false)}
                >
                  Abbrechen
                </button>
              )}
              <button
                className={`btn ${dialog.type === "confirm" ? "btn--danger" : "btn--primary"}`}
                onClick={() => closeDialog(dialog.id, true)}
              >
                {dialog.type === "confirm" ? "Bestätigen" : "OK"}
              </button>
            </div>
          </div>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        .ivx-modal {
          position: fixed; inset: 0; background: rgba(0,0,0,.4);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 16px; z-index: 50;
        }
        .ivx-modal-box {
          width: min(980px, 100%);
          background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
          max-height: calc(100vh - 48px);
          overflow-y: auto; overflow-x: hidden;
        }
        .ivx-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; background: var(--panel); z-index: 1;
        }
        .ivx-modal-actions {
          display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px;
          position: sticky; bottom: 0; background: var(--panel); border-top: 1px solid var(--border);
        }
      `}} />
    </DialogContext.Provider>
  );
}