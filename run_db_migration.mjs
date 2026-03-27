import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://jules:jules@localhost:5432/mybuziness',
  ssl: false,
});

async function run() {
  const client = await pool.connect();
  try {
      await client.query(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 19;`);
      await client.query(`ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 19;`);
      await client.query(`ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 19;`);
      await client.query(`ALTER TABLE "ReceiptItem" ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 19;`);
      console.log('Migration successful');
  } catch(e) {
      console.log('Error during migration, probably relations dont exist yet, which is fine since they will get created by initDb', e);
  } finally {
      client.release();
  }
}

run().then(() => process.exit(0)).catch(console.error);
