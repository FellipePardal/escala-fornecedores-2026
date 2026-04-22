// ─── SHELL RESPONSIVO ─────────────────────────────────────────────────────────
// Wrapper que oferece sidebar (desktop) ou top bar compacta (mobile) para
// os módulos internos. Passa `padX` para o conteúdo já com paddings adequados.

import { useIsMobile } from "../lib/useMedia";
import { IconButton } from "./ui";
import { ArrowLeft, Sun, Moon } from "lucide-react";

export function Shell({ T, darkMode, setDarkMode, onBack, children }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{minHeight:"100vh", background:T.bg, color:T.text, display:"flex", flexDirection:"column"}}>
        <div style={{
          position:"sticky", top:0, zIndex:20,
          background: T.gradSidebar,
          borderBottom:`1px solid rgba(255,255,255,0.06)`,
          padding:"8px 12px",
          display:"flex", alignItems:"center", gap:8,
        }}>
          <button onClick={onBack} title="Voltar" style={{
            width:40, height:40, borderRadius:10, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#059669,#10b981)",
            color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 12px rgba(16,185,129,0.35)",
          }}>
            <ArrowLeft size={18} strokeWidth={2.25}/>
          </button>
          <div style={{flex:1}}/>
          <IconButton icon={darkMode ? Sun : Moon} onClick={()=>setDarkMode(d=>!d)} size={40} T={T}/>
        </div>
        <div style={{flex:1, minWidth:0, paddingBottom:32}}>
          {children({ padX:14, isMobile:true })}
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh", background:T.bg, color:T.text, display:"flex"}}>
      <aside style={{
        width:72, minHeight:"100vh",
        background: T.gradSidebar,
        borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column", alignItems:"center",
        paddingTop:16, paddingBottom:16, gap:6, flexShrink:0,
        position:"sticky", top:0, height:"100vh",
      }}>
        <button onClick={onBack} title="Voltar" style={{
          width:44, height:44, borderRadius:12, border:"none", cursor:"pointer",
          background:"linear-gradient(135deg,#059669,#10b981)",
          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
          marginBottom:14, boxShadow:"0 6px 16px rgba(16,185,129,0.35)",
        }}>
          <ArrowLeft size={18} strokeWidth={2.25}/>
        </button>
        <div style={{flex:1}}/>
        <IconButton icon={darkMode ? Sun : Moon} onClick={()=>setDarkMode(d=>!d)} size={40} T={T}/>
      </aside>
      <div style={{flex:1, minWidth:0, paddingBottom:40}}>
        {children({ padX:32, isMobile:false })}
      </div>
    </div>
  );
}
