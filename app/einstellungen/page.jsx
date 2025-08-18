"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [vatId, setVatId] = useState("");
  const [kleinunternehmer, setKleinunternehmer] = useState(false);
  const [currency, setCurrency] = useState("EUR");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");
  const [secondaryColor, setSecondaryColor] = useState("#0ea5e9");
  const [fontFamily, setFontFamily] = useState("system-ui");
  const [textColor, setTextColor] = useState("#0f172a");

  useEffect(() => {
    (async () => {
      const js = await fetch("/api/settings").then(r=>r.json()).catch(()=>({}));
      const s = js?.data;
      if (s) {
        setCompanyName(s.companyName || "");
        setOwnerName(s.ownerName || "");
        setAddress1(s.address1 || "");
        setAddress2(s.address2 || "");
        setPostalCode(s.postalCode || "");
        setCity(s.city || "");
        setPhone(s.phone || "");
        setEmail(s.email || "");
        setWebsite(s.website || "");
        setBankAccount(s.bankAccount || "");
        setVatId(s.vatId || "");
        setKleinunternehmer(!!s.kleinunternehmer);
        setCurrency(s.currency || "EUR");
        setLogoUrl(s.logoUrl || "");
        setPrimaryColor(s.primaryColor || "#06b6d4");
        setSecondaryColor(s.secondaryColor || "#0ea5e9");
        setFontFamily(s.fontFamily || "system-ui");
        setTextColor(s.textColor || "#0f172a");
      }
    })();
  }, []);

  const handleSave = async () => {
    const payload = {
      companyName, ownerName, address1, address2, postalCode, city,
      phone, email, website, bankAccount, vatId,
      kleinunternehmer, currency, logoUrl,
      primaryColor, secondaryColor, fontFamily, textColor
    };
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    alert("Gespeichert!");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>
      <div className="grid grid-cols-1 gap-4">
        <input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Firmenname" />
        <input value={ownerName} onChange={e=>setOwnerName(e.target.value)} placeholder="Inhaber" />
        <input value={address1} onChange={e=>setAddress1(e.target.value)} placeholder="Adresszeile 1" />
        <input value={address2} onChange={e=>setAddress2(e.target.value)} placeholder="Adresszeile 2 (optional)" />
        <div className="flex gap-2">
          <input value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="PLZ" className="w-1/3" />
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ort" className="w-2/3" />
        </div>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Telefon" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-Mail" />
        <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="Webseite (optional)" />
        <input value={bankAccount} onChange={e=>setBankAccount(e.target.value)} placeholder="Bankverbindung" />
        <input value={vatId} onChange={e=>setVatId(e.target.value)} placeholder="Ust-ID" />

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={kleinunternehmer} onChange={e=>setKleinunternehmer(e.target.checked)} />
          Kleinunternehmerregelung §19 UStG
        </label>

        <select value={currency} onChange={e=>setCurrency(e.target.value)}>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </select>

        <input value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="Logo-URL" />
        <input type="color" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} />
        <input type="color" value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} />
        <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)}>
          <option value="system-ui">System</option>
          <option value="Arial">Arial</option>
          <option value="Roboto">Roboto</option>
          <option value="Georgia">Georgia</option>
        </select>
        <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} />
      </div>

      <button onClick={handleSave} className="mt-6 bg-cyan-600 text-white px-4 py-2 rounded shadow">
        Speichern
      </button>
    </div>
  );
}
