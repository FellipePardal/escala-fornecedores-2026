// ─── FORMATAÇÃO ───────────────────────────────────────────────────────────────
export const fmt    = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
export const fmtK   = v => `R$${((v||0)/1000).toFixed(0)}k`;
export const fmtNum = n => Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
export const fmtR   = v => "R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
export const fmtRs  = v => "R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0});
export const fmtPct = v => `${(Number(v||0)).toFixed(1)}%`;
export const parseBR = s => parseFloat((s||"0").toString().replace(/\./g,"").replace(",",".")) || 0;

// ─── PERSISTÊNCIA (localStorage) ──────────────────────────────────────────────
export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
