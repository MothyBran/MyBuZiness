// server-standalone.js
console.log("[boot] starting standalone…");
console.log("[boot] node:", process.version);
console.log("[boot] PORT:", process.env.PORT);
console.log("[boot] HOST:", process.env.HOST);

try {
  require("./.next/standalone/server.js");
} catch (e) {
  console.error("[boot] failed to load .next/standalone/server.js:", e);
  process.exit(1);
}
