// app/api/settings/route.js
import { initDb, q } from "@/lib/db";

/** Alle Settings (erste Zeile) laden */
async function getSettingsRow() {
  const row = (await q(`SELECT * FROM "Settings" ORDER BY "createdAt" ASC LIMIT 1`)).rows[0];
  return row || null;
}

export async function GET() {
  try {
    await initDb();
    const row = await getSettingsRow();
    return new Response(JSON.stringify({ ok: true, data: row || {} }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));

    // Werte normalisieren
    const payload = {
      companyName:      (body.companyName || "").trim(),
      proprietor:       (body.proprietor || "").trim(),
      address1:         (body.address1 || "").trim(),
      address2:         (body.address2 || "").trim(),
      postalCode:       (body.postalCode || "").trim(),
      city:             (body.city || "").trim(),
      phone:            (body.phone || "").trim(),
      email:            (body.email || "").trim(),
      website:          (body.website || "").trim(),
      bank:             (body.bank || "").trim(),
      vatId:            (body.vatId || "").trim(),
      kleinunternehmer: !!body.kleinunternehmer,
      currency:         (body.currency || "EUR").trim(),
      logoUrl:          (body.logoUrl || "").trim(),
      primaryColor:     (body.primaryColor || "#0aa").trim(),
      secondaryColor:   (body.secondaryColor || "#0e7490").trim(),
      fontFamily:       (body.fontFamily || "Inter, system-ui, Arial").trim(),
      fontColor:        (body.fontColor || "#111827").trim(),
    };

    const existing = await getSettingsRow();

    if (!existing) {
      // INSERT
      await q(
        `INSERT INTO "Settings" (
          "companyName","proprietor","address1","address2","postalCode","city",
          "phone","email","website","bank","vatId","kleinunternehmer","currency",
          "logoUrl","primaryColor","secondaryColor","fontFamily","fontColor",
          "createdAt","updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,
          $14,$15,$16,$17,$18,
          now(), now()
        )`,
        [
          payload.companyName, payload.proprietor, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bank, payload.vatId, payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.fontColor
        ]
      );
    } else {
      // UPDATE
      await q(
        `UPDATE "Settings" SET
           "companyName"=$1, "proprietor"=$2, "address1"=$3, "address2"=$4, "postalCode"=$5, "city"=$6,
           "phone"=$7, "email"=$8, "website"=$9, "bank"=$10, "vatId"=$11,
           "kleinunternehmer"=$12, "currency"=$13,
           "logoUrl"=$14, "primaryColor"=$15, "secondaryColor"=$16, "fontFamily"=$17, "fontColor"=$18,
           "updatedAt"=now()
         WHERE "createdAt" = $19
         RETURNING *`,
        [
          payload.companyName, payload.proprietor, payload.address1, payload.address2, payload.postalCode, payload.city,
          payload.phone, payload.email, payload.website, payload.bank, payload.vatId,
          payload.kleinunternehmer, payload.currency,
          payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.fontFamily, payload.fontColor,
          existing.createdAt
        ]
      );
    }

    const saved = await getSettingsRow();
    return new Response(JSON.stringify({ ok:true, data: saved }), {
      status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 400 });
  }
}
