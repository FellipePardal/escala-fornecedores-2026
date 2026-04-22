// ─── ESCALA — Grade com 3 visões (Semana / Mês / Dia) ────────────────────────
// Visão principal de alocação. Otimizada para uso diário: grupos colapsáveis,
// dropdown de projeto, destaque do dia atual, conflitos visuais e mini
// calendário mensal com densidade de alocação.

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, SectionHeader, Stat, Badge, Button, Chip, Segmented, IconButton } from "./ui";
import { EmptyState, Avatar, useToast } from "./ui/Toast";
import { RADIUS, MODALIDADE_COLOR } from "../constants";
import { fmt } from "../utils";
import { FUNCOES, FORNECEDORES, PROJETOS } from "../data/seed";
import { getState, setState as setSupabaseState, supabase, supabaseConfigured } from "../lib/supabase";
import {
  ArrowLeft, Sun, Moon, Calendar, Users, Plus, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, Filter, AlertTriangle,
  DollarSign, MessageCircle, CalendarDays, Clock, Upload,
  Check, ChevronUp, LayoutGrid, List, X,
} from "lucide-react";
import { whatsappLink, detectarConflitos, mesDeISO, diaDeISO } from "../lib/escala";

const KEY_FUNCOES     = "escala_funcoes";
const KEY_FORNECED    = "escala_fornecedores";
const KEY_PROJETOS    = "escala_projetos";
const KEY_ALOCACOES   = "escala_alocacoes";

