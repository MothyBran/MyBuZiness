const fs = require('fs');
const file = 'app/api/receipts/[id]/route.js';
let content = fs.readFileSync(file, 'utf8');

// replace sync params.id with await params;
content = content.replace(/const id = params\.id;/g, "const { id } = await params;");

// check the DELETE function
const regexDelete = /export async function DELETE\(_req, \{ params \} \)\s*\{\n\s*try \{\n\s*const userId = await requireUser\(\);\n\s*await initDb\(\);\n\s*const id = params\.id;/
// above regex didn't match perfectly, let's just globally replace because we already did with `const id = params.id;`

fs.writeFileSync(file, content);
