import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://jules:jules@localhost:5432/jules' });

async function run() {
  await pool.query('ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 19;');
  console.log("DB altered QuoteItem");
  pool.end();
}
run();
