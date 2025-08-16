"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fromCents } from "@/lib/money";

export default function ReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all"); // all | today | 7 | 30

  async function load(query = "") {
    setLoading(true);
    const res = await fetch(`/api/receipts${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const json = await res.json().catch(() => ({ data: [] }));
    setRows(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  function inRange(dStr) {
    if (range === "all") return true;
    const d = new Date(dStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = (today - new Date(d.toDateString())) / (1000*60*60*24);
    if (range === "today") return d.toDateString() === today.toDateString();
    if (range === "7") return diffDays <= 6;
    if (range === "30") return diffDays <= 29;
    return true;
    }

  async function onDelete(id) {
    if (!confirm("Beleg wirklich löschen?")) return;
    const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return alert(json.error || "Löschen fehlgeschlagen.");
    load(q);
  }

  const filtered = rows.filter(r => inRange(r.date));

  return (
    <main>
      <h1>Belege</h1>
      <p style={{ marginTop: -8, color: "#666" }}>Liste, Suche & Aktionen</p>

      <div style={{ ...toolbar }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(q); }}
          placeholder="Suchen nach Belegnummer …"
          style={input}
        />
        <button onClick={() => load(q)} style={btnGhost}>Suchen</button>

        <span style={{ marginLeft: 12, color: "#666" }}>Zeitraum:</span>
        <select value={range} onChange={(e)=> setRange(e.target.value)} style={inputSm}>
          <option value="all">Alle</option>
          <option value="today">Heute</option>
          <option value="7">Letzte 7 Tage</option>
          <option value="30">Letzte 30 Tage</option>
        </select>

        <span style={{ flex: 1 }} />
        <Link href="/" style={btnGhost}>← Zum Dashboard</Link>
      </div>

      <div style={{ ...card }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Nr.</th>
                <th style={th}>Datum</th>
                <th style={th}>Betrag</th>
                <th style={th}>Hinweis</th>
                <th style={{ ...th, textAlign: "right" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/belege/${r.id}`}>{r.receiptNo}</Link></td>
                  <td style={td}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={td}>{fromCents(r.grossCents, r.currency)}</td>
                  <td style={td}>{r.note || ""}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link href={`/belege/${r.id}`} style={btnGhost}>Ansehen</Link>{" "}
                    <button onClick={() => onDelete(r.id)} style={btnDanger}>Löschen</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: "center", color: "#999" }}>
                    {loading ? "Lade…" : "Keine Belege gefunden."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

const card = { background:"#fff", border:"1px solid #eee", borderRadius:12, padding:16, marginTop:12 };
const toolbar = { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:12, marginBottom:8 };
const input = { padding:"10px 12px", borderRadius:10, border:"1px solid #ddd", background:"#fff", outline:"none" };
const inputSm = { padding:"8px 10px", borderRadius:10, border:"1px solid #ddd", background:"#fff", outline:"none" };
const th = { textAlign:"left", borderBottom:"1px solid #eee", padding:"10px 8px", fontSize:13, color:"#555" };
const td = { borderBottom:"1px solid #f2f2f2", padding:"10px 8px", fontSize:14 };
const btnGhost = { padding:"8px 10px", borderRadius:8, border:"1px solid #111", background:"transparent", color:"#111", cursor:"pointer" };
const btnDanger = { padding:"8px 10px", borderRadius:8, border:"1px solid #c00", background:"#fff", color:"#c00", cursor:"pointer" };
