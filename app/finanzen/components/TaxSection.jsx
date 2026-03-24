// app/finanzen/components/TaxSection.jsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useDialog } from "@/app/components/DialogProvider";
import { Calculator, Save, AlertTriangle, Building2, User, Coins } from "lucide-react";

function centsToEUR(c){ return (Number(c||0)/100).toFixed(2).replace(".", ",") + " €"; }
function parseEURToCents(val) {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/\./g, "").replace(",", "."));
  return Number.isNaN(num) ? 0 : Math.round(num * 100);
}
function formatInputEUR(c) {
  if (c === null || c === undefined || c === 0) return "";
  return (Number(c||0)/100).toFixed(2).replace(".", ",");
}

export default function TaxSection({ year, isKleinunternehmer }) {
  const { alert: alertMsg } = useDialog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    gewerbesteuerHebesatz: 400,
    estVorauszahlung: "",
    gewstVorauszahlung: "",
    ustVorauszahlung: "",
    tatsaechlicheEst: "",
    tatsaechlicheGewst: "",
    tatsaechlicheUst: "",
    zusammenveranlagung: false,
    partnerEinkommen: "",
    kirchensteuer: false,
    kirchensteuerSatz: 9,
    steuerklasse: "1"
  });

  async function loadData() {
    setLoading(true);
    try {
      const r = await fetch(`/api/finances/tax?year=${year}`);
      const j = await r.json();
      if (j.ok) {
        setData(j);
        setForm({
          gewerbesteuerHebesatz: j.data.gewerbesteuerHebesatz || 400,
          estVorauszahlung: formatInputEUR(j.data.estVorauszahlungCents),
          gewstVorauszahlung: formatInputEUR(j.data.gewstVorauszahlungCents),
          ustVorauszahlung: formatInputEUR(j.data.ustVorauszahlungCents),
          tatsaechlicheEst: formatInputEUR(j.data.tatsaechlicheEstCents),
          tatsaechlicheGewst: formatInputEUR(j.data.tatsaechlicheGewstCents),
          tatsaechlicheUst: formatInputEUR(j.data.tatsaechlicheUstCents),
          zusammenveranlagung: j.data.zusammenveranlagung || false,
          partnerEinkommen: formatInputEUR(j.data.partnerEinkommenCents),
          kirchensteuer: j.data.kirchensteuer || false,
          kirchensteuerSatz: j.data.kirchensteuerSatz || 9,
          steuerklasse: j.data.steuerklasse || "1"
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [year]);

  async function saveTaxes(e) {
    e.preventDefault();
    try {
      const payload = {
        year: parseInt(year, 10),
        gewerbesteuerHebesatz: parseInt(form.gewerbesteuerHebesatz, 10) || 400,
        estVorauszahlungCents: parseEURToCents(form.estVorauszahlung),
        gewstVorauszahlungCents: parseEURToCents(form.gewstVorauszahlung),
        ustVorauszahlungCents: parseEURToCents(form.ustVorauszahlung),
        tatsaechlicheEstCents: form.tatsaechlicheEst ? parseEURToCents(form.tatsaechlicheEst) : null,
        tatsaechlicheGewstCents: form.tatsaechlicheGewst ? parseEURToCents(form.tatsaechlicheGewst) : null,
        tatsaechlicheUstCents: form.tatsaechlicheUst ? parseEURToCents(form.tatsaechlicheUst) : null,
        zusammenveranlagung: form.zusammenveranlagung,
        partnerEinkommenCents: parseEURToCents(form.partnerEinkommen),
        kirchensteuer: form.kirchensteuer,
        kirchensteuerSatz: parseInt(form.kirchensteuerSatz, 10),
        steuerklasse: form.steuerklasse
      };

      const r = await fetch("/api/finances/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Speichern fehlgeschlagen");

      await loadData();
      alertMsg("Steuerdaten erfolgreich gespeichert!");
    } catch (e) {
      alertMsg(e.message);
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  if (loading && !data) return <div className="surface" style={{padding: 24, textAlign: 'center'}}>Lade Steuerdaten...</div>;
  if (!data) return null;

  const est = data.estimates?.estCents || 0;
  const gewst = data.estimates?.gewstCents || 0;
  const soli = data.estimates?.soliCents || 0;
  const kist = data.estimates?.kistCents || 0;
  const eNet = data.euer?.profitCents || 0;

  // Tatsächliche Steuerlast heranziehen, falls vorhanden, sonst Schätzung
  const estVorauszahlungCents = parseEURToCents(form.estVorauszahlung);
  const gewstVorauszahlungCents = parseEURToCents(form.gewstVorauszahlung);
  const ustVorauszahlungCents = parseEURToCents(form.ustVorauszahlung);

  const tatEst = data.data.tatsaechlicheEstCents !== null ? data.data.tatsaechlicheEstCents : est;
  const tatGewst = data.data.tatsaechlicheGewstCents !== null ? data.data.tatsaechlicheGewstCents : gewst;
  // Hinweis: Wenn tatsächliche ESt eingetragen wird, gehen wir davon aus, dass Soli/KiSt darin enthalten oder getrennt abgerechnet wurden
  // Um hier eine korrekte Netto-Rechnung zu haben, nehmen wir die Schätzung, es sei denn, tatsächliche ESt ist ausgefüllt.
  const estimatedTotalTaxes = tatGewst + tatEst + (data.data.tatsaechlicheEstCents !== null ? 0 : (soli + kist));

  const netProfitAfterTaxes = eNet - estimatedTotalTaxes;

  return (
    <div className="surface" style={{marginBottom: 24}}>
      <div style={{fontWeight: 600, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8}}>
        <Calculator size={20} className="subtle" />
        Steuern & Vorauszahlungen (Jahr {year})
      </div>
      <div className="subtle" style={{marginBottom: 20}}>
        Hier können Sie Steuervorauszahlungen und den Gewerbesteuer-Hebesatz Ihrer Gemeinde eintragen. Basierend auf Ihrem EÜR-Gewinn ({centsToEUR(eNet)}) wird eine grobe Schätzung der Steuerlast vorgenommen (ohne Gewähr, ersetzt keinen Steuerberater!).
      </div>

      <div style={{display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginBottom: 24}}>

        {/* Schätzung */}
        <div style={{border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: 16, background: "var(--panel, #f8fafc)"}}>
          <h3 style={{fontSize: 15, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6}}>
            <AlertTriangle size={16} color="#d97706" /> Geschätzte Steuerlast
          </h3>
          <div style={{display: "grid", gap: 12}}>
            <div style={{display: "flex", justifyContent: "space-between"}}>
              <span><Building2 size={14} style={{display:'inline', verticalAlign:'text-bottom', marginRight: 4}} className="subtle"/> Gewerbesteuer</span>
              <span style={{fontWeight: 600}}>{centsToEUR(gewst)}</span>
            </div>
            <div className="subtle" style={{fontSize: 12, marginTop: -8}}>Freibetrag: 24.500 €</div>

            <div style={{display: "flex", justifyContent: "space-between"}}>
              <span><User size={14} style={{display:'inline', verticalAlign:'text-bottom', marginRight: 4}} className="subtle"/> Einkommensteuer</span>
              <span style={{fontWeight: 600}}>{centsToEUR(est)}</span>
            </div>
            <div className="subtle" style={{fontSize: 12, marginTop: -8}}>Berücksichtigt Grundfreibetrag, GewSt-Anrechnung und Zusammenveranlagung.</div>

            {soli > 0 && (
              <div style={{display: "flex", justifyContent: "space-between", fontSize: 13}}>
                <span className="subtle">Solidaritätszuschlag (≈)</span>
                <span>{centsToEUR(soli)}</span>
              </div>
            )}

            {kist > 0 && (
              <div style={{display: "flex", justifyContent: "space-between", fontSize: 13}}>
                <span className="subtle">Kirchensteuer ({form.kirchensteuerSatz}%)</span>
                <span>{centsToEUR(kist)}</span>
              </div>
            )}

            <div style={{marginTop: 8, paddingTop: 12, borderTop: "1px dashed var(--border, #cbd5e1)", display: "flex", justifyContent: "space-between", fontWeight: 700}}>
              <span>Verbleibender Gewinn (Netto)</span>
              <span style={{color: netProfitAfterTaxes > 0 ? "#065f46" : "#b91c1c"}}>{centsToEUR(netProfitAfterTaxes)}</span>
            </div>
          </div>
        </div>

        {/* Formular Vorauszahlungen & Hebesatz */}
        <form onSubmit={saveTaxes} style={{border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: 16}}>
          <h3 style={{fontSize: 15, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 6}}>
            <Coins size={16} color="#2563eb" /> Parameter & Geleistete Zahlungen
          </h3>

          <div style={{display: "grid", gap: 12}}>
            {/* Persönliche Steuerparameter */}
            <div style={{background: "var(--panel, #f8fafc)", padding: 12, borderRadius: 6, display: "flex", flexDirection: "column", gap: 12}}>
              <div style={{fontWeight: 600, fontSize: 13}}>Steuer-Parameter</div>

              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
                <label className="field">
                  <span className="label">Gewerbesteuer-Hebesatz (%)</span>
                  <input type="number" name="gewerbesteuerHebesatz" className="input" value={form.gewerbesteuerHebesatz} onChange={handleInputChange} min="200" max="900" required />
                </label>
                <label className="field">
                  <span className="label">Steuerklasse (optional)</span>
                  <select name="steuerklasse" className="select" value={form.steuerklasse} onChange={handleInputChange}>
                    <option value="1">1 (Ledig)</option>
                    <option value="2">2 (Alleinerziehend)</option>
                    <option value="3">3 (Verheiratet/Höher)</option>
                    <option value="4">4 (Verheiratet/Gleich)</option>
                    <option value="5">5 (Verheiratet/Niedriger)</option>
                    <option value="6">6 (Zweitjob)</option>
                  </select>
                </label>
              </div>

              <label className="field" style={{display: "flex", alignItems: "center", gap: 8, flexDirection: "row"}}>
                <input type="checkbox" name="zusammenveranlagung" checked={form.zusammenveranlagung} onChange={handleInputChange} />
                <span style={{fontSize: 14, fontWeight: 500}}>Zusammenveranlagung (Splittingtarif)</span>
              </label>

              {form.zusammenveranlagung && (
                <label className="field">
                  <span className="label">Einkommen Partner/in (€ brutto p.a.)</span>
                  <input type="text" inputMode="decimal" name="partnerEinkommen" placeholder="0,00" className="input" value={form.partnerEinkommen} onChange={handleInputChange} />
                </label>
              )}

              <div style={{display: "flex", gap: 16, alignItems: "flex-end"}}>
                <label className="field" style={{display: "flex", alignItems: "center", gap: 8, flexDirection: "row", marginBottom: 8}}>
                  <input type="checkbox" name="kirchensteuer" checked={form.kirchensteuer} onChange={handleInputChange} />
                  <span style={{fontSize: 14, fontWeight: 500}}>Kirchensteuerpflichtig</span>
                </label>
                {form.kirchensteuer && (
                  <label className="field" style={{flex: 1}}>
                    <span className="label">Satz</span>
                    <select name="kirchensteuerSatz" className="select" value={form.kirchensteuerSatz} onChange={handleInputChange}>
                      <option value="8">8% (BY, BW)</option>
                      <option value="9">9% (Andere BL)</option>
                    </select>
                  </label>
                )}
              </div>
            </div>

            <div style={{marginTop: 4, fontWeight: 600, fontSize: 13}}>Geleistete Vorauszahlungen (in {year})</div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
              <label className="field">
                <span className="label">ESt-Vorauszahlung (€)</span>
                <input type="text" inputMode="decimal" name="estVorauszahlung" placeholder="0,00" className="input" value={form.estVorauszahlung} onChange={handleInputChange} />
              </label>

              <label className="field">
                <span className="label">GewSt-Vorauszahlung (€)</span>
                <input type="text" inputMode="decimal" name="gewstVorauszahlung" placeholder="0,00" className="input" value={form.gewstVorauszahlung} onChange={handleInputChange} />
              </label>
            </div>

            {!isKleinunternehmer && (
              <label className="field">
                <span className="label">USt-Vorauszahlung (€)</span>
                <input type="text" inputMode="decimal" name="ustVorauszahlung" placeholder="0,00" className="input" value={form.ustVorauszahlung} onChange={handleInputChange} />
              </label>
            )}

            <div style={{marginTop: 12, paddingBottom: 8, borderBottom: "1px solid var(--border, #f1f5f9)", fontWeight: 600}}>Jahresabschluss</div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
              <label className="field">
                <span className="label">Tatsächliche ESt (€)</span>
                <input type="text" inputMode="decimal" name="tatsaechlicheEst" placeholder="Nach Bescheid" className="input" value={form.tatsaechlicheEst} onChange={handleInputChange} />
              </label>

              <label className="field">
                <span className="label">Tatsächliche GewSt (€)</span>
                <input type="text" inputMode="decimal" name="tatsaechlicheGewst" placeholder="Nach Bescheid" className="input" value={form.tatsaechlicheGewst} onChange={handleInputChange} />
              </label>
            </div>

            <div style={{display: "flex", justifyContent: "flex-end", marginTop: 8}}>
              <button type="submit" className="btn btn-primary" style={{display: "flex", alignItems: "center", gap: 6}}>
                <Save size={16} /> Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
