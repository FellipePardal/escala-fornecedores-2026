// ─── SISTEMA DE TOAST ─────────────────────────────────────────────────────────
// Contexto global para notificações transientes. Uso:
//   const toast = useToast();
//   toast.success("Salvo");
//   toast.error("Erro ao importar");
// Monte <ToastProvider> no topo do App.

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext) || { success:()=>{}, error:()=>{}, info:()=>{} };

export function ToastProvider({ children, T }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, variant = "info") => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, message, variant }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3200);
  }, []);

  const api = {
    success: msg => push(msg, "success"),
    error:   msg => push(msg, "error"),
    info:    msg => push(msg, "info"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position:"fixed", bottom:24, right:24, zIndex:1000,
        display:"flex", flexDirection:"column", gap:8, pointerEvents:"none",
      }}>
        {toasts.map(t => {
          const variants = {
            success: { color:T?.success || "#22c55e", icon:CheckCircle2 },
            error:   { color:T?.danger  || "#ef4444", icon:AlertCircle  },
            info:    { color:T?.info    || "#3b82f6", icon:Info         },
          };
          const v = variants[t.variant] || variants.info;
          const Icon = v.icon;
          return (
            <div key={t.id} style={{
              background: T?.surface || "#0f1623",
              border: `1px solid ${v.color}55`,
              borderLeft: `3px solid ${v.color}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12,
              minWidth: 260, maxWidth: 420,
              boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              color: T?.text || "#f8fafc",
              fontSize: 13,
              pointerEvents:"auto",
              animation: "slideInRight .25s ease",
            }}>
              <Icon size={16} color={v.color} strokeWidth={2.25}/>
              <span style={{flex:1}}>{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </ToastContext.Provider>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ T, icon: Icon, title, message, action }) {
  return (
    <div style={{
      padding: "48px 24px",
      textAlign: "center",
      color: T.textMd,
    }}>
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: T.brandSoft || "rgba(16,185,129,0.1)",
          color: T.brand,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <Icon size={24} strokeWidth={2}/>
        </div>
      )}
      <h3 style={{ color:T.text, fontSize:15, fontWeight:700, margin:"0 0 6px", letterSpacing:"-0.01em" }}>{title}</h3>
      {message && <p style={{ fontSize:13, margin:"0 0 16px", maxWidth:400, marginLeft:"auto", marginRight:"auto", lineHeight:1.5 }}>{message}</p>}
      {action}
    </div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
// Círculo com iniciais coloridas por hash do nome.
const COR_AVATARES = ["#22c55e","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#f97316","#ef4444","#14b8a6","#a855f7"];
function hashNome(nome) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h << 5) - h + nome.charCodeAt(i);
  return Math.abs(h);
}
export function Avatar({ nome, size = 36 }) {
  const iniciais = (nome || "?").split(" ").filter(Boolean).slice(0,2).map(n => n[0]).join("").toUpperCase() || "?";
  const cor = COR_AVATARES[hashNome(nome || "?") % COR_AVATARES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
      color: "#fff", display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight: 700, fontSize: size * 0.38, letterSpacing: "0.02em",
      flexShrink: 0, boxShadow: `0 2px 8px ${cor}55`,
    }}>{iniciais}</div>
  );
}
