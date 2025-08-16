import { initDb, q, uuid } from "@/lib/db";

export async function GET(request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const qs = (searchParams.get("q") || "").trim().toLowerCase();

    const rows = (await q(
      `SELECT i.*, c."name" AS "customerName"
       FROM "Invoice" i
       JOIN "Customer" c ON c."id" = i."customerId"
       ${qs ? `WHERE lower(i."invoiceNo") LIKE $1 OR lower(c."name") LIKE $1` : ""}
       ORDER BY i."issueDate" DESC, i."createdAt" DESC`,
      qs ? [`%${qs}%`] : []
    )).rows;

    return Response.json({ ok: true, data: rows });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const { customerId, issueDate, dueDate, currency = "EUR", taxRate = 19 } = body;
    const items = Array.isArray(body.items) ? body.items : [];
    if (!customerId) return new Response(JSON.stringify({ ok:false, error:"customerId fehlt." }), { status:400 });
    if (items.length === 0) return new Response(JSON.stringify({ ok:false, error:"Mindestens eine Position ist erforderlich." }), { status:400 });

    const id = uuid();
    const seq = (await q(`SELECT nextval('\"InvoiceNumberSeq\"') AS n`)).rows[0].n;
    const invoiceNo = String(seq);

    const netCents = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPriceCents || 0), 0);
    const taxCents = Math.round(netCents * (Number(taxRate || 0) / 100));
    const grossCents = netCents + taxCents;

    await q(
      `INSERT INTO "Invoice" ("id","invoiceNo","customerId","issueDate","dueDate","currency","netCents","taxCents","grossCents","taxRate")
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10)`,
      [id, invoiceNo, customerId, issueDate || null, dueDate || null, currency, netCents, taxCents, grossCents, Number(taxRate || 0)]
    );

    for (const it of items) {
      await q(
        `INSERT INTO "InvoiceItem" ("id","invoiceId","productId","name","description","quantity","unitPriceCents","lineTotalCents")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uuid(),
          id,
          it.productId || null,
          it.name,
          it.description || null,
          Number(it.quantity || 0),
          Number(it.unitPriceCents || 0),
          Number(it.quantity || 0) * Number(it.unitPriceCents || 0)
        ]
      );
    }

    return Response.json({ ok: true, data: { id, invoiceNo } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
}
