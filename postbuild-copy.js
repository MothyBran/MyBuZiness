// postbuild-copy.js
const fs = require("fs");
const path = require("path");

function safeCopy(src, dest) {
  try {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`copied: ${src} -> ${dest}`);
  } catch (e) {
    console.error(`copy failed: ${src} -> ${dest}`, e.message);
  }
}

try {
  // Statische Next-Assets müssen zur Standalone-Laufzeit verfügbar sein
  safeCopy(".next/static", ".next/standalone/.next/static");
  // Public-Assets ebenfalls
  safeCopy("public", ".next/standalone/public");
} catch (e) {
  console.error("postbuild failed:", e);
  process.exit(0); // nicht hart fehlschlagen
}
