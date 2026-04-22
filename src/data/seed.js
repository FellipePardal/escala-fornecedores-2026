// ─── SEED INICIAL ─────────────────────────────────────────────────────────────
// Dados extraídos da planilha "ESCALA FREELAS EVENTUAIS / PACOTES - 2026".
// Estrutura:
//   funcoes       → catálogo de cargos com tabela de preços (diária + pacotes)
//   fornecedores  → prestadores cadastrados com função primária e WhatsApp
//   projetos      → catálogo de transmissões recorrentes
// Na primeira carga, o módulo grava esses valores em app_state (Supabase).
// Edições posteriores vivem no Supabase e têm precedência sobre o seed.

// ─── FUNÇÕES ──────────────────────────────────────────────────────────────────
// diaria          → diária avulsa (eventual)
// diaria_pacote   → diária dentro de pacote (desconto já aplicado)
// pacote_8d       → 8 diárias em pacote fechado
// pacote_15d      → 15 diárias em pacote fechado
// pacote_m        → pacote mensal (22 dias úteis)
// htt             → hora extra por transmissão
// grupo           → categoria visual ("transmissao", "coordenacao", "outros")
export const FUNCOES = [
  // Transmissão — cachê base R$ 350 / diária
  { id:"dtv",           nome:"DTV",                          diaria:450, diaria_pacote:360, pacote_8d:2880, pacote_15d:4050, pacote_m:6000, htt:56.25, grupo:"transmissao" },
  { id:"dir_imagens",   nome:"Diretor de Imagens",           diaria:450, diaria_pacote:360, pacote_8d:2880, pacote_15d:4050, pacote_m:6000, htt:56.25, grupo:"transmissao" },
  { id:"cinegrafista",  nome:"Cinegrafista",                 diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:4000, htt:43.75, grupo:"transmissao" },
  { id:"camera_estudio",nome:"Câmera Estúdio",               diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:4000, htt:43.75, grupo:"transmissao" },
  { id:"op_gc",         nome:"Operador de GC",               diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:5000, htt:43.75, grupo:"transmissao" },
  { id:"op_slow_vt",    nome:"Operador Slow/VT",             diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:5000, htt:43.75, grupo:"transmissao" },
  { id:"op_video",      nome:"Operador de Vídeo",            diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:4200, htt:43.75, grupo:"transmissao" },
  { id:"op_audio",      nome:"Operador de Áudio",            diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:5000, htt:43.75, grupo:"transmissao" },
  { id:"op_av_vmix",    nome:"Operador Áudiovisual (Vmix)",  diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:5000, htt:43.75, grupo:"transmissao" },
  { id:"op_mcr",        nome:"Operador de MCR",              diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:4000, htt:43.75, grupo:"transmissao" },
  { id:"assist_camera", nome:"Assistente de Câmera",         diaria:280, diaria_pacote:224, pacote_8d:1792, pacote_15d:2520, pacote_m:3500, htt:35.00, grupo:"transmissao" },
  { id:"op_tp",         nome:"Operador de TP",               diaria:280, diaria_pacote:224, pacote_8d:1792, pacote_15d:2520, pacote_m:3500, htt:35.00, grupo:"transmissao" },
  { id:"iluminador",    nome:"Iluminador",                   diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:4000, htt:43.75, grupo:"transmissao" },
  { id:"cenotecnico",   nome:"Cenotécnico",                  diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:4000, htt:43.75, grupo:"transmissao" },
  { id:"tec_sistemas",  nome:"Técnico de Sistemas",          diaria:350, diaria_pacote:280, pacote_8d:2240, pacote_15d:3150, pacote_m:5000, htt:43.75, grupo:"transmissao" },
  // Coordenação — contratação por evento ou diária fixa
  { id:"coord_projeto",     nome:"Coordenador do Projeto",        diaria:0,   diaria_pacote:0,   pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
  { id:"coord_transmissao", nome:"Coordenador da Transmissão",    diaria:0,   diaria_pacote:0,   pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
  { id:"produtor_transm",   nome:"Produtor da Transmissão",       diaria:0,   diaria_pacote:0,   pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
  { id:"resp_tecnico",      nome:"Responsável Técnico",           diaria:850, diaria_pacote:850, pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
  { id:"prod_externa",      nome:"Produtor de Externa",           diaria:0,   diaria_pacote:0,   pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
  { id:"coord_tec_externa", nome:"Coord. Técnico de Externa",     diaria:750, diaria_pacote:750, pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
  { id:"coord_cont_externa",nome:"Coord. Conteúdo de Externa",    diaria:750, diaria_pacote:750, pacote_8d:0, pacote_15d:0, pacote_m:0,    htt:0,     grupo:"coordenacao" },
];

// ─── FORNECEDORES ─────────────────────────────────────────────────────────────
// whatsapp → número DDI+DDD+fone (sem sinais). O link é montado na UI.
// funcao_id → função primária (um fornecedor pode atuar em outras, cadastrar no histórico)
export const FORNECEDORES = [
  // Diretores de Imagens
  { id:"edilson_silva",       nome:"Edilson Silva",            funcao_id:"dtv",          whatsapp:"5521967759467", tipo:"eventual" },
  { id:"matheus_ferreira",    nome:"Matheus Ferreira",         funcao_id:"dir_imagens",  whatsapp:"5521979660673", tipo:"eventual" },
  { id:"hewerton_andrade",    nome:"Hewerton Andrade",         funcao_id:"dir_imagens",  whatsapp:"5521964147692", tipo:"eventual" },
  // Operadores de GC
  { id:"maksuell_fernandes",  nome:"Maksuell Fernandes",       funcao_id:"op_gc",        whatsapp:"5521973028051", tipo:"eventual" },
  { id:"matheus_monteiro",    nome:"Matheus Monteiro",         funcao_id:"op_gc",        whatsapp:"",              tipo:"eventual" },
  { id:"marcelo_coelho",      nome:"Marcelo Coelho",           funcao_id:"op_gc",        whatsapp:"5521996405440", tipo:"eventual" },
  { id:"theo_crispim",        nome:"Theo Crispim",             funcao_id:"op_gc",        whatsapp:"5521991402760", tipo:"eventual" },
  { id:"pedro_henrique",      nome:"Pedro Henrique Andrade",   funcao_id:"op_gc",        whatsapp:"5521997378088", tipo:"eventual" },
  { id:"lucas_cardoso",       nome:"Lucas Cardoso",            funcao_id:"op_gc",        whatsapp:"5521999945899", tipo:"eventual" },
  { id:"marcos_rangel",       nome:"Marcos Rangel",            funcao_id:"op_gc",        whatsapp:"",              tipo:"eventual" },
  { id:"caio_sertori",        nome:"Caio Sertori Alexandre",   funcao_id:"op_gc",        whatsapp:"5521964335584", tipo:"pacote" },
  // Operadores de Slow/VT
  { id:"luiz_paulo_lupa",     nome:"Luiz Paulo (Lupa)",        funcao_id:"op_slow_vt",   whatsapp:"5522997331971", tipo:"eventual" },
  { id:"miguel_perez",        nome:"Miguel Perez",             funcao_id:"op_slow_vt",   whatsapp:"5521999188600", tipo:"eventual" },
  { id:"geovanne_ferreira",   nome:"Geovanne Ferreira",        funcao_id:"op_slow_vt",   whatsapp:"5521974686619", tipo:"eventual" },
  { id:"guanai_araujo",       nome:"Guanai de Araujo",         funcao_id:"op_slow_vt",   whatsapp:"5521974881250", tipo:"eventual" },
  { id:"eduardo_goncalves",   nome:"Eduardo Gonçalves",        funcao_id:"op_slow_vt",   whatsapp:"5521999689010", tipo:"eventual" },
  { id:"victor_hugo",         nome:"Victor Hugo",              funcao_id:"op_slow_vt",   whatsapp:"5521972287632", tipo:"eventual" },
  { id:"isaac_lopes",         nome:"Isaac Lopes",              funcao_id:"op_slow_vt",   whatsapp:"5521979774214", tipo:"pacote" },
  // Câmeras Estúdio / Assistentes
  { id:"marcos_tulio",        nome:"Marcos Túlio Araújo",      funcao_id:"camera_estudio", whatsapp:"5521983830042", tipo:"eventual" },
  { id:"renato_abrreto",      nome:"Renato Abrreto",           funcao_id:"assist_camera",  whatsapp:"5521995710111", tipo:"eventual" },
  { id:"william_wesley",      nome:"William Wesley",           funcao_id:"assist_camera",  whatsapp:"",              tipo:"pacote" },
  { id:"thais_martins",       nome:"Thais Fernanda Alves Martins", funcao_id:"assist_camera", whatsapp:"5521988603077", tipo:"pacote" },
  // Operador de Vídeo
  { id:"carlos_dias",         nome:"Carlos Dias",              funcao_id:"op_video",     whatsapp:"5521970131387", tipo:"eventual" },
  { id:"ricardo_laranjeira",  nome:"Ricardo da Silva Laranjeira", funcao_id:"op_video",  whatsapp:"5521982755871", tipo:"pacote" },
  // Operador de Áudio
  { id:"fernanda_gouveia",    nome:"Fernanda Gouveia",         funcao_id:"op_audio",     whatsapp:"5521967171433", tipo:"eventual" },
  { id:"andre_albino",        nome:"André Albino",             funcao_id:"op_audio",     whatsapp:"",              tipo:"eventual" },
  { id:"marcelo_rodrigues",   nome:"Marcelo Rodrigues",        funcao_id:"op_audio",     whatsapp:"5521992159979", tipo:"pacote" },
  // Operador de TP
  { id:"raphael_neves",       nome:"Raphael Neves",            funcao_id:"op_tp",        whatsapp:"5521981314960", tipo:"eventual" },
  // Iluminadores
  { id:"mario_jorge",         nome:"Mario Jorge Bastos Garcia",funcao_id:"iluminador",   whatsapp:"5521965327040", tipo:"eventual" },
  { id:"leonardo_bomfim",     nome:"Leonardo Ferreira Bomfim", funcao_id:"iluminador",   whatsapp:"5521964146392", tipo:"pacote" },
  // Pacotes adicionais
  { id:"cristovao_brito",     nome:"Cristóvão dos Santos Brito", funcao_id:"cinegrafista", whatsapp:"5521999181828", tipo:"pacote" },
  { id:"mateus_melandre",     nome:"Mateus Melandre Ferreira", funcao_id:"cinegrafista", whatsapp:"5521965247379", tipo:"pacote" },
  { id:"alexsander_cezar",    nome:"Alexsander Cezar",         funcao_id:"cinegrafista", whatsapp:"5521991009990", tipo:"pacote" },
  { id:"matheus_barros",      nome:"Matheus de Barros Ferreira", funcao_id:"dtv",        whatsapp:"5521998787010", tipo:"pacote" },
  { id:"gabriely_rougemont",  nome:"Gabriely Rougemont",       funcao_id:"cinegrafista", whatsapp:"",              tipo:"pacote" },
];

// ─── PROJETOS ─────────────────────────────────────────────────────────────────
export const PROJETOS = [
  { id:"bundesliga",     nome:"Bundesliga",         cor:"#ef4444" },
  { id:"ligue_1",        nome:"Ligue 1",            cor:"#3b82f6" },
  { id:"europa_league",  nome:"Europa League",      cor:"#f97316" },
  { id:"conference",     nome:"Conference League",  cor:"#06b6d4" },
  { id:"kings",          nome:"Kings League",       cor:"#8b5cf6" },
  { id:"wtt_macau",      nome:"WTT Macau",          cor:"#ec4899" },
  { id:"atp_morelia",    nome:"ATP Morelia",        cor:"#f59e0b" },
  { id:"atp_sao_leopoldo", nome:"ATP São Leopoldo", cor:"#22c55e" },
  { id:"atp_mexico",     nome:"ATP México",         cor:"#10b981" },
  { id:"basquete_3x3",   nome:"Basquete 3x3",       cor:"#dc2626" },
  { id:"stu_criciuma",   nome:"STU Criciúma",       cor:"#7c3aed" },
  { id:"piloto_qp",      nome:"Piloto Quarto Preto",cor:"#0ea5e9" },
  { id:"noche_de_copa",  nome:"Noche de Copa",      cor:"#d946ef" },
  { id:"roda_de_bobo",   nome:"Roda de Bobo",       cor:"#14b8a6" },
  { id:"aqui_brasil",    nome:"Aqui é Brasil",      cor:"#65a30d" },
  { id:"repescagem",     nome:"Repescagem",         cor:"#f97316" },
  { id:"italiano",       nome:"Italiano",           cor:"#16a34a" },
  { id:"bundesliga_mf",  nome:"Mundial de Futsal",  cor:"#dc2626" },
  { id:"grand_prix",     nome:"Grand Prix",         cor:"#0891b2" },
  { id:"cbfut",          nome:"CBFUT",              cor:"#059669" },
  { id:"copeiros",       nome:"Copeiros",           cor:"#7c2d12" },
  { id:"entrevista",     nome:"Entrevista",         cor:"#64748b" },
  { id:"geral",          nome:"Geral",              cor:"#475569" },
];

// ─── MÓDULOS DO APP (na Home) ─────────────────────────────────────────────────
export const MODULOS = [
  {
    id: "escala",
    nome: "Grade Semanal",
    descricao: "Controle de escala de diárias por semana, função e prestador",
    icon: "📅",
    corGrad: "linear-gradient(135deg,#166534,#15803d)",
    status: "Ativo",
    statusColor: "#22c55e",
  },
  {
    id: "fornecedores",
    nome: "Fornecedores",
    descricao: "Cadastro de prestadores com histórico de alocações e contato",
    icon: "👥",
    corGrad: "linear-gradient(135deg,#1e3a8a,#2563eb)",
    status: "Ativo",
    statusColor: "#3b82f6",
  },
  {
    id: "analise",
    nome: "Análise de Vantagem",
    descricao: "Recomendações de modalidade (eventual/pacote 8D/15D/mensal) por fornecedor",
    icon: "📈",
    corGrad: "linear-gradient(135deg,#78350f,#b45309)",
    status: "Ativo",
    statusColor: "#f59e0b",
  },
  {
    id: "import",
    nome: "Importar Planilha",
    descricao: "Carregar CSV da planilha de escala semanal ou pacotes mensais",
    icon: "📥",
    corGrad: "linear-gradient(135deg,#1e293b,#475569)",
    status: "Ativo",
    statusColor: "#94a3b8",
  },
];
