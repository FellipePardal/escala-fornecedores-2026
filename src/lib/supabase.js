import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (!supabaseConfigured) {
  console.warn("[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes — rodando em modo offline (sem persistência). Configure o .env e reinicie o dev server.");
}

// Usa URL placeholder válida quando não configurado, para não quebrar a criação do client.
export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_KEY || "placeholder-key"
);

// ─── APP STATE (persistência genérica por chave) ─────────────────────────────
// Espera uma tabela `app_state` com colunas (key text pk, value jsonb, updated_at timestamptz).
export async function getState(key) {
  if (!supabaseConfigured) return null;
  try {
    const { data } = await supabase.from('app_state').select('value').eq('key', key).single();
    return data?.value ?? null;
  } catch (err) {
    console.warn(`[supabase] getState("${key}") falhou:`, err.message);
    return null;
  }
}

export async function setState(key, value) {
  if (!supabaseConfigured) return;
  try {
    await supabase.from('app_state').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn(`[supabase] setState("${key}") falhou:`, err.message);
  }
}

// ─── ANEXOS GENÉRICOS (arquivos em base64 no app_state) ──────────────────────
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveFile(id, dataUrl) {
  await setState(`file_${id}`, dataUrl);
}

export async function getFile(id) {
  return getState(`file_${id}`);
}

export async function deleteFile(id) {
  if (!supabaseConfigured) return;
  await supabase.from('app_state').delete().eq('key', `file_${id}`);
}
