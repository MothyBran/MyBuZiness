import { initDb } from './lib/db.js';

async function test() {
  try {
    await initDb();
    console.log("DB Init Success");
  } catch(e) {
    console.error(e);
  }
}
test();
