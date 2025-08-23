// app/api/ping/route.js
export async function GET() {
  return new Response(JSON.stringify({ ok: true, pong: true }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
