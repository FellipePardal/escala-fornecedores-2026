# Escala de Fornecedores 2026

Sistema de controle de escala e alocação de prestadores para transmissões esportivas, com análise automática de vantagem contratual (eventual vs pacote 8D / 15D / mensal).

Substitui a planilha Excel de "Escala Freelas Eventuais" e "Pacotes Mensais" por um dashboard com sync em tempo real.

## Módulos

1. **Grade Semanal** — matriz função × prestador × dias da semana, com alocação por clique
2. **Fornecedores** — cadastro central com WhatsApp, função e histórico de diárias
3. **Análise de Vantagem** — recomendação de modalidade (eventual, pacote 8D, 15D ou mensal) por fornecedor × mês, com economia potencial
4. **Importar Planilha** — parser do CSV original da planilha Excel (preserva os dados atuais)

## Regra de recomendação

Para cada fornecedor × função × mês com `n` diárias:

```
custo_eventual   = n × diária cheia
custo_pacote_8d  = pacote_8d  + max(0, n-8)  × diária com desconto
custo_pacote_15d = pacote_15d + max(0, n-15) × diária com desconto
custo_pacote_m   = pacote_m   + max(0, n-22) × diária com desconto
```

Recomenda a modalidade de menor custo e exibe a economia vs eventual.

## Stack

- **React 18** + **Vite 5**
- **Supabase** — persistência realtime em tabela `app_state`
- **Recharts** — gráficos comparativos
- **Lucide React** — ícones

## Setup

```bash
npm install
cp .env.example .env     # preencha com suas credenciais Supabase
npm run dev
```

### .env

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_ACCESS_PIN=escala2026
VITE_APP_NAME=Escala de Fornecedores
VITE_APP_SUBTITLE=Livemode · Transmissões · 2026
```

### Supabase

Rode a migration em `supabase/migrations/00000000000000_app_state.sql` no SQL Editor do Supabase. Ative **Realtime** na tabela `app_state` (Database → Replication).

## Dados iniciais

O app vem com seed pronto em `src/data/seed.js`:
- **22 funções** (DTV, Cinegrafista, Op GC, Op Slow/VT, Op Vídeo, Op Áudio, Iluminador, Assistente de Câmera, Op TP, etc.) com tabela de preços (diária + pacotes 8D/15D/mensal)
- **~35 fornecedores** extraídos da planilha com WhatsApp e função primária
- **23 projetos** (Bundesliga, Ligue 1, Europa League, Kings, ATP, WTT, etc.)

Quando o Supabase está vazio, o seed é gravado automaticamente na primeira carga.

## Import da planilha Excel

1. Salve a aba de Escala como **CSV (separador vírgula)** no Excel
2. Abra o módulo "Importar Planilha"
3. Cole o CSV (ou carregue o arquivo)
4. Clique em **Analisar CSV** → revise o preview
5. Clique em **Aplicar importação** → dados entram no Supabase

O parser reconhece:
- Blocos "ESCALA FREELAS EVENTUAIS" (multi-semana) → vira `alocacoes` eventuais
- Blocos "FREELAS PACOTES - MÊS" → vira `pacotes` mensais
- Dedupe de fornecedores por nome (slug)

## Estrutura

```
src/
├── App.jsx                  # LoginGate + roteamento
├── constants.js             # Temas, tokens, regras
├── utils.js                 # fmt, lsGet/lsSet
├── data/
│   └── seed.js              # Funções, fornecedores, projetos iniciais
├── lib/
│   ├── supabase.js          # Cliente + app_state
│   ├── escala.js            # Helpers puros: recomendação, conflitos, datas
│   └── csvImport.js         # Parser da planilha
└── components/
    ├── Home.jsx             # Grid de módulos
    ├── Escala.jsx           # Grade Semanal (matriz editável)
    ├── Fornecedores.jsx     # CRUD de prestadores
    ├── Analise.jsx          # Recomendação de modalidade
    ├── ImportCSV.jsx        # Import da planilha
    └── ui/                  # Design system (Card, Stat, Button, etc.)
supabase/
└── migrations/
    └── 00000000000000_app_state.sql
```

## Roadmap

**Fase 1 — MVP (atual):**
- [x] Schema + seeds
- [x] Grade Semanal editável com realtime
- [x] Cadastro de fornecedores
- [x] Análise de vantagem
- [x] Import CSV

**Fase 2 — Pacotes e Estouros:**
- [ ] Tela de pacotes mensais com vínculo a alocações
- [ ] Detecção automática de estouros (dias além do pacote)
- [ ] Alerta de pacotes recorrentes (3+ meses seguidos → sugerir mensal)

**Fase 3 — Relatórios e Simulador:**
- [ ] Simulador "e se eu alocar X vezes mais?"
- [ ] Export PPTX para apresentações de gestão
- [ ] Catálogo de projetos com lista de alocações

## Origem

Base técnica derivada de [hub-template-2026](https://github.com/FellipePardal/hub-template-2026) → [HUBFinanceiro-2026](https://github.com/FellipePardal/HUBFinanceiro-2026).
