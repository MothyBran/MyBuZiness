
import { pool } from './lib/db.js';
async function main() {
    const res = await pool.query('SELECT key FROM "License" WHERE "userId" IS NULL LIMIT 1');
    if (res.rows.length > 0) console.log(res.rows[0].key);
    else {
        const key = '123-456-789';
        await pool.query('INSERT INTO "License" (key, kind) VALUES ($1, $2)', [key, 'lifetime']);
        console.log(key);
    }
    process.exit(0);
}
main();
