const { Pool } = require('pg');

async function test() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:postgres@localhost:5432/mybuziness"
  });

  const res = await pool.query(`
    INSERT INTO "Receipt" ("id", "receiptNo", "date", "vatExempt", "currency", "netCents", "taxCents", "grossCents", "discountCents", "createdAt", "updatedAt", "note", "userId")
    VALUES ('uuid-test-1', 'test', '2023-01-01', false, 'EUR', 100, 19, 119, 0, now(), now(), '', 'test-user')
    RETURNING *;
  `).catch(console.error);

  console.log(res);
  await pool.end();
}
test();
