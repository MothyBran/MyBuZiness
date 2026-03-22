const { Pool } = require('pg');

async function test() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:postgres@localhost:5432/mybuziness"
  });

  const res = await pool.query(`
    INSERT INTO "ReceiptItem"
           ("id","receiptId","productId","name","quantity","unitPriceCents","lineTotalCents","createdAt","updatedAt")
         VALUES
           ('uuid-test-2','uuid-test-1',null,'Position',1,100,100, now(), now())
    RETURNING *;
  `).catch(console.error);

  console.log(res);
  await pool.end();
}
test();
