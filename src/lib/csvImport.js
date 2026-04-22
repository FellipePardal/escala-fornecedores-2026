// ─── PARSER DA PLANILHA DE ESCALA ─────────────────────────────────────────────
// A planilha original tem layout irregular: múltiplas semanas lado a lado,
// blocos por função com cabeçalho e linhas "DIÁRIA N" com "DD/MM - PROJETO".
// Este parser extrai alocações (eventuais) e pacotes mensais.

import { parseData } from "./escala";

// ─── CSV → matriz de células ──────────────────────────────────────────────────
export function parseCSV(texto) {
  const linhas = texto.split(/\r?\n/);
  return linhas.map(linha => {
    const celulas = [];
    let buf = "", dentro = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') { dentro = !dentro; continue; }
      if (c === ',' && !dentro) { celulas.push(buf.trim()); buf = ""; continue; }
      buf += c;
    }
    celulas.push(buf.trim());
    return celulas;
  });
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
const norm = s => String(s || "").trim().toUpperCase();
const slug = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// Mapeamento de funções (cabeçalhos da planilha → id no sistema).
const FUNCAO_POR_HEADER = {
  "DIRETORES DE IMAGENS":    "dir_imagens",
  "OPERADORES DE GC":        "op_gc",
  "OPERADORES DE SLOW/VT":   "op_slow_vt",
  "CÂMERAS ESTÚDIO":         "camera_estudio",
  "OPERADORES DE VÍDEO":     "op_video",
  "OPERADORES DE ÁUDIO":     "op_audio",
  "ASSIST. DE CAMERA":       "assist_camera",
  "OPERADOR DE TP":          "op_tp",
  "ILUMINADOR":              "iluminador",
  "FREELANCERS 15 DIAS":     null, // placeholder sem função definida
};

const FUNCAO_POR_NOME_PACOTE = {
  "DTV":                    "dtv",
  "CINEGRAFISTA":           "cinegrafista",
  "OPERADOR VÍDEO":         "op_video",
  "OPERADOR DE ÁUDIO":      "op_audio",
  "ASSSISTENTE DE CAMERA":  "assist_camera",
  "ASSISTENTE DE CAMERA":   "assist_camera",
  "ILUMINADOR":             "iluminador",
  "GC":                     "op_gc",
  "VT":                     "op_slow_vt",
  "CENOTECNICO":            "cenotecnico",
  "OPERADOR DE MCR":        "op_mcr",
  "TÉCNICO DE SISTEMAS":    "tec_sistemas",
  "OPERADOR ÁUDIOVISUAL (VMIX)": "op_av_vmix",
};

function funcaoIdPorHeader(header) {
  const n = norm(header);
  for (const [k, v] of Object.entries(FUNCAO_POR_HEADER)) if (n.includes(k)) return v;
  return null;
}

function funcaoIdPorNome(nome) {
  const n = norm(nome);
  return FUNCAO_POR_NOME_PACOTE[n] || null;
}

function parseValor(s) {
  if (!s) return 0;
  const limpo = String(s).replace(/R\$/g, "").replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(limpo) || 0;
}

// Extrai "DD/MM - NOME PROJETO" → { data, projeto }
function parseDiaria(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*-\s*(.+)$/);
  if (!m) return null;
  const data = parseData(m[1]);
  if (!data) return null;
  return { data, projeto: m[2].trim(), projeto_id: slug(m[2]) };
}

function parseWhatsapp(s) {
  if (!s) return "";
  const m = String(s).match(/wa\.me\/(\d+)/);
  return m ? m[1] : String(s).replace(/\D/g, "");
}

