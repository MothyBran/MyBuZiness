export async function LIST_API(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const js = await res.json().catch(()=>({}));
  if (!js?.ok) throw new Error(js?.error || "Unbekannter Fehler");
  return js.data || [];
}
