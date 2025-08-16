"use client";

export default function Modal({ open, onClose, title, children, maxWidth = 720 }) {
  if (!open) return null;
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...sheet, maxWidth }} onClick={(e)=>e.stopPropagation()}>
        <div style={head}>
          <strong>{title}</strong>
          <button onClick={onClose} style={btnClose} aria-label="Schließen">×</button>
        </div>
        <div style={{ padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.4)",
  display:"grid", placeItems:"center", zIndex:1000
};
const sheet = {
  width:"100%", background:"#fff", borderRadius:"var(--radius)", border:"1px solid #ddd",
  boxShadow:"0 10px 30px rgba(0,0,0,.2)"
};
const head = {
  display:"flex", alignItems:"center", justifyContent:"space-between",
  padding:"12px 16px", borderBottom:"1px solid #eee"
};
const btnClose = {
  border:"1px solid #ddd", background:"#fff", borderRadius:"var(--radius)", cursor:"pointer",
  width:32, height:32, lineHeight:"30px", fontSize:20
};