const DIA_SEMANA = ["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];
const MES_NOMES  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function diasDaSemanaPorData(isoData) {
  const d = new Date(isoData + "T00:00:00");
  const dia = d.getDay();
  const offsetSeg = dia === 0 ? -6 : 1 - dia;
  const segunda = new Date(d);
  segunda.setDate(d.getDate() + offsetSeg);
  return Array.from({ length: 7 }, (_, i) => {
    const dx = new Date(segunda);
    dx.setDate(segunda.getDate() + i);
    return dx.toISOString().slice(0, 10);
  });
}
function fmtData(iso) { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${d}/${m}`; }

export default function Escala({ onBack, T, darkMode, setDarkMode }) {
  const toast = useToast();
  const hojeISO = new Date().toISOString().slice(0, 10);

  const [funcoes, setFuncoesRaw]             = useState(FUNCOES);
  const [fornecedores, setFornecedoresRaw]   = useState(FORNECEDORES);
  const [projetos, setProjetosRaw]           = useState(PROJETOS);
  const [alocacoes, setAlocacoesRaw]         = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView]             = useState("semana"); // semana | mes | dia
  const [dataRef, setDataRef]       = useState(hojeISO);
  const [filtroGrupo, setFiltroGrupo] = useState("transmissao");
  const [densidade, setDensidade]   = useState("confortavel"); // compacto | confortavel
  const [collapsed, setCollapsed]   = useState({});
  const [editing, setEditing]       = useState(null);

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured) { setLoading(false); return; }
      const [f, fo, p, al] = await Promise.all([
        getState(KEY_FUNCOES), getState(KEY_FORNECED), getState(KEY_PROJETOS), getState(KEY_ALOCACOES),
      ]);
      if (f) setFuncoesRaw(f);       else setSupabaseState(KEY_FUNCOES, FUNCOES);
      if (fo) setFornecedoresRaw(fo); else setSupabaseState(KEY_FORNECED, FORNECEDORES);
      if (p) setProjetosRaw(p);       else setSupabaseState(KEY_PROJETOS, PROJETOS);
      if (al) setAlocacoesRaw(al);    else setSupabaseState(KEY_ALOCACOES, []);
      setLoading(false);
    }
    load();
    if (!supabaseConfigured) return;
    const channel = supabase.channel('escala_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === KEY_FUNCOES)    setFuncoesRaw(payload.new.value);
        if (payload.new.key === KEY_FORNECED)   setFornecedoresRaw(payload.new.value);
        if (payload.new.key === KEY_PROJETOS)   setProjetosRaw(payload.new.value);
        if (payload.new.key === KEY_ALOCACOES)  setAlocacoesRaw(payload.new.value);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const setAlocacoes = fn => setAlocacoesRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState(KEY_ALOCACOES, next);
    return next;
  });
  const setFornecedores = fn => setFornecedoresRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState(KEY_FORNECED, next);
    return next;
  });

  const diasSemana = useMemo(() => diasDaSemanaPorData(dataRef), [dataRef]);
  const mesAtual   = mesDeISO(dataRef);

  const alocMap = useMemo(() => {
    const m = {};
    alocacoes.forEach(a => { m[`${a.fornecedor_id}|${a.data}`] = a; });
    return m;
  }, [alocacoes]);

  const funcoesFiltradas = useMemo(
    () => funcoes.filter(f => !filtroGrupo || f.grupo === filtroGrupo),
    [funcoes, filtroGrupo]
  );

  const conflitos = useMemo(() => detectarConflitos(alocacoes.filter(a => diasSemana.includes(a.data))), [alocacoes, diasSemana]);
  const conflitoKeys = useMemo(() => {
    const s = new Set();
    conflitos.forEach(c => c.alocacoes.forEach(a => s.add(`${a.fornecedor_id}|${a.data}`)));
    return s;
  }, [conflitos]);

  function alocar(fornecedor_id, funcao_id, data, { projeto_id, projeto_nome, valor } = {}) {
    const funcao = funcoes.find(f => f.id === funcao_id);
    const id = `${fornecedor_id}_${data}_${funcao_id}`;
    const novo = {
      id, fornecedor_id, funcao_id, data,
      projeto_id: projeto_id || null,
      projeto_nome: projeto_nome || "",
      modalidade: "eventual",
      valor: Number(valor) || funcao?.diaria || 0,
    };
    setAlocacoes(prev => {
      const sem = prev.filter(a => !(a.fornecedor_id === fornecedor_id && a.data === data));
      return [...sem, novo];
    });
    toast.success(`Alocado em ${fmtData(data)}`);
  }

  function remover(fornecedor_id, data) {
    setAlocacoes(prev => prev.filter(a => !(a.fornecedor_id === fornecedor_id && a.data === data)));
    toast.info("Alocação removida");
  }

  function adicionarFornecedor(funcao_id) {
    const nome = prompt("Nome do novo prestador:");
    if (!nome) return;
    const id = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
    const novo = { id: `${id}_${Date.now().toString(36)}`, nome, funcao_id, whatsapp:"", tipo:"eventual" };
    setFornecedores(prev => [...prev, novo]);
    toast.success(`${nome} adicionado`);
  }

  function navegar(delta) {
    const d = new Date(dataRef + "T00:00:00");
    if (view === "semana")  d.setDate(d.getDate() + delta * 7);
    else if (view === "mes") d.setMonth(d.getMonth() + delta);
    else                     d.setDate(d.getDate() + delta);
    setDataRef(d.toISOString().slice(0, 10));
  }

  if (loading) return <Loading T={T}/>;

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,display:"flex"}}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={sidebarStyle(T)}>
        <button onClick={onBack} title="Voltar" style={backBtn()}><ArrowLeft size={18} strokeWidth={2.25}/></button>
        <div style={{flex:1}}/>
        <IconButton icon={darkMode ? Sun : Moon} onClick={()=>setDarkMode(d=>!d)} size={40} T={T}/>
      </aside>

      <div style={{flex:1, minWidth:0, paddingBottom:40}}>
        {/* Header */}
        <div style={{background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"20px 32px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap"}}>
            <div style={{display:"flex", gap:14, alignItems:"center"}}>
              <div style={{
                width:42, height:42, borderRadius:12,
                background:T.brandSoft, border:`1px solid ${T.brandBorder}`, color:T.brand,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Calendar size={20} strokeWidth={2.25}/>
              </div>
              <div>
                <p style={{color:T.brand, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", margin:"0 0 3px", fontWeight:700}}>
                  Grade de Alocação
                </p>
                <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.02em"}}>
                  {view === "semana" && `${fmtData(diasSemana[0])} – ${fmtData(diasSemana[6])}`}
                  {view === "mes"    && `${MES_NOMES[Number(mesAtual.slice(5,7))-1]} ${mesAtual.slice(0,4)}`}
                  {view === "dia"    && new Date(dataRef).toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"long"})}
                </h1>
                <p style={{color:T.textMd, fontSize:12, margin:"4px 0 0"}}>
                  {alocacoes.filter(a => diasSemana.includes(a.data)).length} alocações nesta semana
                </p>
              </div>
            </div>

            <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
              <Button T={T} variant="secondary" size="sm" icon={ChevronLeft} onClick={()=>navegar(-1)}>Anterior</Button>
              <Button T={T} variant="secondary" size="sm" onClick={()=>setDataRef(hojeISO)}>Hoje</Button>
              <Button T={T} variant="secondary" size="sm" icon={ChevronRight} onClick={()=>navegar(1)}>Próximo</Button>
            </div>
          </div>

          {/* Tabs de visão + filtros */}
          <div style={{marginTop:16, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
            <Segmented T={T}
              options={[
                { value:"semana", label:"Semana" },
                { value:"mes",    label:"Mês" },
                { value:"dia",    label:"Dia" },
              ]}
              value={view} onChange={setView}
            />
            {view === "semana" && (
              <>
                <span style={{color:T.textSm, fontSize:11, marginLeft:8}}>FILTRAR</span>
                <Segmented T={T}
                  options={[
                    { value:"transmissao", label:"Transmissão" },
                    { value:"coordenacao", label:"Coordenação" },
                  ]}
                  value={filtroGrupo} onChange={setFiltroGrupo}
                />
                <span style={{color:T.textSm, fontSize:11, marginLeft:8}}>DENSIDADE</span>
                <Segmented T={T}
                  options={[
                    { value:"confortavel", label:"Confortável" },
                    { value:"compacto",    label:"Compacto" },
                  ]}
                  value={densidade} onChange={setDensidade}
                />
              </>
            )}
          </div>
        </div>

        {/* Conteúdo conforme view */}
        <div style={{padding:"24px 32px"}}>
          {alocacoes.length === 0 && view === "semana" && (
            <Card T={T} style={{marginBottom:24}}>
              <EmptyState T={T} icon={Upload}
                title="Nenhuma alocação ainda"
                message="Importe sua planilha Excel para popular rapidamente ou clique em qualquer célula da grade abaixo para alocar."
                action={<Button T={T} icon={Upload} onClick={onBack}>Voltar e importar</Button>}
              />
            </Card>
          )}

          {view === "semana" && (
            <GradeSemanal
              T={T} toast={toast}
              dias={diasSemana} hojeISO={hojeISO}
              funcoes={funcoesFiltradas} fornecedores={fornecedores} projetos={projetos}
              alocMap={alocMap} conflitoKeys={conflitoKeys}
              densidade={densidade}
              collapsed={collapsed} setCollapsed={setCollapsed}
              editing={editing} setEditing={setEditing}
              onAlocar={alocar} onRemover={remover} onAddForn={adicionarFornecedor}
            />
          )}

          {view === "mes" && (
            <CalendarioMes
              T={T} mesISO={mesAtual} hojeISO={hojeISO}
              alocacoes={alocacoes} fornecedores={fornecedores} projetos={projetos}
              onClickDia={(d) => { setDataRef(d); setView("dia"); }}
            />
          )}

          {view === "dia" && (
            <TimelineDia
              T={T} dataISO={dataRef}
              funcoes={funcoes} fornecedores={fornecedores} projetos={projetos}
              alocacoes={alocacoes.filter(a => a.data === dataRef)}
              onRemover={remover}
            />
          )}

          {/* Conflitos */}
          {view === "semana" && conflitos.length > 0 && (
            <Card T={T} style={{marginTop:24, borderColor:T.warning+"66"}}>
              <SectionHeader T={T}
                title={`${conflitos.length} conflitos detectados`}
                subtitle="Mesmo prestador em mais de uma alocação no mesmo dia"
                icon={AlertTriangle}
              />
              <div style={{padding:16, display:"flex", flexDirection:"column", gap:8}}>
                {conflitos.map(c => {
                  const fo = fornecedores.find(f => f.id === c.fornecedor_id);
                  return (
                    <div key={c.key} style={{
                      padding:"10px 14px", background:T.warning+"14",
                      border:`1px solid ${T.warning}44`, borderRadius:8,
                      fontSize:12, display:"flex", gap:10, alignItems:"center",
                    }}>
                      <AlertTriangle size={14} color={T.warning}/>
                      <strong style={{color:T.warning}}>{fo?.nome || c.fornecedor_id}</strong>
                      <span style={{color:T.textMd}}>{fmtData(c.data)}</span>
                      <span style={{color:T.textSm}}>→</span>
                      <span style={{color:T.text}}>{c.alocacoes.map(a => a.projeto_nome || "?").join(" + ")}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GRADE SEMANAL ────────────────────────────────────────────────────────────
function GradeSemanal({
  T, toast, dias, hojeISO, funcoes, fornecedores, projetos,
  alocMap, conflitoKeys, densidade, collapsed, setCollapsed,
  editing, setEditing, onAlocar, onRemover, onAddForn,
}) {
  const rowPad = densidade === "compacto" ? "4px 8px" : "8px 10px";
  const cellMinH = densidade === "compacto" ? 34 : 46;

  const fornecedoresPorFuncao = useMemo(() => {
    const map = {};
    funcoes.forEach(f => { map[f.id] = fornecedores.filter(fo => fo.funcao_id === f.id); });
    return map;
  }, [funcoes, fornecedores]);

  const totaisFuncao = useMemo(() => {
    const map = {};
    funcoes.forEach(f => {
      let total = 0, diarias = 0;
      (fornecedoresPorFuncao[f.id]||[]).forEach(fo => {
        dias.forEach(d => {
          const a = alocMap[`${fo.id}|${d}`];
          if (a) { total += Number(a.valor||f.diaria||0); diarias += 1; }
        });
      });
      map[f.id] = { total, diarias };
    });
    return map;
  }, [funcoes, fornecedoresPorFuncao, dias, alocMap]);

  return (
    <Card T={T} style={{padding:0}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse", minWidth:960}}>
          <thead>
            <tr style={{background:T.surfaceAlt}}>
              <th style={thFixo(T)}>Prestador</th>
              {dias.map((d,i) => {
                const isHoje = d === hojeISO;
                return (
                  <th key={d} style={{
                    ...thDia(T, isHoje),
                    minWidth:130,
                  }}>
                    <div style={{color:isHoje?T.brand:T.textSm, fontSize:9, letterSpacing:"0.1em", fontWeight:700}}>{DIA_SEMANA[i]}</div>
                    <div className="num" style={{color:isHoje?T.brand:T.text, fontSize:14, fontWeight:800}}>{fmtData(d)}</div>
                    {isHoje && <div style={{color:T.brand, fontSize:9, fontWeight:700, letterSpacing:"0.1em", marginTop:2}}>HOJE</div>}
                  </th>
                );
              })}
              <th style={{...thFixo(T), textAlign:"right"}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {funcoes.map(funcao => {
              const forn = fornecedoresPorFuncao[funcao.id] || [];
              const tot  = totaisFuncao[funcao.id];
              const open = !collapsed[funcao.id];
              return (
                <FragmentoFuncao
                  key={funcao.id} T={T} funcao={funcao} forn={forn} tot={tot}
                  open={open} toggle={() => setCollapsed(c => ({...c, [funcao.id]: !c[funcao.id]}))}
                  dias={dias} hojeISO={hojeISO} projetos={projetos}
                  alocMap={alocMap} conflitoKeys={conflitoKeys}
                  editing={editing} setEditing={setEditing}
                  onAlocar={onAlocar} onRemover={onRemover} onAddForn={onAddForn}
                  rowPad={rowPad} cellMinH={cellMinH}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FragmentoFuncao({
  T, funcao, forn, tot, open, toggle, dias, hojeISO, projetos,
  alocMap, conflitoKeys, editing, setEditing, onAlocar, onRemover, onAddForn,
  rowPad, cellMinH,
}) {
  return (
    <>
      {/* cabeçalho colapsável */}
      <tr style={{background:T.surfaceAlt, borderTop:`2px solid ${T.borderStrong}`, cursor:"pointer"}} onClick={toggle}>
        <td colSpan={9} style={{padding:"10px 16px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              {open ? <ChevronDown size={14} color={T.textMd}/> : <ChevronUp size={14} color={T.textMd}/>}
              <span style={{color:T.brand, fontSize:11, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase"}}>{funcao.nome}</span>
              <Badge color={T.textMd} T={T} size="sm">{fmt(funcao.diaria)}/dia</Badge>
              <span style={{color:T.textSm, fontSize:11}}>{forn.length} prestadores</span>
            </div>
            <div style={{display:"flex", gap:16, alignItems:"center", color:T.textMd, fontSize:12}}>
              <span>{tot?.diarias || 0} diárias</span>
              <span className="num" style={{color:T.text, fontWeight:700}}>{fmt(tot?.total || 0)}</span>
              <button onClick={e => { e.stopPropagation(); onAddForn(funcao.id); }}
                style={{background:T.brand, color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600, display:"flex", gap:4, alignItems:"center"}}>
                <Plus size={11}/> Prestador
              </button>
            </div>
          </div>
        </td>
      </tr>

      {open && forn.map(fo => {
        const fornTotal = dias.reduce((s,d) => s + (alocMap[`${fo.id}|${d}`] ? (alocMap[`${fo.id}|${d}`].valor || funcao.diaria || 0) : 0), 0);
        return (
          <tr key={fo.id} style={{borderTop:`1px solid ${T.border}`}}>
            <td style={{...tdPrestador(T, rowPad)}}>
              <div style={{display:"flex", gap:10, alignItems:"center"}}>
                <Avatar nome={fo.nome} size={30}/>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:600, color:T.text, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{fo.nome}</div>
                  {fo.whatsapp && (
                    <a href={whatsappLink(fo.whatsapp)} target="_blank" rel="noreferrer" style={{color:T.brand, fontSize:11, textDecoration:"none", display:"flex", alignItems:"center", gap:4}}>
                      <MessageCircle size={10}/>
                      {fo.whatsapp}
                    </a>
                  )}
                </div>
              </div>
            </td>
            {dias.map(d => {
              const a = alocMap[`${fo.id}|${d}`];
              const isEditing = editing && editing.fornecedor_id === fo.id && editing.data === d;
              const isHoje = d === hojeISO;
              const hasConflito = conflitoKeys.has(`${fo.id}|${d}`);

              if (isEditing) {
                return (
                  <td key={d} style={{padding:4}}>
                    <SelectorProjeto
                      T={T} projetos={projetos}
                      valorInicial={a?.projeto_id || ""}
                      funcao={funcao}
                      onConfirm={({ projeto_id, projeto_nome }) => {
                        onAlocar(fo.id, funcao.id, d, { projeto_id, projeto_nome });
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </td>
                );
              }

              const projetoObj = a?.projeto_id ? projetos.find(p => p.id === a.projeto_id) : null;
              const cor = projetoObj?.cor || T.brand;

              return (
                <td key={d} style={{padding:4, background: isHoje ? T.brandSoft+"18" : "transparent"}}>
                  <div
                    onClick={() => setEditing({ fornecedor_id: fo.id, data: d })}
                    style={{
                      minHeight:cellMinH, borderRadius:6, padding:"6px 8px",
                      background: a ? cor+"22" : "transparent",
                      border: hasConflito
                        ? `2px solid ${T.danger}`
                        : `1px dashed ${a ? cor+"66" : T.border}`,
                      cursor:"pointer", transition:"background .15s, border-color .15s",
                      position:"relative",
                      animation: hasConflito ? "pulse 1.5s ease infinite" : undefined,
                    }}
                    onMouseEnter={e => { if(!a && !hasConflito) e.currentTarget.style.background = T.surfaceAlt; }}
                    onMouseLeave={e => { if(!a && !hasConflito) e.currentTarget.style.background = "transparent"; }}
                  >
                    {a ? (
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:4}}>
                        <div style={{minWidth:0, flex:1}}>
                          <div style={{color:cor, fontSize:10, fontWeight:800, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                            {a.projeto_nome || projetoObj?.nome || "?"}
                          </div>
                          <div className="num" style={{color:T.textSm, fontSize:10, marginTop:2}}>
                            {fmt(a.valor || funcao.diaria)}
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); onRemover(fo.id, d); }}
                          style={{background:"transparent", border:"none", color:T.textSm, cursor:"pointer", padding:0, display:"flex"}}
                          title="Remover"><Trash2 size={10}/></button>
                      </div>
                    ) : (
                      <div style={{display:"flex", alignItems:"center", justifyContent:"center", color:T.textSm}}>
                        <Plus size={14} strokeWidth={1.5}/>
                      </div>
                    )}
                  </div>
                </td>
              );
            })}
            <td style={{...tdPrestador(T, rowPad), textAlign:"right"}} className="num">
              <span style={{color:fornTotal?T.text:T.textSm, fontWeight:700}}>{fmt(fornTotal)}</span>
            </td>
          </tr>
        );
      })}

      {open && forn.length === 0 && (
        <tr>
          <td colSpan={9} style={{padding:"14px 16px", color:T.textSm, fontSize:12, fontStyle:"italic", textAlign:"center"}}>
            Sem prestadores cadastrados nesta função.
            <button onClick={() => onAddForn(funcao.id)}
              style={{background:"transparent", border:"none", color:T.brand, cursor:"pointer", marginLeft:8, fontSize:12, fontWeight:600, textDecoration:"underline"}}>
              + Adicionar
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Selector de projeto (dropdown inline) ────────────────────────────────────
function SelectorProjeto({ T, projetos, valorInicial, funcao, onConfirm, onCancel }) {
  const [open, setOpen] = useState(true);
  const [busca, setBusca] = useState("");
  const inputRef = useRef(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const lista = useMemo(() => {
    if (!busca) return projetos;
    const q = busca.toLowerCase();
    return projetos.filter(p => p.nome.toLowerCase().includes(q));
  }, [projetos, busca]);

  function confirmarCustom() {
    if (busca.trim()) {
      onConfirm({ projeto_nome: busca.trim().toUpperCase(), projeto_id: null });
    } else {
      onCancel();
    }
  }
  function confirmarProjeto(p) {
    onConfirm({ projeto_nome: p.nome, projeto_id: p.id });
  }

  return (
    <div style={{position:"relative"}}>
      <input
        ref={inputRef}
        value={busca}
        onChange={e => { setBusca(e.target.value); setIdx(0); }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            if (lista[idx]) confirmarProjeto(lista[idx]);
            else confirmarCustom();
          } else if (e.key === "Escape") onCancel();
          else if (e.key === "ArrowDown") { setIdx(i => Math.min(i+1, lista.length-1)); e.preventDefault(); }
          else if (e.key === "ArrowUp")   { setIdx(i => Math.max(i-1, 0)); e.preventDefault(); }
        }}
        onBlur={e => {
          setTimeout(() => {
            if (document.activeElement?.dataset?.projItem !== "1") onCancel();
          }, 150);
        }}
        placeholder="Buscar projeto..."
        style={{
          width:"100%", boxSizing:"border-box",
          background:T.bg, border:`1px solid ${T.brand}`, borderRadius:6,
          color:T.text, padding:"6px 8px", fontSize:11, fontWeight:600,
        }}
      />
      {open && lista.length > 0 && (
        <div style={{
          position:"absolute", top:"100%", left:0, right:0, zIndex:50,
          marginTop:4, background:T.surface, border:`1px solid ${T.border}`,
          borderRadius:8, maxHeight:200, overflowY:"auto",
          boxShadow: T.shadow || "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {lista.map((p, i) => (
            <button
              key={p.id}
              data-proj-item="1"
              onMouseDown={() => confirmarProjeto(p)}
              onMouseEnter={() => setIdx(i)}
              style={{
                width:"100%", textAlign:"left",
                background: i === idx ? T.brandSoft : "transparent",
                border:"none", color:T.text,
                padding:"8px 10px", fontSize:12, cursor:"pointer",
                fontFamily:"inherit", display:"flex", alignItems:"center", gap:8,
                borderBottom:`1px solid ${T.border}`,
              }}
            >
              <span style={{width:8, height:8, borderRadius:"50%", background:p.cor}}/>
              <span>{p.nome}</span>
            </button>
          ))}
          {busca && !lista.some(p => p.nome.toLowerCase() === busca.toLowerCase()) && (
            <button
              data-proj-item="1"
              onMouseDown={confirmarCustom}
              style={{
                width:"100%", textAlign:"left",
                background:T.warning+"14", border:"none",
                color:T.warning, padding:"8px 10px", fontSize:12, cursor:"pointer",
                fontFamily:"inherit", fontWeight:600,
              }}>
              + Criar "{busca.toUpperCase()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CALENDÁRIO MENSAL ────────────────────────────────────────────────────────
function CalendarioMes({ T, mesISO, hojeISO, alocacoes, fornecedores, projetos, onClickDia }) {
  const [y, m] = mesISO.split("-").map(Number);
  const primeiro = new Date(y, m-1, 1);
  const ultimo   = new Date(y, m, 0);
  const diaSemInicio = primeiro.getDay() === 0 ? 6 : primeiro.getDay() - 1; // seg=0

  const alocPorDia = useMemo(() => {
    const map = {};
    alocacoes.forEach(a => {
      if (!a.data?.startsWith(mesISO)) return;
      (map[a.data] = map[a.data] || []).push(a);
    });
    return map;
  }, [alocacoes, mesISO]);

  const totais = useMemo(() => {
    const porDia = {};
    Object.entries(alocPorDia).forEach(([d, al]) => {
      porDia[d] = al.reduce((s, a) => s + (Number(a.valor) || 0), 0);
    });
    return porDia;
  }, [alocPorDia]);

  const maxDia = Math.max(1, ...Object.values(totais));

  const dias = [];
  for (let i = 0; i < diaSemInicio; i++) dias.push(null);
  for (let d = 1; d <= ultimo.getDate(); d++) dias.push(`${mesISO}-${String(d).padStart(2,"0")}`);
  while (dias.length % 7 !== 0) dias.push(null);

  return (
    <Card T={T}>
      <SectionHeader T={T} title="Visão Mensal" subtitle="Clique num dia para abrir a timeline" icon={CalendarDays}/>
      <div style={{padding:16}}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:6, marginBottom:8}}>
          {DIA_SEMANA.map(d => (
            <div key={d} style={{textAlign:"center", color:T.textSm, fontSize:10, fontWeight:700, letterSpacing:"0.08em", padding:4}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:6}}>
          {dias.map((d, i) => {
            if (!d) return <div key={i} style={{minHeight:82}}/>;
            const al = alocPorDia[d] || [];
            const total = totais[d] || 0;
            const intensidade = total / maxDia;
            const isHoje = d === hojeISO;
            const cores = Array.from(new Set(al.map(a => {
              const p = projetos.find(px => px.id === a.projeto_id);
              return p?.cor || T.brand;
            }))).slice(0, 5);
            return (
              <button
                key={d}
                onClick={() => onClickDia(d)}
                style={{
                  minHeight:82, padding:"8px 10px", borderRadius:8,
                  background: isHoje ? T.brandSoft : (al.length ? T.brand + Math.floor(intensidade*40).toString(16).padStart(2,"0") : T.surfaceAlt),
                  border: isHoje ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
                  cursor:"pointer", textAlign:"left", color:T.text,
                  fontFamily:"inherit", display:"flex", flexDirection:"column", gap:4,
                  transition:"transform .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span className="num" style={{fontSize:14, fontWeight:700, color:isHoje?T.brand:T.text}}>{Number(d.slice(8,10))}</span>
                  {al.length > 0 && (
                    <span style={{fontSize:10, color:T.textMd, fontWeight:600}}>{al.length}</span>
                  )}
                </div>
                {al.length > 0 && (
                  <>
                    <div style={{display:"flex", gap:3, flexWrap:"wrap"}}>
                      {cores.map((c,i) => (
                        <span key={i} style={{width:6, height:6, borderRadius:"50%", background:c}}/>
                      ))}
                      {al.length > cores.length && (
                        <span style={{fontSize:9, color:T.textSm}}>+{al.length - cores.length}</span>
                      )}
                    </div>
                    <span className="num" style={{fontSize:10, color:T.textMd, fontWeight:600, marginTop:"auto"}}>
                      {fmt(total)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── TIMELINE DO DIA ──────────────────────────────────────────────────────────
function TimelineDia({ T, dataISO, funcoes, fornecedores, projetos, alocacoes, onRemover }) {
  const porFuncao = useMemo(() => {
    const map = {};
    alocacoes.forEach(a => {
      (map[a.funcao_id] = map[a.funcao_id] || []).push(a);
    });
    return map;
  }, [alocacoes]);

  const total = alocacoes.reduce((s,a) => s + (Number(a.valor) || 0), 0);

  if (alocacoes.length === 0) {
    return (
      <Card T={T}>
        <EmptyState T={T} icon={CalendarDays}
          title="Dia sem alocações"
          message={`Ninguém foi alocado em ${fmtData(dataISO)}. Use a visão "Semana" para adicionar.`}
        />
      </Card>
    );
  }

  return (
    <Card T={T}>
      <SectionHeader T={T}
        title={`${alocacoes.length} alocações · ${fmt(total)}`}
        subtitle={new Date(dataISO).toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"long", year:"numeric"})}
        icon={Clock}
      />
      <div style={{padding:16, display:"flex", flexDirection:"column", gap:12}}>
        {Object.entries(porFuncao).map(([funcaoId, als]) => {
          const funcao = funcoes.find(f => f.id === funcaoId);
          return (
            <div key={funcaoId}>
              <h4 style={{margin:"0 0 8px", fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.08em", textTransform:"uppercase"}}>
                {funcao?.nome || funcaoId} · {als.length}
              </h4>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {als.map(a => {
                  const forn = fornecedores.find(f => f.id === a.fornecedor_id);
                  const projeto = projetos.find(p => p.id === a.projeto_id);
                  const cor = projeto?.cor || T.brand;
                  return (
                    <div key={a.id} style={{
                      display:"flex", gap:12, alignItems:"center",
                      padding:"10px 14px", background:T.surfaceAlt,
                      border:`1px solid ${T.border}`, borderLeft:`3px solid ${cor}`,
                      borderRadius:8,
                    }}>
                      <Avatar nome={forn?.nome || a.fornecedor_id} size={32}/>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{color:T.text, fontSize:13, fontWeight:600}}>{forn?.nome || a.fornecedor_id}</div>
                        <div style={{color:T.textMd, fontSize:11, display:"flex", gap:6, alignItems:"center"}}>
                          <span style={{width:8, height:8, borderRadius:"50%", background:cor}}/>
                          {a.projeto_nome || projeto?.nome || "?"}
                        </div>
                      </div>
                      <span className="num" style={{color:T.brand, fontSize:13, fontWeight:700}}>{fmt(a.valor)}</span>
                      <button onClick={() => onRemover(a.fornecedor_id, a.data)}
                        style={{background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, color:T.danger, cursor:"pointer", padding:"4px 8px", fontSize:11, fontFamily:"inherit", display:"flex", gap:4, alignItems:"center"}}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const Loading = ({T}) => (
  <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
  </div>
);
const sidebarStyle = (T) => ({
  width:72, minHeight:"100vh", background: T.gradSidebar,
  borderRight:"1px solid rgba(255,255,255,0.06)",
  display:"flex", flexDirection:"column", alignItems:"center",
  paddingTop:16, paddingBottom:16, gap:6, flexShrink:0,
  position:"sticky", top:0, height:"100vh",
});
const backBtn = () => ({
  width:44, height:44, borderRadius:12, border:"none", cursor:"pointer",
  background:"linear-gradient(135deg,#059669,#10b981)",
  color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
  marginBottom:14, boxShadow:"0 6px 16px rgba(16,185,129,0.35)",
});
const thFixo = (T) => ({
  padding:"12px 14px", color:T.textSm, fontSize:10, fontWeight:700,
  letterSpacing:"0.06em", textTransform:"uppercase", textAlign:"left",
  whiteSpace:"nowrap", borderBottom:`1px solid ${T.border}`,
});
const thDia = (T, isHoje) => ({
  padding:"8px 10px", textAlign:"center",
  borderBottom:`1px solid ${T.border}`,
  background: isHoje ? T.brandSoft+"30" : "transparent",
});
const tdPrestador = (T, pad) => ({ padding:pad, fontSize:13, color:T.text, verticalAlign:"middle" });
