"use client";

import { useEffect, useMemo, useState } from "react";

function currency(cents, cur = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: cur }).format((cents || 0) / 100);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [currencyCode, setCurrencyCode] = useState("EUR");

  useEffect(() => {
    (async () => {
      try {
        const [cs, iv, rc, st] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/invoices",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/receipts",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
          fetch("/api/settings",  { cache: "no-store" }).then(r => r.json()).catch(() => ({ data:
