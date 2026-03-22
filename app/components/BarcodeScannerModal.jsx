"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function BarcodeScannerModal({ onClose, onScan }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    // Create the scanner instance
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, formatsToSupport: [
        0, // QR_CODE (oftmals gut für generelle Erkennung, auch wenn 1D gemeint ist)
        1, // AZTEC
        2, // CODABAR
        3, // CODE_39
        4, // CODE_93
        5, // CODE_128 (Der klassische 1D Barcode)
        6, // DATA_MATRIX
        7, // MAXICODE
        8, // ITF
        9, // EAN_13
        10, // EAN_8
        11, // PDF_417
        12, // RSS_14
        13, // RSS_EXPANDED
        14, // UPC_A
        15, // UPC_E
        16, // UPC_EAN_EXTENSION
      ] },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (err) => {
        // Ignoriere laufende Erkennungsfehler
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [onScan]);

  return (
    <div className="ivx-modal" role="dialog" aria-modal="true" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="ivx-modal-box" onClick={(e)=>e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="ivx-modal-head">
          <h2 style={{margin:0}}>Barcode scannen</h2>
          <button className="btn-ghost" onClick={onClose}>Schließen</button>
        </div>
        <div className="surface section">
          <div id="reader" style={{ width: "100%" }}></div>
        </div>
      </div>
    </div>
  );
}
