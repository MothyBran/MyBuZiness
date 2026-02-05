// app/termine/eintrag/[id]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Page, PageHeader, PageGrid, Col, Card, Button, Modal, StatusPill, Badge
} from "../../../components/UI";
import AppointmentForm from "@/app/components/AppointmentForm";

function fmtDateDE(input){
  try{
    const d = new Date(input);
    if (!isNaN(d)) {
      return new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", weekday:"long" }).format(d);
    }
  }catch{}
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y,m,d] = input.slice(0,10).split("-").map(Number);
    return new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", weekday:"long" }).format(new Date(y, m-1, d));
  }
  return String(input || "");
}

export default function EntryDetailPage({ params }){
  const { id } = use(params);
  const router = useRouter();

  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [customers, setCustomers] = useState([]);

  async function load(){
    setLoading(true); setError("");
    try{
      const r = await fetch(`/api/appointments/${id}`, { cache:"no-store" });
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setData(js);
    }catch(e){
      console.error(e);
      setError("Eintrag konnte nicht geladen werden.");
      setData(null);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [id]);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch("/api/customers", { cache:"no-store" }).catch(()=>null);
        const js = r && r.ok ? await r.json() : { data: [] };
        setCustomers(js?.data || []);
      }catch{ setCustomers([]); }
    })();
  },[]);

  async function onDelete(){
    if (!data) return;
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const r = await fetch(`/api/appointments/${data.id}`, { method:"DELETE" });
    if (!r.ok) {
      alert("Löschen fehlgeschlagen.");
      return;
    }
    const target = data?.date
      ? `/termine/${(typeof data.date === "string" ? data.date.slice(0,10) : new Date(data.date).toISOString().slice(0,10))}`
      : "/termine";
    router.push(target);
  }

  function onSavedEdit(){
    setEditOpen(false);
    load();
  }

  const statusLabel = data
    ? (data.status === "cancelled" ? "abgesagt" : data.status === "done" ? "abgeschlossen" : "offen")
    : "";

  return (
    <Page>
      <PageHeader
        title="Eintrag · Details"
        actions={
          <>
            {data?.date ? (
              <Link href={`/termine/${(typeof data.date==="string" ? data.date.slice(0,10) : new Date(data.date).toISOString().slice(0,10))}`} className="btn btn--ghost">
                ← Tagesansicht
              </Link>
            ) : (
              <Link href="/termine" className="btn btn--ghost">← Kalender</Link>
            )}
            <Button onClick={()=>setEditOpen(true)}>Bearbeiten</Button>
            <Button variant="danger" onClick={onDelete}>Löschen</Button>
          </>
        }
      />

      <PageGrid>
        <Col span={12}>
          <Card title="Zusammenfassung">
            {loading && <div className="muted">Lade…</div>}
            {!loading && error && <div className="error">{error}</div>}

            {!loading && !error && data && (
              <div style={{ display:"grid", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div className="card" style={{ padding:12 }}>
                    <div className="muted">Art</div>
                    <div style={{ fontWeight:700, marginTop:4 }}>
                      {data.kind === "order" ? "Auftrag" : "Termin"}
                    </div>
                  </div>
                  <div className="card" style={{ padding:12 }}>
                    <div className="muted">Status</div>
                    <div style={{ marginTop:4 }}><StatusPill status={statusLabel} /></div>
                  </div>
                </div>

                <div className="card" style={{ padding:12 }}>
                  <div className="muted">Bezeichnung</div>
                  <div style={{ fontWeight:700, marginTop:4 }}>{data.title || "—"}</div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  <div className="card" style={{ padding:12 }}>
                    <div className="muted">Datum</div>
                    <div style={{ fontWeight:700, marginTop:4 }}>
                      {fmtDateDE(typeof data.date === "string" ? data.date.slice(0,10) : data.date)}
                    </div>
                  </div>
                  <div className="card" style={{ padding:12 }}>
                    <div className="muted">Zeit</div>
                    <div style={{ fontWeight:700, marginTop:4 }}>
                      {data.startAt?.slice(0,5)}{data.endAt ? ` – ${data.endAt.slice(0,5)}` : ""}
                    </div>
                  </div>
                  <div className="card" style={{ padding:12 }}>
                    <div className="muted">Kunde</div>
                    <div style={{ fontWeight:700, marginTop:4 }}>{data.customerName || "—"}</div>
                  </div>
                </div>

                <div className="card" style={{ padding:12 }}>
                  <div className="muted">Notiz</div>
                  <div style={{ marginTop:4, whiteSpace:"pre-wrap" }}>{data.note || "—"}</div>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </PageGrid>

      {/* Modal: Bearbeiten */}
      <Modal
        open={editOpen}
        onClose={()=>setEditOpen(false)}
        title="Eintrag bearbeiten"
        footer={null}
      >
        {data && (
          <AppointmentForm
            initial={{
              id: data.id,
              kind: data.kind,
              title: data.title,
              date: typeof data.date === "string" ? data.date.slice(0,10) : new Date(data.date).toISOString().slice(0,10),
              startAt: data.startAt?.slice(0,5) || "09:00",
              endAt: data.endAt?.slice(0,5) || "",
              customerId: data.customerId || "",
              customerName: data.customerName || "",
              status: data.status || "open",
              note: data.note || "",
            }}
            customers={customers}
            onSaved={onSavedEdit}
            onCancel={()=>setEditOpen(false)}
          />
        )}
      </Modal>
    </Page>
  );
}
