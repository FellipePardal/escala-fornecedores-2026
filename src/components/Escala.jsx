// ─── GRADE SEMANAL ────────────────────────────────────────────────────────────
// Matriz editável (função × prestador × dias da semana). Célula = alocação
// (data + projeto). Sync realtime via Supabase `app_state`.

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, SectionHeader, Stat, Badge, Button, Chip, Segmented, IconButton } from "./ui";
import { RADIUS, MODALIDADE_COLOR } from "../constants";
import { fmt, fmtK } from "../utils";
import { FUNCOES, FORNECEDORES, PROJETOS } from "../data/seed";
import { getState, setState as setSupabaseState, supabase, supabaseConfigured } from "../lib/supabase";
import {
  ArrowLeft, Sun, Moon, Calendar, Users, Plus, Trash2,
  ChevronLeft, ChevronRight, Filter, AlertTriangle, DollarSign, MessageCircle,
} from "lucide-react";
import { whatsappLink, detectarConflitos, parseData, mesDeISO, diaDeISO } from "../lib/escala";

const KEY_FUNCOES     = "escala_funcoes";
const KEY_FORNECED    = "escala_fornecedores";
const KEY_PROJETOS    = "escala_projetos";
const KEY_ALOCACOES   = "escala_alocacoes";
const KEY_PACOTES     = "escala_pacotes";

// Retorna ["YYYY-MM-DD", ...7] para a semana contendo `data` (segunda → domingo).
function diasDaSemanaPorData(isoData) {
  const d = new Date(isoData + "T00:00:00");
  const dia = d.getDay(); // 0=dom, 1=seg...
  const offsetSeg = dia === 0 ? -6 : 1 - dia;
  const segunda = new Date(d);
  segunda.setDate(d.getDate() + offsetSeg);
  return Array.from({ length: 7 }, (_, i) => {
    const dx = new Date(segunda);
    dx.setDate(segunda.getDate() + i);
    return dx.toISOString().slice(0, 10);
  });
}

