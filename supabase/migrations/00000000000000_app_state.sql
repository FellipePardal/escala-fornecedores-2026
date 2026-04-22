-- ─── Tabela genérica de estado do app ────────────────────────────────────────
-- Cada chave guarda o estado de uma entidade (funcoes, fornecedores, etc).
-- Ativar Realtime no dashboard Supabase (Database → Replication) nesta tabela.

create table if not exists public.app_state (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Política aberta — app autenticado por PIN no cliente.
-- Restrinja conforme necessário (ex: limitar por JWT quando migrar para Supabase Auth).
create policy "app_state_all" on public.app_state
  for all using (true) with check (true);

-- Seeds conhecidas (referência):
--   escala_funcoes      → catálogo de cargos com tabela de preços
--   escala_fornecedores → prestadores (id, nome, whatsapp, funcao_id, tipo)
--   escala_projetos     → catálogo de transmissões
--   escala_alocacoes    → diárias eventuais (fornecedor × data × projeto)
--   escala_pacotes      → contratos mensais PJ
