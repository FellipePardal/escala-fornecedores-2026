// ─── TEMAS ────────────────────────────────────────────────────────────────────
export const DARK = {
  bg:"#060912", card:"#0f1623", border:"#1e293b", muted:"#334155",
  text:"#f8fafc", textMd:"#cbd5e1", textSm:"#94a3b8",
  surface:"#0f1623", surfaceAlt:"#0a0f1a", surfaceRaised:"#1a2435",
  borderStrong:"#334155",
  brand:"#10b981", brandStrong:"#059669",
  brandSoft:"rgba(16,185,129,0.14)", brandBorder:"rgba(16,185,129,0.32)",
  brandGlow:"radial-gradient(circle at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 60%)",
  accent:"#10b981",
  success:"#22c55e", warning:"#f59e0b", danger:"#ef4444", info:"#3b82f6",
  shadow:"0 4px 6px -2px rgba(0,0,0,0.4), 0 20px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
  shadowSoft:"0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px -2px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
  shadowBrand:"0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px -8px rgba(16,185,129,0.4)",
  gradHeader:"linear-gradient(135deg,#060912 0%,#0f1623 60%,#0a1f17 100%)",
  gradSidebar:"linear-gradient(180deg,#060912 0%,#0a0f1a 100%)",
  gradBrand:"linear-gradient(135deg,#047857 0%,#10b981 100%)",
  gradCard:"linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
};

export const LIGHT = {
  bg:"#eef0f4", card:"#ffffff", border:"#e2e8f0", muted:"#cbd5e1",
  text:"#0b1220", textMd:"#475569", textSm:"#64748b",
  surface:"#ffffff", surfaceAlt:"#f1f5f9", surfaceRaised:"#ffffff",
  borderStrong:"#cbd5e1",
  brand:"#059669", brandStrong:"#047857",
  brandSoft:"rgba(5,150,105,0.10)", brandBorder:"rgba(5,150,105,0.32)",
  brandGlow:"radial-gradient(circle at 50% 0%, rgba(5,150,105,0.08) 0%, transparent 60%)",
  accent:"#059669",
  success:"#16a34a", warning:"#d97706", danger:"#dc2626", info:"#2563eb",
  shadow:"0 4px 6px -2px rgba(15,23,42,0.06), 0 20px 40px -12px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.04)",
  shadowSoft:"0 1px 3px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.03)",
  shadowBrand:"0 0 0 1px rgba(5,150,105,0.25), 0 8px 24px -8px rgba(5,150,105,0.35)",
  gradHeader:"linear-gradient(135deg,#ffffff 0%,#f1f5f9 60%,#ecfdf5 100%)",
  gradSidebar:"linear-gradient(180deg,#060912 0%,#0a0f1a 100%)",
  gradBrand:"linear-gradient(135deg,#047857 0%,#059669 100%)",
  gradCard:"linear-gradient(180deg, rgba(15,23,42,0.015) 0%, transparent 100%)",
};

export const RADIUS = { sm:6, md:10, lg:14, xl:20, pill:999 };
export const SPACE  = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 };
export const FONT   = { ui:"'Inter', system-ui, -apple-system, sans-serif", num:"'JetBrains Mono', ui-monospace, SFMono-Regular, monospace" };

// ─── APP IDENTITY ─────────────────────────────────────────────────────────────
export const APP_NAME     = import.meta.env.VITE_APP_NAME     || "Escala de Fornecedores";
export const APP_SUBTITLE = import.meta.env.VITE_APP_SUBTITLE || "Livemode · Transmissões · 2026";
export const ACCESS_PIN   = import.meta.env.VITE_ACCESS_PIN   || "escala2026";

// ─── CORES ────────────────────────────────────────────────────────────────────
export const PIE_COLORS = ["#22c55e","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#f97316","#ef4444"];

export const MODALIDADE_COLOR = {
  eventual:    "#3b82f6",
  pacote_8d:   "#22c55e",
  pacote_15d:  "#10b981",
  pacote_m:    "#059669",
  estouro:     "#f59e0b",
};

// ─── CHAVES DE PERSISTÊNCIA ───────────────────────────────────────────────────
export const LS_DARK = "escala_darkmode_v1";
export const LS_AUTH = "escala_auth_v1";

// ─── REGRAS DE NEGÓCIO ────────────────────────────────────────────────────────
export const DIAS_UTEIS_MES = 22;