const DIA_SEMANA_LABEL = ["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];

function fmtData(iso) {
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}`;
}

export default function Escala({ onBack, T, darkMode, setDarkMode }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [semanaRef, setSemanaRef] = useState(hoje);
  const [funcoes, setFuncoesRaw]             = useState(FUNCOES);
  const [fornecedores, setFornecedoresRaw]   = useState(FORNECEDORES);
  const [projetos, setProjetosRaw]           = useState(PROJETOS);
  const [alocacoes, setAlocacoesRaw]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroGrupo, setFiltroGrupo] = useState("transmissao");
  const [editing, setEditing] = useState(null); // { fornecedor_id, funcao_id, data }
  const editInputRef = useRef(null);

  const dias = useMemo(() => diasDaSemanaPorData(semanaRef), [semanaRef]);
  const mesAtual = mesDeISO(dias[0]);

  // ─── LOAD / REALTIME ───────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!supabaseConfigured) {
        setLoading(false);
        return;
      }
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
    const channel = supabase
      .channel('escala_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === KEY_FUNCOES)    setFuncoesRaw(payload.new.value);
        if (payload.new.key === KEY_FORNECED)   setFornecedoresRaw(payload.new.value);
        if (payload.new.key === KEY_PROJETOS)   setProjetosRaw(payload.new.value);
        if (payload.new.key === KEY_ALOCACOES)  setAlocacoesRaw(payload.new.value);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ─── SETTERS COM SYNC ──────────────────────────────────────────────────────
  const setAlocacoes = fn => setAlocacoesRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState(KEY_ALOCACOES, next);
    return next;
  });

  // ─── DERIVED ───────────────────────────────────────────────────────────────
  const alocMap = useMemo(() => {
    const m = {};
    alocacoes.forEach(a => {
      const k = `${a.fornecedor_id}|${a.data}`;
      m[k] = a;
    });
    return m;
  }, [alocacoes]);

  const funcoesVisiveis = useMemo(
    () => funcoes.filter(f => !filtroGrupo || f.grupo === filtroGrupo),
    [funcoes, filtroGrupo]
  );

  // Agrupa fornecedores por função para exibição.
  const fornecedoresPorFuncao = useMemo(() => {
    const map = {};
    funcoesVisiveis.forEach(f => {
      map[f.id] = fornecedores.filter(fo => fo.funcao_id === f.id);
    });
    return map;
  }, [funcoesVisiveis, fornecedores]);

  // Totais da semana por função
  const totaisSemana = useMemo(() => {
    const map = {};
    funcoes.forEach(f => {
      let total = 0, diarias = 0;
      fornecedores.filter(fo => fo.funcao_id === f.id).forEach(fo => {
        dias.forEach(d => {
          const a = alocMap[`${fo.id}|${d}`];
          if (a) { total += Number(a.valor || f.diaria || 0); diarias += 1; }
        });
      });
      map[f.id] = { total, diarias };
    });
    return map;
  }, [funcoes, fornecedores, dias, alocMap]);

  const totalGeralSemana = Object.values(totaisSemana).reduce((s, v) => s + v.total, 0);
  const totalDiariasSemana = Object.values(totaisSemana).reduce((s, v) => s + v.diarias, 0);

  const conflitos = useMemo(() => detectarConflitos(alocacoes.filter(a => dias.includes(a.data))), [alocacoes, dias]);

  // ─── AÇÕES ─────────────────────────────────────────────────────────────────
  function alocar(fornecedor_id, funcao_id, data, projeto_nome) {
    const funcao = funcoes.find(f => f.id === funcao_id);
    const projeto = projetos.find(p =>
      p.nome.toLowerCase() === (projeto_nome || "").toLowerCase() ||
      p.id === (projeto_nome || "").toLowerCase()
    );
    const id = `${fornecedor_id}_${data}_${funcao_id}`;
    const novo = {
      id, fornecedor_id, funcao_id, data,
      projeto_id: projeto?.id || null,
      projeto_nome: projeto_nome || "",
      modalidade: "eventual",
      valor: funcao?.diaria || 0,
    };
    setAlocacoes(prev => {
      const sem = prev.filter(a => !(a.fornecedor_id === fornecedor_id && a.data === data));
      return [...sem, novo];
    });
  }

  function remover(fornecedor_id, data) {
    setAlocacoes(prev => prev.filter(a => !(a.fornecedor_id === fornecedor_id && a.data === data)));
  }

  function navegarSemana(delta) {
    const d = new Date(semanaRef + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setSemanaRef(d.toISOString().slice(0, 10));
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
    </div>
  );

  const GRUPOS = [
    { value:"transmissao", label:"Transmissão" },
    { value:"coordenacao", label:"Coordenação" },
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,display:"flex"}}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width:72, minHeight:"100vh",
        background: T.gradSidebar,
        borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column", alignItems:"center",
        paddingTop:16, paddingBottom:16, gap:6, flexShrink:0,
        position:"sticky", top:0, height:"100vh",
      }}>
        <button onClick={onBack} title="Voltar"
          style={{
            width:44, height:44, borderRadius:12, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#059669,#10b981)",
            color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
            marginBottom:14, boxShadow:"0 6px 16px rgba(16,185,129,0.35)",
          }}>
          <ArrowLeft size={18} strokeWidth={2.25}/>
        </button>
        <div style={{ flex:1 }}/>
        <IconButton
          icon={darkMode ? Sun : Moon}
          title={darkMode?"Modo claro":"Modo escuro"}
          onClick={()=>setDarkMode(d=>!d)}
          size={40} T={T}
        />
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div style={{flex:1,minWidth:0,paddingBottom:40,background:T.bg}}>
        {/* Header */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "20px 32px" }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16}}>
            <div style={{display:"flex", alignItems:"center", gap:14}}>
              <div style={{
                width:42, height:42, borderRadius:12,
                background: T.brandSoft, border:`1px solid ${T.brandBorder}`,
                color: T.brand, display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Calendar size={20} strokeWidth={2.25}/>
              </div>
              <div>
                <p style={{color:T.brand, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", margin:"0 0 3px", fontWeight:700}}>Escala Semanal</p>
                <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.02em"}}>Grade de Alocação</h1>
                <p style={{color:T.textMd, fontSize:12, margin:"4px 0 0"}}>
                  {fmtData(dias[0])} – {fmtData(dias[6])} · {dias[0].slice(0,4)}
                </p>
              </div>
            </div>

            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <Button T={T} variant="secondary" size="sm" icon={ChevronLeft} onClick={()=>navegarSemana(-1)}>Semana anterior</Button>
              <Button T={T} variant="secondary" size="sm" onClick={()=>setSemanaRef(hoje)}>Hoje</Button>
              <Button T={T} variant="secondary" size="sm" icon={ChevronRight} onClick={()=>navegarSemana(1)}>Próxima</Button>
            </div>
          </div>

          {/* Filtros */}
          <div style={{marginTop:16, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
            <Segmented T={T} options={GRUPOS} value={filtroGrupo} onChange={setFiltroGrupo}/>
          </div>
        </div>

        <div style={{padding:"24px 32px"}}>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
            <Stat T={T} label="Gasto da Semana" value={fmt(totalGeralSemana)} sub={`${totalDiariasSemana} diárias`} color={T.brand} icon={DollarSign}/>
            <Stat T={T} label="Fornecedores Ativos" value={String(fornecedores.length)} sub={`em ${funcoesVisiveis.length} funções`} color={T.info} icon={Users}/>
            <Stat T={T} label="Conflitos na Semana" value={String(conflitos.length)} sub={conflitos.length?"Verificar overlaps":"Nenhum conflito"} color={conflitos.length?T.warning:T.success} icon={AlertTriangle}/>
          </div>

          {/* Grade */}
          <Card T={T}>
            <SectionHeader T={T} title="Grade Semanal" subtitle="Clique numa célula para alocar. Ex: `28/03 - KINGS`" icon={Calendar}/>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", minWidth:900}}>
                <thead>
                  <tr style={{background:T.surfaceAlt}}>
                    <th style={thStyle(T, "left")}>Prestador</th>
                    {dias.map((d,i) => (
                      <th key={d} style={{...thStyle(T, "center"), minWidth:110}}>
                        <div style={{color:T.textSm, fontSize:9, letterSpacing:"0.1em"}}>{DIA_SEMANA_LABEL[i]}</div>
                        <div className="num" style={{color:T.text, fontSize:13, fontWeight:700}}>{fmtData(d)}</div>
                      </th>
                    ))}
                    <th style={{...thStyle(T, "right"), minWidth:90}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {funcoesVisiveis.map(funcao => {
                    const forn = fornecedoresPorFuncao[funcao.id] || [];
                    const tot = totaisSemana[funcao.id] || { total:0, diarias:0 };
                    return (
                      <>
                        <tr key={`h_${funcao.id}`} style={{background:T.surfaceAlt, borderTop:`2px solid ${T.borderStrong}`}}>
                          <td colSpan={9} style={{padding:"10px 16px"}}>
                            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
                              <div style={{display:"flex", alignItems:"center", gap:10}}>
                                <span style={{color:T.brand, fontSize:11, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase"}}>{funcao.nome}</span>
                                <Badge color={T.textMd} T={T} size="sm">{fmt(funcao.diaria)}/dia</Badge>
                                <span style={{color:T.textSm, fontSize:11}}>{forn.length} prestadores</span>
                              </div>
                              <div style={{display:"flex", gap:16, color:T.textMd, fontSize:12}}>
                                <span>{tot.diarias} diárias</span>
                                <span className="num" style={{color:T.text, fontWeight:700}}>{fmt(tot.total)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {forn.map(fo => {
                          const fornTotal = dias.reduce((s,d) => s + (alocMap[`${fo.id}|${d}`] ? (alocMap[`${fo.id}|${d}`].valor || funcao.diaria || 0) : 0), 0);
                          return (
                            <tr key={fo.id} style={{borderTop:`1px solid ${T.border}`}}>
                              <td style={tdStyle(T)}>
                                <div style={{display:"flex", flexDirection:"column", gap:2}}>
                                  <span style={{fontWeight:600, color:T.text, fontSize:13}}>{fo.nome}</span>
                                  {fo.whatsapp && (
                                    <a href={whatsappLink(fo.whatsapp)} target="_blank" rel="noreferrer" style={{color:T.brand, fontSize:11, textDecoration:"none", display:"flex", alignItems:"center", gap:4}}>
                                      <MessageCircle size={11}/>
                                      {fo.whatsapp}
                                    </a>
                                  )}
                                </div>
                              </td>
                              {dias.map(d => {
                                const a = alocMap[`${fo.id}|${d}`];
                                const isEditing = editing && editing.fornecedor_id === fo.id && editing.data === d;
                                if (isEditing) {
                                  return (
                                    <td key={d} style={{padding:4, verticalAlign:"top"}}>
                                      <input
                                        ref={editInputRef}
                                        autoFocus
                                        defaultValue={a?.projeto_nome || ""}
                                        placeholder="PROJETO"
                                        onKeyDown={e => {
                                          if (e.key === "Enter") {
                                            alocar(fo.id, funcao.id, d, e.currentTarget.value);
                                            setEditing(null);
                                          } else if (e.key === "Escape") {
                                            setEditing(null);
                                          }
                                        }}
                                        onBlur={e => {
                                          if (e.currentTarget.value) {
                                            alocar(fo.id, funcao.id, d, e.currentTarget.value);
                                          }
                                          setEditing(null);
                                        }}
                                        style={{
                                          width:"100%", boxSizing:"border-box",
                                          background:T.bg, border:`1px solid ${T.brand}`,
                                          borderRadius:6, color:T.text, padding:"6px 8px",
                                          fontSize:11, fontWeight:600,
                                        }}
                                      />
                                    </td>
                                  );
                                }
                                const projetoObj = a?.projeto_id ? projetos.find(p => p.id === a.projeto_id) : null;
                                const cor = projetoObj?.cor || T.brand;
                                return (
                                  <td key={d} style={{padding:4, verticalAlign:"top"}}>
                                    <div
                                      onClick={() => setEditing({ fornecedor_id: fo.id, funcao_id: funcao.id, data: d })}
                                      style={{
                                        minHeight:46, borderRadius:6, padding:"6px 8px",
                                        background: a ? cor + "22" : "transparent",
                                        border: `1px dashed ${a ? cor + "66" : T.border}`,
                                        cursor:"pointer", transition:"background .15s",
                                      }}
                                      onMouseEnter={e => { if(!a) e.currentTarget.style.background = T.surfaceAlt; }}
                                      onMouseLeave={e => { if(!a) e.currentTarget.style.background = "transparent"; }}
                                    >
                                      {a ? (
                                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:4}}>
                                          <div style={{minWidth:0}}>
                                            <div style={{color:cor, fontSize:10, fontWeight:800, letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                                              {a.projeto_nome || "?"}
                                            </div>
                                            <div className="num" style={{color:T.textSm, fontSize:10, marginTop:2}}>
                                              {fmt(a.valor || funcao.diaria)}
                                            </div>
                                          </div>
                                          <button
                                            onClick={e => { e.stopPropagation(); remover(fo.id, d); }}
                                            style={{background:"transparent", border:"none", color:T.textSm, cursor:"pointer", padding:0, display:"flex"}}
                                            title="Remover"
                                          >
                                            <Trash2 size={11}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <Plus size={14} color={T.textSm} strokeWidth={1.5}/>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              <td style={{...tdStyle(T), textAlign:"right"}} className="num">
                                <span style={{color:fornTotal?T.text:T.textSm, fontWeight:700}}>{fmt(fornTotal)}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {forn.length === 0 && (
                          <tr>
                            <td colSpan={9} style={{padding:"14px 16px", color:T.textSm, fontSize:12, fontStyle:"italic"}}>
                              Nenhum prestador cadastrado nesta função.
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Conflitos */}
          {conflitos.length > 0 && (
            <Card T={T} style={{marginTop:24}}>
              <SectionHeader T={T} title={`${conflitos.length} conflitos detectados`} subtitle="Mesmo prestador em mais de uma alocação no mesmo dia" icon={AlertTriangle}/>
              <div style={{padding:16, display:"flex", flexDirection:"column", gap:8}}>
                {conflitos.map(c => {
                  const fo = fornecedores.find(f => f.id === c.fornecedor_id);
                  return (
                    <div key={c.key} style={{padding:10, background:T.warning+"14", border:`1px solid ${T.warning}44`, borderRadius:6, fontSize:12}}>
                      <strong style={{color:T.warning}}>{fo?.nome || c.fornecedor_id}</strong> em {fmtData(c.data)} —{" "}
                      {c.alocacoes.map(a => a.projeto_nome).join(" + ")}
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

const thStyle = (T, align="left") => ({
  padding:"11px 12px", color:T.textSm, fontSize:10, fontWeight:700,
  letterSpacing:"0.06em", textTransform:"uppercase",
  textAlign:align, whiteSpace:"nowrap",
  borderBottom:`1px solid ${T.border}`,
});
const tdStyle = (T) => ({ padding:"10px 12px", fontSize:13, color:T.text });
