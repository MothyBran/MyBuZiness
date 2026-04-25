"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Page, Icon } from "../components/UI";

/* -------- Utils -------- */
function money(cents, curr = "EUR") {
  const n = Number(cents || 0) / 100;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
}
const toInt = (v) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);

export default function SchnellerfassungPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [cart, setCart] = useState([]); // { product: {}, quantity: 1 }
  const [showCart, setShowCart] = useState(false);
  const [discountInput, setDiscountInput] = useState("0");
  const [animations, setAnimations] = useState({});
  const [showPayment, setShowPayment] = useState(false);
  const [givenCents, setGivenCents] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);

  // Temporary state for the Kassen-Modus modal
  const [tempGivenCents, setTempGivenCents] = useState(0);
  const [tempPaymentMethod, setTempPaymentMethod] = useState("cash");

  // Success Popups
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [createdReceiptId, setCreatedReceiptId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, setRes] = await Promise.all([
          fetch("/api/products").then(r => r.json()),
          fetch("/api/settings").then(r => r.json())
        ]);
        setProducts(prodRes?.data || []);
        setSettings(setRes?.data || setRes || null);
      } catch (e) {
        console.error("Fehler beim Laden:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currency = settings?.currency || "EUR";
  const vatExempt = typeof settings?.kleinunternehmer === "boolean" ? settings.kleinunternehmer : true;

  const handleProductClick = (product) => {
    let step = 1;
    if (product.kind === "service" && toInt(product.hourlyRateCents) > 0 && product.quarterHourBilling) {
      step = 0.25;
    }

    // Add to cart
    setCart((prev) => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + step } : item);
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });

    // Trigger animation
    const id = Date.now();
    setAnimations(prev => ({ ...prev, [product.id]: id }));
    setTimeout(() => {
      setAnimations(prev => {
        const next = { ...prev };
        if (next[product.id] === id) delete next[product.id];
        return next;
      });
    }, 500); // Animation duration
  };

  const totals = useMemo(() => {
    const disc = Math.max(0, Math.round(parseFloat(String(discountInput || "0").replace(",", ".")) * 100) || 0);
    const netRaw = cart.reduce((s, item) => {
      let unitPrice = 0;
      let basePrice = 0;
      if (item.product.kind === "service") {
        const hr = toInt(item.product.hourlyRateCents || 0);
        const gp = toInt(item.product.priceCents || 0);
        if (hr > 0) {
          unitPrice = hr;
          basePrice = gp;
        } else {
          unitPrice = gp;
        }
      } else if (item.product.kind === "travel") {
        unitPrice = toInt(item.product.travelPerKmCents || 0);
        basePrice = toInt(item.product.travelBaseCents || 0);
      } else {
        unitPrice = toInt(item.product.priceCents || 0);
      }
      return s + Math.round(Number(item.quantity || 0) * unitPrice) + basePrice;
    }, 0);
    const netAfter = Math.max(0, netRaw - disc);
    const tax = vatExempt ? 0 : Math.round(netAfter * 0.19);
    const gross = netAfter + tax;
    return { netRaw, disc, netAfter, tax, gross };
  }, [cart, discountInput, vatExempt]);

  const updateCartQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        let step = 1;
        if (item.product.kind === "service" && toInt(item.product.hourlyRateCents) > 0 && item.product.quarterHourBilling) {
          step = 0.25;
        }

        let newQ = item.quantity + (delta > 0 ? step : -step);

        // mind. 1 Stunde berechnen für Viertelstunden-Takt
        if (item.product.kind === "service" && toInt(item.product.hourlyRateCents) > 0 && item.product.quarterHourBilling) {
          if (newQ < 1 && delta < 0) {
            // Wenn wir bei 1.0 sind und minus klicken, komplett entfernen
            if (item.quantity === 1) return null;
            newQ = 1; // Sicherstellen, dass es nicht unter 1 fällt, falls manuell was dazwischen war
          }
        } else {
           if (newQ <= 0) return null;
        }

        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(Boolean));
  };

  const removeCartItem = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSave = async () => {
    if (cart.length === 0) return;

    // We don't specify receiptNo here; the backend will generate it if not provided.
    const items = cart.map(item => {
      let unitPrice = 0;
      let basePrice = 0;
      if (item.product.kind === "service") {
        const hr = toInt(item.product.hourlyRateCents || 0);
        const gp = toInt(item.product.priceCents || 0);
        if (hr > 0) {
          unitPrice = hr;
          basePrice = gp;
        } else {
          unitPrice = gp;
        }
      } else if (item.product.kind === "travel") {
        unitPrice = toInt(item.product.travelPerKmCents || 0);
        basePrice = toInt(item.product.travelBaseCents || 0);
      } else {
        unitPrice = toInt(item.product.priceCents || 0);
      }
      return {
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPriceCents: unitPrice,
        baseCents: basePrice
      };
    });

    const d = new Date();
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);

    let change = null;
    if (givenCents !== null) {
      change = givenCents - totals.gross;
    }

    const payload = {
      date: localDate, // Today
      currency,
      vatExempt: !!vatExempt,
      discountCents: totals.disc,
      note: settings?.receiptNoteDefault ?? "Vielen Dank, ich freue mich auf deinen nächsten Besuch!",
      items,
      givenCents,
      changeCents: change,
      paymentMethod
    };

    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const js = await res.json();
      if (!res.ok || !js.ok) {
        alert("Speichern fehlgeschlagen: " + (js.error || "Unbekannter Fehler"));
        return;
      }

      const wasKassenModus = paymentMethod !== null || givenCents !== null;
      setShowCart(false);
      setShowPayment(false);

      if (wasKassenModus && js.data?.id) {
        setCreatedReceiptId(js.data.id);
        setShowPrintModal(true);
      } else {
        setShowSuccessBanner(true);
        setTimeout(() => {
          setShowSuccessBanner(false);
          router.push("/");
        }, 2000);
      }
    } catch (e) {
      alert("Speichern fehlgeschlagen.");
    }
  };

  const handlePrintYes = () => {
    if (createdReceiptId) {
      window.open(`/belege/${createdReceiptId}/druck?autoPrint=true`, '_blank');
    }
    setShowPrintModal(false);
    router.push("/");
  };

  const handlePrintNo = () => {
    setShowPrintModal(false);
    router.push("/");
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Page>
      {/* Banner */}
      {showSuccessBanner && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "var(--success, #10b981)",
          color: "white",
          padding: "16px",
          textAlign: "center",
          fontWeight: "bold",
          zIndex: 9999,
          animation: "slideDown 0.3s ease-out"
        }}>
          Beleg erfolgreich erstellt!
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="cart-overlay" style={{ zIndex: 110 }}>
          <div className="cart-panel" style={{ width: "auto", maxWidth: "400px", padding: "24px", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ marginTop: 0 }}>Beleg drucken?</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "24px" }}>
              <button className="btn btn--subtle" onClick={handlePrintNo}>Nein</button>
              <button className="btn btn--primary" onClick={handlePrintYes}>Ja</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Schnellerfassung</h1>
          <div className="subtle">Produkte und Dienstleistungen schnell hinzufügen</div>
        </div>
        <button className="btn btn--subtle" onClick={() => router.push("/")} style={{ borderRadius: "50%", width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" />
        </button>
      </div>

      {loading ? (
        <div className="muted">Produkte laden...</div>
      ) : products.length === 0 ? (
        <div className="muted">Keine Produkte vorhanden.</div>
      ) : (
        <div className="product-grid">
          {products.map(p => {
            let displayPrice = 0;
            let showAb = false;

            if (p.kind === "service") {
              const hr = toInt(p.hourlyRateCents || 0);
              const gp = toInt(p.priceCents || 0);
              displayPrice = hr + gp;
              if (hr > 0) showAb = true;
            } else if (p.kind === "travel") {
              const perKm = toInt(p.travelPerKmCents || 0);
              const tBase = toInt(p.travelBaseCents || 0);
              displayPrice = perKm + tBase;
              if (perKm > 0) showAb = true;
            } else {
              displayPrice = p.priceCents || 0;
            }

            const isAnimating = !!animations[p.id];
            const cartItem = cart.find(item => item.product.id === p.id);
            const qty = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={p.id}
                className="product-card"
                onClick={() => handleProductClick(p)}
              >
                <div className="product-name">{p.name}</div>
                <div className="product-price">
                  {showAb && "ab "}{money(displayPrice, currency)}
                </div>

                {qty > 0 && (
                  <div className="product-badge">{Number(qty).toLocaleString("de-DE")}</div>
                )}

                {isAnimating && (
                  <div className="product-anim">+1</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating View Cart Button */}
      {cart.length > 0 && !showCart && (
        <button className="floating-cart-btn" onClick={() => setShowCart(true)}>
          Auswahl ansehen ({totalItems} Artikel) - {money(totals.gross, currency)}
        </button>
      )}

      {/* Cart Modal / Overlay */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2 style={{ margin: 0 }}>Auswahl</h2>
              <button className="btn btn--ghost btn--icon" onClick={() => setShowCart(false)}>
                <Icon name="x" />
              </button>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="muted">Keine Artikel ausgewählt.</div>
              ) : (
                <div className="cart-items">
                  {cart.map(item => {
                    let unitPrice = 0;
                    let basePrice = 0;
                    let unitLabel = "Einheit";

                    if (item.product.kind === "service") {
                      const hr = toInt(item.product.hourlyRateCents || 0);
                      const gp = toInt(item.product.priceCents || 0);
                      if (hr > 0) {
                        unitPrice = hr;
                        basePrice = gp;
                        unitLabel = "Std.";
                      } else {
                        unitPrice = gp;
                      }
                    } else if (item.product.kind === "travel") {
                      unitPrice = toInt(item.product.travelPerKmCents || 0);
                      basePrice = toInt(item.product.travelBaseCents || 0);
                      unitLabel = "km";
                    } else {
                      unitPrice = toInt(item.product.priceCents || 0);
                    }
                    const lineTotal = Math.round(Number(item.quantity || 0) * unitPrice) + basePrice;

                    return (
                      <div key={item.product.id} className="cart-item">
                        <div className="cart-item-info">
                          <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                          {unitLabel === "Std." && (
                            <div className="muted" style={{ fontSize: "0.85rem", color: "var(--brand)", marginTop: 2, marginBottom: 2 }}>
                              Dauer: {Number(item.quantity).toLocaleString("de-DE")} Std.
                            </div>
                          )}
                          <div className="muted" style={{ fontSize: "0.85rem" }}>
                            {money(unitPrice, currency)} / {unitLabel}
                            {basePrice > 0 && ` (+ ${money(basePrice, currency)} Grundpr.)`}
                          </div>
                        </div>

                        <div className="cart-item-controls">
                          <button className="btn btn--subtle btn--icon" onClick={() => updateCartQuantity(item.product.id, -1)}>-</button>
                          <div className="cart-item-qty">{Number(item.quantity).toLocaleString("de-DE")}</div>
                          <button className="btn btn--subtle btn--icon" onClick={() => updateCartQuantity(item.product.id, 1)}>+</button>
                          <button className="btn btn--danger btn--icon" onClick={() => removeCartItem(item.product.id)} style={{ marginLeft: 8 }}><Icon name="x" /></button>
                        </div>
                        <div className="cart-item-total">
                          {money(lineTotal, currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {cart.length > 0 && (
                <div className="cart-totals">
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                      <span className="muted">Rabatt (€):</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input"
                        style={{ width: 100, textAlign: "right" }}
                        value={discountInput}
                        onChange={e => setDiscountInput(e.target.value)}
                      />
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="muted">Zwischensumme:</span>
                      <span>{money(totals.netRaw, currency)}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="muted">Netto:</span>
                      <span>{money(totals.netAfter, currency)}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <span className="muted">USt {vatExempt ? "(befreit)" : "19%"}:</span>
                      <span>{money(totals.tax, currency)}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <span>Gesamt:</span>
                      <span>{money(totals.gross, currency)}</span>
                   </div>
                   {givenCents !== null && (
                     <>
                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                          <span className="muted">Gegeben ({paymentMethod === "card" ? "Karte" : "Bar"}):</span>
                          <span>{money(givenCents, currency)}</span>
                       </div>
                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span className="muted">Wechselgeld:</span>
                          <span>{money(givenCents - totals.gross, currency)}</span>
                       </div>
                     </>
                   )}
                </div>
              )}
            </div>

            <div className="cart-footer" style={{ justifyContent: "space-between" }}>
               <button className="btn btn--subtle" onClick={() => setShowCart(false)}>Zurück</button>
               <div style={{ display: "flex", gap: "12px" }}>
                 <button className="btn btn--ghost" onClick={() => setShowPayment(true)}>Kassen-Modus</button>
                 <button className="btn btn--primary" onClick={handleSave} disabled={cart.length === 0}>Abschließen</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="cart-overlay" onClick={() => setShowPayment(false)} style={{ zIndex: 110 }}>
          <div className="cart-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2 style={{ margin: 0 }}>Zahlungseingang (Kassen-Modus)</h2>
              <button className="btn btn--ghost btn--icon" onClick={() => setShowPayment(false)}>
                <Icon name="x" />
              </button>
            </div>

            <div className="cart-body" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "12px" }}>
                Zu zahlen: {money(totals.gross, currency)}
              </div>

              <div style={{ fontSize: "1.2rem", marginBottom: "8px", color: "var(--brand)" }}>
                Gegeben: {money(tempGivenCents, currency)} {tempPaymentMethod === "card" && "(Karte)"}
              </div>

              {tempGivenCents > 0 && (
                <div style={{ fontSize: "1.2rem", marginBottom: "20px", fontWeight: "bold", color: tempGivenCents >= totals.gross ? "var(--success, #10b981)" : "var(--danger, #ef4444)" }}>
                  {tempGivenCents >= totals.gross
                    ? `Rückgeld: ${money(tempGivenCents - totals.gross, currency)}`
                    : `Noch offen: ${money(totals.gross - tempGivenCents, currency)}`
                  }
                </div>
              )}

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                maxWidth: "400px",
                margin: "0 auto"
              }}>
                {[
                  { label: "1 €", val: 100 },
                  { label: "2 €", val: 200 },
                  { label: "5 €", val: 500 },
                  { label: "10 €", val: 1000 },
                  { label: "20 €", val: 2000 },
                  { label: "50 €", val: 5000 },
                  { label: "100 €", val: 10000 },
                  { label: "Passend", val: totals.gross, method: "cash", exact: true },
                  { label: "Karte", val: totals.gross, method: "card", exact: true }
                ].map((btn, i) => (
                  <button
                    key={i}
                    className="btn btn--subtle"
                    style={{
                      height: "60px",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--border)",
                      background: "var(--panel)"
                    }}
                    onClick={() => {
                      let newGivenCents;
                      let newMethod = btn.method || "cash";

                      if (btn.exact) {
                        newGivenCents = btn.val;
                      } else {
                        newGivenCents = tempGivenCents + btn.val;
                      }

                      setTempGivenCents(newGivenCents);
                      setTempPaymentMethod(newMethod);

                      // Wenn der gezahlte Betrag reicht, übernehmen und Modal schließen
                      if (newGivenCents >= totals.gross) {
                        setGivenCents(newGivenCents);
                        setPaymentMethod(newMethod);
                        // Optional: kleine Verzögerung, damit man sieht, dass das Rückgeld aktualisiert wurde
                        setTimeout(() => setShowPayment(false), 300);
                      }
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "32px" }}>
                 <button className="btn btn--ghost" onClick={() => {
                   setTempGivenCents(0);
                   setTempPaymentMethod("cash");
                   setGivenCents(null);
                   setPaymentMethod(null);
                 }}>
                   Zurücksetzen
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
          padding-bottom: 80px; /* Space for floating button */
        }

        .product-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          cursor: pointer;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 120px;
          transition: transform 0.1s, box-shadow 0.1s;
          user-select: none;
        }

        .product-card:active {
          transform: scale(0.97);
        }

        .product-name {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-price {
          color: var(--muted);
          font-size: 0.85rem;
        }

        .product-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--brand);
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .product-anim {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--brand);
          font-weight: bold;
          font-size: 1.5rem;
          pointer-events: none;
          animation: floatUp 0.5s ease-out forwards;
          text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        }

        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }

        .floating-cart-btn {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--brand);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 9999px;
          font-size: 1rem;
          font-weight: 600;
          box-shadow: var(--shadow-2);
          cursor: pointer;
          z-index: 40;
          transition: background 0.2s;
        }

        .floating-cart-btn:hover {
          background: var(--brand-600);
        }

        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          display: flex;
          align-items: flex-end; /* Mobile friendly, slide from bottom */
          justify-content: center;
        }

        @media (min-width: 640px) {
          .cart-overlay {
            align-items: center;
          }
        }

        .cart-panel {
          background: var(--bg);
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          border-radius: 20px 20px 0 0;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-2);
          animation: slideUp 0.3s ease-out;
        }

        @media (min-width: 640px) {
          .cart-panel {
            border-radius: var(--radius-lg);
          }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }

        .cart-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .cart-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .cart-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          gap: 12px;
        }

        .cart-item-info {
          flex: 1;
        }

        .cart-item-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cart-item-qty {
          min-width: 24px;
          text-align: center;
          font-weight: 600;
        }

        .cart-item-total {
          font-weight: 600;
          min-width: 80px;
          text-align: right;
        }

        .cart-totals {
          background: var(--panel);
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }

        .cart-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: var(--panel-2);
          border-radius: 0 0 0 0;
        }

        @media (min-width: 640px) {
          .cart-footer {
            border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          }
        }
      `}</style>
    </Page>
  );
}
