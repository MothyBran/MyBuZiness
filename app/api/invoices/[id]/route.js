// app/api/invoices/[id]/route.js
import { initDb, q, uuid } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Hilfsfunktionen */
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
function computeBaseAndUnit(p) {
  const kind = p?.kind || "product";
  if (kind === "service") {
    const hr = toInt(p?.hourlyRateCents || 0);
    const gp = toInt(p?.priceCents || 0);
    if (hr > 0) return { base: gp, unit: hr, kind };
    return { base: 0, unit: gp, kind };
  }
  if (kind === "travel") {
    return {
      base: toInt(p?.travelBaseCents || 0),
      unit: toInt(p?.travelPerKmCents || 0),
      kind
    };
  }
  return { base: 0, unit: toInt(p?.priceCents || 0), kind };
}

export async function GET(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = await params;
    const inv = (await q(
      `SELECT i.*, c."name" AS "customerName",
              c."street" AS "customerStreet",
              c."zip" AS "customerZip",
              c."city" AS "customerCity"
         FROM "Invoice" i
         JOIN "Customer" c ON c."id" = i."customerId"
        WHERE i."id"=$1 AND i."userId"=$2 LIMIT 1`,
      [id, userId]
    )).rows[0];
    if (!inv) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });
    const items = (await q(
      `SELECT * FROM "InvoiceItem"
        WHERE "invoiceId"=$1
        ORDER BY "createdAt" ASC`,
      [id]
    )).rows;
    return Response.json({ ok:true, data: { ...inv, items } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = await params;
    const body = await req.json().catch(()=> ({}));

    // Verify ownership first to be safe
    const existing = (await q(`SELECT * FROM "Invoice" WHERE "id"=$1 AND "userId"=$2`, [id, userId])).rows[0];
    if (!existing) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });

    // Einstellungen für Steuer & Währung
    const settings = (await q(`SELECT * FROM "Settings" WHERE "userId"=$1 ORDER BY "createdAt" ASC LIMIT 1`, [userId])).rows[0] || {};
    const vatExempt = !!settings.kleinunternehmer;
    const taxRateDefault = Number(settings.taxRateDefault ?? 19);
    const taxRate = vatExempt ? 0 : (Number.isFinite(taxRateDefault) ? taxRateDefault : 19);
    const currency = body.currency || settings.currency || "EUR";

    // Felder
    const patch = {};
    if (typeof body.invoiceNo === "string") patch.invoiceNo = body.invoiceNo.trim();
    if (body.issueDate !== undefined) patch.issueDate = body.issueDate || null;
    if (body.dueDate   !== undefined) patch.dueDate   = body.dueDate || null;
    if (body.customerId !== undefined) patch.customerId = body.customerId || null;
    if (typeof body.status === "string") patch.status = body.status.trim(); // optionales Feld

    // Überfällig-Automation (Appointment anlegen, falls dueDate in der Vergangenheit liegt und Status "open" ist)
    const isNowOpen = (patch.status || existing.status) === "open";
    const currentDueDate = patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;

    let isOverdue = false;
    if (isNowOpen && currentDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(currentDueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        isOverdue = true;
      }
    }

    // Beleg generieren, wenn Status explizit auf "done" (oder "abgeschlossen") geändert wird und vorher nicht war
    const isNowDone = patch.status === "done" || patch.status === "abgeschlossen";
    const wasDone = existing.status === "done" || existing.status === "abgeschlossen";
    const shouldGenerateReceipt = isNowDone && !wasDone;

    // Positionen (vollständig neu setzen, wenn übergeben)
    const items = Array.isArray(body.items) ? body.items : null;
    const discountCents = toInt(body.discountCents || 0);

    let resNetCents = existing.netCents;
    let resTaxCents = existing.taxCents;
    let resGrossCents = existing.grossCents;
    let resTaxRate = existing.taxRate;
    let resCurrency = currency;
    let resInvoiceNo = patch.invoiceNo || existing.invoiceNo;
    let resIssueDate = patch.issueDate !== undefined ? patch.issueDate : existing.issueDate;
    let resDiscountCents = discountCents || 0;
    let generatedReceiptItems = [];

    // Wenn Positionen editiert werden, Produkte laden
    let productMap = new Map();
    if (items) {
      const prodIds = items.map(it => it.productId).filter(Boolean).map(String);
      if (prodIds.length) {
        const prows = (await q(
          `SELECT "id"::text AS id,
                  COALESCE("name",'') AS name,
                  COALESCE("kind",'product') AS kind,
                  COALESCE("priceCents",0)::bigint AS "priceCents",
                  COALESCE("hourlyRateCents",0)::bigint AS "hourlyRateCents",
                  COALESCE("travelBaseCents",0)::bigint AS "travelBaseCents",
                  COALESCE("travelPerKmCents",0)::bigint AS "travelPerKmCents",
                  COALESCE("taxRate",19) AS "taxRate"
             FROM "Product"
            WHERE "id"::text = ANY($1::text[]) AND "userId"=$2`,
          [prodIds, userId]
        )).rows;
        productMap = new Map(prows.map(p => [p.id, p]));
      }
    }

    // Summen neu berechnen, wenn Items vorhanden
    if (items) {
      let totalGross = 0;
      let totalTax = 0;
      const prepared = [];

      for (const raw of items) {
        const qty = toInt(raw.quantity || 0);
        let unitGross = toInt(raw.unitPriceCents || 0); // Eingegebene Preise sind brutto
        let baseGross = 0;
        let name = (raw.name || "").trim();
        const pid = raw.productId || null;
        let itemTaxRate = raw.taxRate !== undefined ? Number(raw.taxRate) : taxRate;

        if (pid && productMap.has(String(pid))) {
          const p = productMap.get(String(pid));
          const cu = computeBaseAndUnit(p);
          baseGross = cu.base; unitGross = cu.unit;
          if (p.taxRate !== undefined) {
            itemTaxRate = Number(p.taxRate);
          }
          if (!name) name = p.name || "Position";
        }

        if (vatExempt) {
           itemTaxRate = 0;
        }

        const lineGross = baseGross + qty * unitGross;
        totalGross += lineGross;

        const lineNet = Math.round(lineGross / (1 + (itemTaxRate / 100)));
        const lineTax = lineGross - lineNet;
        totalTax += lineTax;

        prepared.push({
          productId: pid,
          name: name || "Position",
          description: null,
          quantity: qty,
          unitPriceCents: unitGross, // wir speichern den Bruttopreis als Referenz für die UI!
          lineTotalCents: lineGross,
          taxRate: itemTaxRate
        });
      }

      // Rabatt optional
      const discountCents = toInt(body.discountCents || 0);
      const grossAfterDiscount = Math.max(0, totalGross - discountCents);

      // Annäherung: Wir passen die Gesammtsteuer proportional zum Rabatt an
      const taxCents = totalGross > 0 ? Math.round(totalTax * (grossAfterDiscount / totalGross)) : 0;
      const grossCents = grossAfterDiscount;
      const netAfterDiscount = grossCents - taxCents;

      // Invoice updaten (inkl. Summen)
      resNetCents = netAfterDiscount;
      resTaxCents = taxCents;
      resGrossCents = grossCents;
      resTaxRate = taxRate;

      const keys = Object.keys(patch);
      const sets = keys.map((k, i) => `"${k}"=$${i+1}`);
      const vals = keys.map(k => patch[k]);
      const sqlUpdate = `
        UPDATE "Invoice"
           SET ${sets.length? sets.join(",") + "," : ""} 
               "netCents"=$${keys.length+1},
               "taxCents"=$${keys.length+2},
               "grossCents"=$${keys.length+3},
               "taxRate"=$${keys.length+4},
               "currency"=$${keys.length+5},
               "updatedAt"=now()
         WHERE "id"=$${keys.length+6} AND "userId"=$${keys.length+7}
      `;
      const res = await q(sqlUpdate, [...vals, netAfterDiscount, taxCents, grossCents, taxRate, currency, id, userId]);
      if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden oder Fehler beim Update." }), { status:404 });

      // Items ersetzen
      await q(`DELETE FROM "InvoiceItem" WHERE "invoiceId"=$1`, [id]);
      for (const it of prepared) {
        await q(
          `INSERT INTO "InvoiceItem"
             ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents","taxRate","createdAt","updatedAt")
           VALUES
             ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
          [uuid(), id, it.productId, it.name, it.description, it.quantity, it.unitPriceCents, it.lineTotalCents, it.taxRate]
        );
        generatedReceiptItems.push({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          baseCents: it.lineTotalCents - (it.quantity * it.unitPriceCents),
          lineTotalCents: it.lineTotalCents,
          taxRate: it.taxRate
        });
      }
    } else {
      // Patch ohne Positionsänderung
      if (Object.keys(patch).length) {
        const keys = Object.keys(patch);
        const sets = keys.map((k, i) => `"${k}"=$${i+1}`).join(", ");
        const vals = keys.map(k => patch[k]);
        const res = await q(
          `UPDATE "Invoice" SET ${sets}, "updatedAt"=now() WHERE "id"=$${keys.length+1} AND "userId"=$${keys.length+2}`,
          [...vals, id, userId]
        );
        if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status:404 });
      }

      if (shouldGenerateReceipt) {
        // Positionen aus Datenbank laden, da sie nicht mitgesendet wurden
        const existingItems = (await q(`SELECT * FROM "InvoiceItem" WHERE "invoiceId"=$1 ORDER BY "createdAt" ASC`, [id])).rows;
        for (const it of existingItems) {
          const qty = toInt(it.quantity || 0);
          const unit = toInt(it.unitPriceCents || 0);
          const lineTotal = toInt(it.lineTotalCents || 0);
          generatedReceiptItems.push({
            productId: it.productId,
            name: it.name,
            quantity: qty,
            unitPriceCents: unit,
            baseCents: lineTotal - (qty * unit),
            lineTotalCents: lineTotal
          });
        }
        resDiscountCents = 0; // Wir können hier den Rabatt nicht trivial herleiten, wir nehmen 0 an (es sei denn wir speichern ihn in Invoice)
        // Aber moment, Invoice hat keinen discountCents Column - Rabatt ist bereits in netCents/taxCents/grossCents berechnet.
        // Das bedeutet für den generierten Receipt reicht es `discountCents` auf 0 zu lassen, wenn wir Net/Tax/Gross übernehmen.
        // Wir berechnen den Rabatt rückwärts: sum(lineTotal) - netCents.
        const sumLineTotals = generatedReceiptItems.reduce((acc, it) => acc + it.lineTotalCents, 0);
        resDiscountCents = Math.max(0, sumLineTotals - existing.netCents);
      }
    }

    if (isOverdue) {
      // Check if an appointment already exists for this exact due date and invoice
      const apptTitle = `${resInvoiceNo} überfällig`;
      const noteContains = resInvoiceNo;
      const apptRes = await q(
        `SELECT "id" FROM "Appointment"
          WHERE "userId"=$1
            AND "date"=$2
            AND "title"=$3
            AND "customerId"=$4
          LIMIT 1`,
        [userId, currentDueDate, apptTitle, existing.customerId || patch.customerId]
      );

      if (apptRes.rows.length === 0) {
        // Fetch customer name
        const custRes = await q(`SELECT "name" FROM "Customer" WHERE "id"=$1 AND "userId"=$2`, [existing.customerId || patch.customerId, userId]);
        const customerName = custRes.rows[0]?.name || "";

        // Insert new appointment
        const apptNote = `Die Zahlung der Rechnung ${resInvoiceNo} ist überfällig, der Kunde muss benachrichtigt werden!`;
        await q(
          `INSERT INTO "Appointment"
             ("id", "kind", "title", "date", "startAt", "status", "customerId", "customerName", "note", "userId", "createdAt", "updatedAt")
           VALUES
             ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())`,
          [uuid(), "order", apptTitle, currentDueDate, "12:00", "open", existing.customerId || patch.customerId, customerName, apptNote, userId]
        );
      }
    }

    if (shouldGenerateReceipt) {
      // Datum der Rechnung für die Notiz formatieren
      const invDate = resIssueDate ? new Date(resIssueDate) : new Date();
      const dateStr = invDate.toLocaleDateString("de-DE");
      const note = `Rechnung ${resInvoiceNo || id} vom ${dateStr} bezahlt.`;

      // Receipt Nummer generieren
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const prefix = `BN-${yy}${mm}-`;

      const last = await q(`SELECT "receiptNo" FROM "Receipt" WHERE "userId"=$1 AND "receiptNo" LIKE $2 ORDER BY "receiptNo" DESC LIMIT 1`, [userId, `${prefix}%`]);
      let nextNum = 1;
      if (last.rows.length > 0 && last.rows[0].receiptNo) {
        const lastStr = last.rows[0].receiptNo;
        const lastNum = parseInt(lastStr.split("-").pop() || "0", 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const receiptNo = `${prefix}${String(nextNum).padStart(3, "0")}`;
      const receiptId = uuid();

      // In Receipt einfügen
      await q(`
        INSERT INTO "Receipt"
          ("id","receiptNo","date","vatExempt","currency","netCents","taxCents","grossCents","discountCents","createdAt","updatedAt","note","userId")
        VALUES
          ($1,$2,COALESCE($3::date, CURRENT_DATE),$4,$5,$6,$7,$8,$9, now(), now(), $10, $11)`,
        [receiptId, receiptNo, resIssueDate || null, resTaxRate === 0 || vatExempt, resCurrency, resNetCents, resTaxCents, resGrossCents, resDiscountCents, note, userId]
      );

      for (const it of generatedReceiptItems) {
        await q(
          `INSERT INTO "ReceiptItem"
             ("id","receiptId","productId","name","quantity","unitPriceCents","baseCents","lineTotalCents","createdAt","updatedAt")
           VALUES
             ($1,$2,$3,$4,$5,$6,$7,$8, now(), now())`,
          [uuid(), receiptId, it.productId || null, (it.name || "Position").trim(), it.quantity, it.unitPriceCents, it.baseCents, it.lineTotalCents]
        );
      }
    }

    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const { id } = await params;
    // rely on CASCADE for items
    const res = await q(`DELETE FROM "Invoice" WHERE "id"=$1 AND "userId"=$2`, [id, userId]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}
