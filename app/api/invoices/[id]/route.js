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
    const id = params.id;
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
    const id = params.id;
    const body = await req.json().catch(()=> ({}));

    // Verify ownership first to be safe
    const existing = (await q(`SELECT id FROM "Invoice" WHERE "id"=$1 AND "userId"=$2`, [id, userId])).rows[0];
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

    // Positionen (vollständig neu setzen, wenn übergeben)
    const items = Array.isArray(body.items) ? body.items : null;
    const discountCents = toInt(body.discountCents || 0);

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
                  COALESCE("travelPerKmCents",0)::bigint AS "travelPerKmCents"
             FROM "Product"
            WHERE "id"::text = ANY($1::text[]) AND "userId"=$2`,
          [prodIds, userId]
        )).rows;
        productMap = new Map(prows.map(p => [p.id, p]));
      }
    }

    // Summen neu berechnen, wenn Items vorhanden
    if (items) {
      let net = 0;
      const prepared = [];

      for (const raw of items) {
        const qty = toInt(raw.quantity || 0);
        let unit = toInt(raw.unitPriceCents || 0);
        let base = 0;
        let name = (raw.name || "").trim();
        const pid = raw.productId || null;

        if (pid && productMap.has(String(pid))) {
          const p = productMap.get(String(pid));
          const cu = computeBaseAndUnit(p);
          base = cu.base; unit = cu.unit;
          if (!name) name = p.name || "Position";
        }

        const line = base + qty * unit;
        net += line;

        prepared.push({
          productId: pid,
          name: name || "Position",
          description: null,
          quantity: qty,
          unitPriceCents: unit,
          lineTotalCents: line,
        });
      }

      const netAfterDiscount = Math.max(0, net - discountCents);
      const taxCents = Math.round(netAfterDiscount * (taxRate / 100));
      const grossCents = netAfterDiscount + taxCents;

      // Invoice updaten (inkl. Summen)
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
             ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
           VALUES
             ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
          [uuid(), id, it.productId, it.name, it.description, it.quantity, it.unitPriceCents, it.lineTotalCents]
        );
      }

      return Response.json({ ok:true });
    }

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

    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const userId = await requireUser();
    await initDb();
    const id = params.id;
    // rely on CASCADE for items
    const res = await q(`DELETE FROM "Invoice" WHERE "id"=$1 AND "userId"=$2`, [id, userId]);
    if (res.rowCount === 0) return new Response(JSON.stringify({ ok:false, error:"Nicht gefunden." }), { status: 404 });
    return Response.json({ ok:true });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}