// ─── IMPORT DE ESCALA (eventual) ──────────────────────────────────────────────
// Retorna { alocacoes:[], fornecedoresEncontrados:[] } com base nos blocos
// "ESCALA FREELAS EVENTUAIS" × função × prestador × DIÁRIA N.
export function importarEscala(texto) {
  const grid = parseCSV(texto);
  const alocacoes = [];
  const fornecedoresEncontrados = {};

  // Detecta início de blocos de função: linha contendo um dos headers conhecidos.
  // Cada bloco tem estrutura (relativa à coluna inicial):
  //   header:    função  [vazio] [vazio]  "R$ X,XX"  ...
  //   OC Nº ...
  //   Valor Total ...
  //   PRESTADOR, nome1, nome2, ...
  //   CONTATO,   link1, link2, ...
  //   DIÁRIA 1, "DD/MM - PROJETO", ...
  //   DIÁRIA 2, ...
  //   até DIÁRIA 10
  //
  // Há múltiplos blocos horizontais (semanas) na mesma linha.
  // Estratégia: para cada linha, varrer colunas buscando headers.

  for (let row = 0; row < grid.length; row++) {
    const linha = grid[row];
    for (let col = 0; col < linha.length; col++) {
      const cell = linha[col];
      const funcaoId = funcaoIdPorHeader(cell);
      if (!funcaoId && !funcaoIdPorHeader(cell)) {
        // também aceita onde o header vem com espaços/indentação
        if (!cell || !/DIRETORES|OPERADORES|CÂMERAS|ASSIST|ILUMINADOR|OPERADOR DE TP/i.test(cell)) continue;
      }
      const fid = funcaoId || funcaoIdPorHeader(cell);
      if (!fid) continue;

      // Linhas seguintes: OC, Valor, PRESTADOR, CONTATO, DIÁRIA 1..10
      const prestadorRow = findRowFrom(grid, row, ["PRESTADOR"]);
      if (prestadorRow < 0) continue;
      const contatoRow = findRowFrom(grid, prestadorRow, ["CONTATO"]);

      // Coletar prestadores nas colunas do bloco (começando após col)
      for (let c = col + 1; c < (grid[prestadorRow]?.length || 0); c++) {
        const nome = (grid[prestadorRow][c] || "").trim();
        if (!nome) continue;
        // Para quando encontrar outro bloco (linha vazia ou cabeçalho)
        if (/OC Nº|PRESTADOR|DIÁRIA/.test(nome)) break;

        const whatsapp = parseWhatsapp(grid[contatoRow]?.[c]);
        const fornId = slug(nome);
        fornecedoresEncontrados[fornId] = fornecedoresEncontrados[fornId] || {
          id: fornId, nome, whatsapp, funcao_id: fid, tipo: "eventual",
        };
        if (whatsapp && !fornecedoresEncontrados[fornId].whatsapp) {
          fornecedoresEncontrados[fornId].whatsapp = whatsapp;
        }

        // Iterar DIÁRIA 1..10
        for (let d = 1; d <= 10; d++) {
          const diariaRow = findRowFrom(grid, contatoRow, [`DIÁRIA ${d}`]);
          if (diariaRow < 0) break;
          const val = (grid[diariaRow][c] || "").trim();
          if (!val) continue;
          const parsed = parseDiaria(val);
          if (!parsed) continue;
          alocacoes.push({
            id: `${fornId}_${parsed.data}_${fid}`,
            fornecedor_id: fornId,
            funcao_id: fid,
            projeto_id: parsed.projeto_id,
            projeto_nome: parsed.projeto,
            data: parsed.data,
            modalidade: "eventual",
            valor: 0, // preenchido depois pela função (diaria)
          });
        }
      }
      // pular colunas desse bloco — estimamos 8 colunas por bloco
      col += 8;
    }
  }

  return { alocacoes, fornecedoresEncontrados: Object.values(fornecedoresEncontrados) };
}

// Busca linha que começa com um dos marcadores a partir de startRow (inclusive).
function findRowFrom(grid, startRow, marcadores) {
  const maxLook = 30;
  for (let r = startRow; r < Math.min(grid.length, startRow + maxLook); r++) {
    const c0 = (grid[r]?.[0] || "").trim();
    for (const m of marcadores) {
      if (c0.toUpperCase().startsWith(m.toUpperCase())) return r;
      // também buscar na col dx próxima
      for (let cc = 0; cc < Math.min(4, grid[r].length); cc++) {
        if ((grid[r][cc] || "").trim().toUpperCase().startsWith(m.toUpperCase())) return r;
      }
    }
  }
  return -1;
}

// ─── IMPORT DE PACOTES MENSAIS ────────────────────────────────────────────────
// Lê blocos "FREELAS PACOTES - MES ANO" com colunas FUNÇÃO, PRESTADOR, CONTATO, VALOR, OC.
export function importarPacotes(texto) {
  const grid = parseCSV(texto);
  const pacotes = [];
  const fornecedoresEncontrados = {};

  for (let row = 0; row < grid.length; row++) {
    const linha = grid[row];
    for (let col = 0; col < linha.length; col++) {
      const cell = (linha[col] || "").trim();
      const m = cell.match(/FREELAS PACOTES - ([A-ZÇÃÉÓÚÁ]+) (\d{2,4})/i);
      if (!m) continue;
      const mes = m[1];
      const ano = m[2].length === 2 ? `20${m[2]}` : m[2];
      const mesNum = mesNomePraNumero(mes);
      if (!mesNum) continue;
      const mesISO = `${ano}-${mesNum}`;

      // Linha seguinte: FUNÇÃO, PRESTADOR, CONTATO, VALOR, OC
      for (let r = row + 2; r < grid.length; r++) {
        const l = grid[r];
        const funcao = (l[col] || "").trim();
        if (!funcao || /FREELAS|TOTAL|CARGO|ESTOURO/i.test(funcao)) break;
        const prestador = (l[col+1] || "").trim();
        const contato   = (l[col+2] || "").trim();
        const valor     = parseValor(l[col+3] || "");
        const oc        = (l[col+4] || "").trim();
        if (!prestador) continue;

        const fornId = slug(prestador);
        const funcaoId = funcaoIdPorNome(funcao);
        fornecedoresEncontrados[fornId] = fornecedoresEncontrados[fornId] || {
          id: fornId, nome: prestador, whatsapp: parseWhatsapp(contato),
          funcao_id: funcaoId, tipo: "pacote",
        };
        pacotes.push({
          id: `${fornId}_${mesISO}`,
          fornecedor_id: fornId,
          funcao_id: funcaoId,
          mes: mesISO,
          tipo: "15d", // assumido — pacote padrão da planilha
          valor,
          oc,
        });
      }
    }
  }
  return { pacotes, fornecedoresEncontrados: Object.values(fornecedoresEncontrados) };
}

function mesNomePraNumero(nome) {
  const map = {
    JANEIRO:"01", FEVEREIRO:"02", MARCO:"03", "MARÇO":"03",
    ABRIL:"04", MAIO:"05", JUNHO:"06", JULHO:"07", AGOSTO:"08",
    SETEMBRO:"09", OUTUBRO:"10", NOVEMBRO:"11", DEZEMBRO:"12",
  };
  return map[String(nome).toUpperCase()] || null;
}
