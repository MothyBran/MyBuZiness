const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://jules:jules@localhost:5432/mybuziness' });

async function main() {
    try {
        await pool.query('SELECT 1');
        console.log("DB OK");
    } catch(e) {
        console.log("DB ERROR", e);
    } finally {
        pool.end();
    }
}
main();
