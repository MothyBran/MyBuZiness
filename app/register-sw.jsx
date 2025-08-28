// app/register-sw.jsx
"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const url = "/sw.js"; // liegt in /public
    navigator.serviceWorker
      .register(url, { scope: "/" })
      .then((reg) => {
        console.log("[SW] registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[SW] registration failed:", err);
      });
  }, []);

  return null;
}
