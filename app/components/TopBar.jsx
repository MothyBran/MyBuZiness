"use client";
export default function TopBar() {
  console.warn("TopBar wird NOCH gerendert – bitte entfernen!");
  return (
    <div style={{background:"#ffefef", color:"#900", padding:"8px", textAlign:"center"}}>
      ⚠️ Alte TopBar-KOMPONENTE ist NOCH AKTIV. Bitte alle Importe/Verwendungen entfernen.
    </div>
  );
}
