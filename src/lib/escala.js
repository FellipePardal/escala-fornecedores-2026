// ─── HELPERS DE ESCALA ────────────────────────────────────────────────────────
// Utilitários puros (sem I/O) para análise de alocações, recomendações de
// modalidade contratual e detecção de conflitos.

import { DIAS_UTEIS_MES } from "../constants";

// ─── DATA ─────────────────────────────────────────────────────────────────────
// Aceita "DD/MM" ou "DD/MM/YYYY" ou "YYYY-MM-DD" e retorna ISO "YYYY-MM-DD".
export function parseData(s, anoPadrao = 2026) {
  if (!s) return null;
  s = String(s).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return s;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  }
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})$/))) {
    return `${anoPadrao}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  }
  return null;
}

export const mesDeISO = iso => iso ? iso.slice(0,7) : null;   // "YYYY-MM"
export const diaDeISO = iso => iso ? Number(iso.slice(8,10)) : null;

// ─── BREAKEVENS DE PACOTE ─────────────────────────────────────────────────────
// Quantas diárias eventuais = custo do pacote?
export function breakevens(funcao) {
  if (!funcao || !funcao.diaria) return { be_8d:Infinity, be_15d:Infinity, be_m:Infinity };
  return {
    be_8d:  funcao.pacote_8d  ? Math.ceil(funcao.pacote_8d  / funcao.diaria) : Infinity,
    be_15d: funcao.pacote_15d ? Math.ceil(funcao.pacote_15d / funcao.diaria) : Infinity,
    be_m:   funcao.pacote_m   ? Math.ceil(funcao.pacote_m   / funcao.diaria) : Infinity,
  };
}

// ─── CUSTOS POR MODALIDADE ────────────────────────────────────────────────────
// Dado um nº de diárias `n` no mês, calcula o custo em cada cenário.
// Estouro (dias além do pacote) é cobrado pela diária de pacote (desconto).
export function custosPorModalidade(funcao, n) {
  if (!funcao) return null;
  const dp = funcao.diaria_pacote || funcao.diaria;
  const over = (limite) => Math.max(0, n - limite);
  return {
    eventual:   n * (funcao.diaria || 0),
    pacote_8d:  (funcao.pacote_8d  || 0) + over(8)  * dp,
    pacote_15d: (funcao.pacote_15d || 0) + over(15) * dp,
    pacote_m:   (funcao.pacote_m   || 0) + over(DIAS_UTEIS_MES) * dp,
  };
}

// ─── RECOMENDAÇÃO ─────────────────────────────────────────────────────────────
// Retorna a modalidade de menor custo + economia vs eventual.
export function recomendar(funcao, n) {
  const c = custosPorModalidade(funcao, n);
  if (!c) return null;
  const entries = Object.entries(c).filter(([_, v]) => v > 0);
  if (entries.length === 0) return { modalidade:"eventual", custo:0, economia:0, custoEventual:0 };
  entries.sort((a,b) => a[1] - b[1]);
  const [best, custo] = entries[0];
  return {
    modalidade: best,
    custo,
    custoEventual: c.eventual,
    economia: Math.max(0, c.eventual - custo),
  };
}

export const MODALIDADE_LABEL = {
  eventual:   "Eventual",
  pacote_8d:  "Pacote 8D",
  pacote_15d: "Pacote 15D",
  pacote_m:   "Pacote Mensal",
  estouro:    "Estouro",
};

// ─── AGREGAÇÃO DE ALOCAÇÕES ───────────────────────────────────────────────────
// Conta diárias por fornecedor × mês × função.
export function agregarPorFornecedorMes(alocacoes) {
  const map = {};
  (alocacoes || []).forEach(a => {
    if (!a.fornecedor_id || !a.data) return;
    const mes = mesDeISO(a.data);
    const key = `${a.fornecedor_id}|${mes}|${a.funcao_id||""}`;
    if (!map[key]) map[key] = { fornecedor_id:a.fornecedor_id, mes, funcao_id:a.funcao_id, diarias:0, valor:0, projetos:new Set() };
    map[key].diarias += 1;
    map[key].valor += Number(a.valor || 0);
    if (a.projeto_id) map[key].projetos.add(a.projeto_id);
  });
  return Object.values(map).map(r => ({ ...r, projetos:Array.from(r.projetos) }));
}

// ─── CONFLITOS DE ESCALA ──────────────────────────────────────────────────────
// Mesmo fornecedor em duas alocações na mesma data → conflito.
export function detectarConflitos(alocacoes) {
  const byKey = {};
  (alocacoes || []).forEach(a => {
    if (!a.fornecedor_id || !a.data) return;
    const k = `${a.fornecedor_id}|${a.data}`;
    (byKey[k] = byKey[k] || []).push(a);
  });
  return Object.entries(byKey)
    .filter(([_, lst]) => lst.length > 1)
    .map(([k, lst]) => ({ key:k, fornecedor_id:lst[0].fornecedor_id, data:lst[0].data, alocacoes:lst }));
}

// ─── SEMANA DO MÊS ────────────────────────────────────────────────────────────
// Retorna nº da semana (1-5) baseado no dia do mês.
export function semanaDoMes(iso) {
  const dia = diaDeISO(iso);
  if (!dia) return null;
  return Math.min(5, Math.ceil(dia / 7));
}

// ─── RANGE DE DATAS DA SEMANA ─────────────────────────────────────────────────
// Dado mês (YYYY-MM) e semana (1-5), retorna array de ISOs dos dias da semana.
export function diasDaSemana(mes, semana) {
  if (!mes || !semana) return [];
  const [y, m] = mes.split("-").map(Number);
  const inicio = (semana - 1) * 7 + 1;
  const ultimoDia = new Date(y, m, 0).getDate();
  const fim = Math.min(semana * 7, ultimoDia);
  const dias = [];
  for (let d = inicio; d <= fim; d++) {
    dias.push(`${mes}-${String(d).padStart(2,"0")}`);
  }
  return dias;
}

// ─── WHATSAPP LINK ────────────────────────────────────────────────────────────
export const whatsappLink = numero => numero ? `https://wa.me/${numero.replace(/\D/g,"")}` : null;
