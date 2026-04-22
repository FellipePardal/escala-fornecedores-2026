// ─── ANÁLISE DE VANTAGEM CONTRATUAL ───────────────────────────────────────────
// Banner de economia potencial + cards de recomendação (1 por fornecedor × mês
// em que mudar de modalidade economiza). Gráfico comparativo e tabela detalhada.

import { useState, useEffect, useMemo } from "react";
import { Card, SectionHeader, Stat, Badge, Button, Chip, IconButton } from "./ui";
import { EmptyState, Avatar } from "./ui/Toast";
import { RADIUS, MODALIDADE_COLOR } from "../constants";
import { fmt } from "../utils";
import { FUNCOES, FORNECEDORES } from "../data/seed";
import { getState, setState as setSupabaseState, supabase, supabaseConfigured } from "../lib/supabase";
import {
  ArrowLeft, Sun, Moon, TrendingUp, DollarSign, Target,
  ArrowUpRight, AlertCircle, Zap, TrendingDown, Filter, ChevronDown,
} from "lucide-react";
import {
  agregarPorFornecedorMes, recomendar, custosPorModalidade, breakevens, MODALIDADE_LABEL,
} from "../lib/escala";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const KEY_FORNECED  = "escala_fornecedores";
const KEY_FUNCOES   = "escala_funcoes";
const KEY_ALOCACOES = "escala_alocacoes";

function formatMes(m) {
  if (!m) return "—";
  const [y, mm] = m.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[Number(mm)-1]} ${y}`;
}

export default function Analise({ onBack, T, darkMode, setDarkMode }) {
  const [fornecedores, setFornecedoresRaw] = useState(FORNECEDORES);
  const [funcoes, setFuncoesRaw]           = useState(FUNCOES);
  const [alocacoes, setAlocacoesRaw]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [view, setView] = useState("recomendacoes"); // recomendacoes | detalhes

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured) { setLoading(false); return; }
      const [fo, fu, al] = await Promise.all([getState(KEY_FORNECED), getState(KEY_FUNCOES), getState(KEY_ALOCACOES)]);
      if (fo) setFornecedoresRaw(fo);
      if (fu) setFuncoesRaw(fu);
      if (al) setAlocacoesRaw(al);
      setLoading(false);
    }
    load();
    if (!supabaseConfigured) return;
    const channel = supabase.channel('analise_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === KEY_FORNECED)   setFornecedoresRaw(payload.new.value);
        if (payload.new.key === KEY_FUNCOES)    setFuncoesRaw(payload.new.value);
        if (payload.new.key === KEY_ALOCACOES)  setAlocacoesRaw(payload.new.value);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const agregado = useMemo(() => agregarPorFornecedorMes(alocacoes), [alocacoes]);
  const meses = useMemo(() => Array.from(new Set(agregado.map(a => a.mes))).sort().reverse(), [agregado]);

  const linhas = useMemo(() => {
    const filtrado = mesFiltro === "todos" ? agregado : agregado.filter(a => a.mes === mesFiltro);
    return filtrado.map(a => {
      const forn = fornecedores.find(f => f.id === a.fornecedor_id);
      const funcao = funcoes.find(f => f.id === a.funcao_id) || (forn ? funcoes.find(f => f.id === forn.funcao_id) : null);
      const rec = recomendar(funcao, a.diarias);
      const custos = custosPorModalidade(funcao, a.diarias);
      const be = breakevens(funcao);
      return {
        fornecedor_id: a.fornecedor_id,
        fornecedor: forn?.nome || a.fornecedor_id,
        funcao: funcao?.nome || "?",
        funcao_id: funcao?.id,
        mes: a.mes,
        diarias: a.diarias,
        valor: a.valor,
        custos,
        breakevens: be,
        recomendacao: rec,
      };
    }).sort((a,b) => (b.recomendacao?.economia||0) - (a.recomendacao?.economia||0));
  }, [agregado, fornecedores, funcoes, mesFiltro]);

  const recomendacoesAtivas = linhas.filter(l => l.recomendacao?.modalidade !== "eventual" && l.recomendacao?.economia > 0);
  const economiaTotal = recomendacoesAtivas.reduce((s,l) => s + (l.recomendacao?.economia || 0), 0);
  const gastoTotal = linhas.reduce((s,l) => s + (l.custos?.eventual || 0), 0);

  const chartData = linhas.slice(0, 8).map(l => ({
    nome: l.fornecedor.split(" ")[0],
    nomeCompleto: l.fornecedor,
    atual: l.custos?.eventual || 0,
    recomendado: l.recomendacao?.custo || 0,
  }));

  if (loading) return <Loading T={T}/>;

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,display:"flex"}}>
      <aside style={sidebarStyle(T)}>
        <button onClick={onBack} title="Voltar" style={backBtn()}><ArrowLeft size={18} strokeWidth={2.25}/></button>
        <div style={{flex:1}}/>
        <IconButton icon={darkMode ? Sun : Moon} onClick={()=>setDarkMode(d=>!d)} size={40} T={T}/>
      </aside>

      <div style={{flex:1, minWidth:0, paddingBottom:40}}>
        <div style={{background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"20px 32px"}}>
          <div style={{display:"flex", gap:14, alignItems:"center"}}>
            <div style={{
              width:42, height:42, borderRadius:12,
              background:T.warning+"22", border:`1px solid ${T.warning}55`, color:T.warning,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <TrendingUp size={20} strokeWidth={2.25}/>
            </div>
            <div>
              <p style={{color:T.warning, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", margin:"0 0 3px", fontWeight:700}}>Otimização</p>
              <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.02em"}}>Análise de Vantagem Contratual</h1>
              <p style={{color:T.textMd, fontSize:12, margin:"4px 0 0"}}>
                Recomendações de modalidade (eventual × pacote) baseadas no histórico
              </p>
            </div>
          </div>
        </div>

        <div style={{padding:"24px 32px"}}>
          {linhas.length === 0 ? (
            <Card T={T}>
              <EmptyState T={T} icon={TrendingUp}
                title="Nada a analisar ainda"
                message="Sem alocações registradas. Adicione dados pela Grade Semanal ou importe a planilha."
              />
            </Card>
          ) : (
            <>
              {/* Banner de economia */}
              {economiaTotal > 0 ? (
                <div style={{
                  background: `linear-gradient(135deg, ${T.success}22, ${T.success}08)`,
                  border: `1px solid ${T.success}55`,
                  borderRadius: RADIUS.xl,
                  padding: "24px 28px",
                  marginBottom: 24,
                  display: "flex", gap: 20, alignItems:"center", flexWrap:"wrap",
                }}>
                  <div style={{
                    width:56, height:56, borderRadius:14,
                    background: `linear-gradient(135deg, ${T.success}, ${T.success}88)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0,
                  }}>
                    <Zap size={26} color="#fff" strokeWidth={2.25}/>
                  </div>
                  <div style={{flex:1, minWidth:240}}>
                    <p style={{margin:"0 0 6px", color:T.success, fontSize:11, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase"}}>Oportunidade de economia</p>
                    <h2 style={{margin:"0 0 6px", fontSize:28, fontWeight:800, color:T.text, letterSpacing:"-0.02em"}}>
                      Economize {fmt(economiaTotal)}
                    </h2>
                    <p style={{margin:0, color:T.textMd, fontSize:13}}>
                      Migrando <strong style={{color:T.text}}>{recomendacoesAtivas.length}</strong> fornecedores para modalidade mais adequada.{" "}
                      {((economiaTotal / gastoTotal) * 100).toFixed(1)}% do gasto atual.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: RADIUS.xl,
                  padding: "20px 24px",
                  marginBottom: 24,
                  display: "flex", gap:14, alignItems:"center",
                }}>
                  <div style={{
                    width:40, height:40, borderRadius:10,
                    background: T.success+"22", color: T.success,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <Target size={20}/>
                  </div>
                  <div>
                    <h3 style={{margin:"0 0 2px", fontSize:14, fontWeight:700, color:T.text}}>Modalidades otimizadas</h3>
                    <p style={{margin:0, fontSize:12, color:T.textMd}}>Todas as alocações atuais já estão na modalidade de menor custo.</p>
                  </div>
                </div>
              )}

              {/* KPIs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
                <Stat T={T} label="Gasto Total Analisado"      value={fmt(gastoTotal)} sub={`${linhas.length} fornecedor×mês`} color={T.info} icon={DollarSign}/>
                <Stat T={T} label="Recomendações Ativas"      value={String(recomendacoesAtivas.length)} sub="migrações sugeridas" color={T.warning} icon={ArrowUpRight}/>
                <Stat T={T} label="% de Economia Potencial"   value={gastoTotal ? `${((economiaTotal/gastoTotal)*100).toFixed(1)}%` : "0%"} sub="vs modelo atual" color={T.success} icon={TrendingDown}/>
              </div>

              {/* Filtros + view */}
              <div style={{display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center"}}>
                <span style={{color:T.textSm, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginRight:4}}>
                  <Filter size={11} style={{verticalAlign:"middle", marginRight:4}}/> Mês:
                </span>
                <Chip T={T} active={mesFiltro === "todos"} onClick={()=>setMesFiltro("todos")}>Todos</Chip>
                {meses.map(m => (
                  <Chip key={m} T={T} active={mesFiltro === m} onClick={()=>setMesFiltro(m)}>{formatMes(m)}</Chip>
                ))}
                <div style={{flex:1}}/>
                <Chip T={T} active={view === "recomendacoes"} onClick={()=>setView("recomendacoes")}>Recomendações</Chip>
                <Chip T={T} active={view === "detalhes"}      onClick={()=>setView("detalhes")}>Detalhes</Chip>
              </div>

              {view === "recomendacoes" && (
                <>
                  {chartData.length > 0 && (
                    <Card T={T} style={{marginBottom:24}}>
                      <SectionHeader T={T} title="Atual vs Recomendado" subtitle="Top 8 fornecedores por economia potencial" icon={DollarSign}/>
                      <div style={{padding:16, height:280}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                            <XAxis dataKey="nome" stroke={T.textSm} tick={{fontSize:11}}/>
                            <YAxis stroke={T.textSm} tick={{fontSize:11}} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}/>
                            <Tooltip
                              contentStyle={{background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12}}
                              labelStyle={{color:T.text}}
                              formatter={v => fmt(v)}
                              labelFormatter={(label, payload) => payload?.[0]?.payload?.nomeCompleto || label}
                            />
                            <Bar dataKey="atual"       fill={T.info}  name="Atual (Eventual)" radius={[6,6,0,0]}/>
                            <Bar dataKey="recomendado" fill={T.success} name="Recomendado" radius={[6,6,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  )}

                  {recomendacoesAtivas.length === 0 ? (
                    <Card T={T}>
                      <EmptyState T={T} icon={Target}
                        title="Sem migrações sugeridas"
                        message="Modalidade atual já é a mais vantajosa para esse filtro."
                      />
                    </Card>
                  ) : (
                    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:14}}>
                      {recomendacoesAtivas.map(l => (
                        <RecomendacaoCard key={`${l.fornecedor_id}_${l.mes}`} T={T} l={l}/>
                      ))}
                    </div>
                  )}
                </>
              )}

              {view === "detalhes" && (
                <Card T={T} style={{padding:0}}>
                  <SectionHeader T={T} title="Detalhamento" subtitle="Custos em todas as modalidades por fornecedor × mês" icon={Target}/>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%", borderCollapse:"collapse", minWidth:1000}}>
                      <thead>
                        <tr style={{background:T.surfaceAlt}}>
                          <th style={thStyle(T, "left")}>Fornecedor</th>
                          <th style={thStyle(T, "left")}>Função</th>
                          <th style={thStyle(T, "left")}>Mês</th>
                          <th style={thStyle(T, "right")}>Diárias</th>
                          <th style={thStyle(T, "right")}>Eventual</th>
                          <th style={thStyle(T, "right")}>Pacote 8D</th>
                          <th style={thStyle(T, "right")}>Pacote 15D</th>
                          <th style={thStyle(T, "right")}>Mensal</th>
                          <th style={thStyle(T, "left")}>Recomendado</th>
                          <th style={thStyle(T, "right")}>Economia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map(l => {
                          const rec = l.recomendacao;
                          const recCor = MODALIDADE_COLOR[rec?.modalidade] || T.textMd;
                          return (
                            <tr key={`${l.fornecedor_id}_${l.mes}`} style={{borderTop:`1px solid ${T.border}`}}>
                              <td style={{...tdStyle(T), fontWeight:600}}>
                                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                                  <Avatar nome={l.fornecedor} size={24}/>
                                  {l.fornecedor}
                                </div>
                              </td>
                              <td style={{...tdStyle(T), color:T.textMd}}>{l.funcao}</td>
                              <td style={{...tdStyle(T), color:T.textMd}}>{formatMes(l.mes)}</td>
                              <td className="num" style={{...tdStyle(T), textAlign:"right"}}>{l.diarias}</td>
                              <td className="num" style={{...tdStyle(T), textAlign:"right", color:l.custos?.eventual===rec?.custo?T.brand:T.text, fontWeight:l.custos?.eventual===rec?.custo?700:400}}>{fmt(l.custos?.eventual)}</td>
                              <td className="num" style={{...tdStyle(T), textAlign:"right", color:rec?.modalidade==="pacote_8d"?T.brand:T.textMd, fontWeight:rec?.modalidade==="pacote_8d"?700:400}}>{fmt(l.custos?.pacote_8d)}</td>
                              <td className="num" style={{...tdStyle(T), textAlign:"right", color:rec?.modalidade==="pacote_15d"?T.brand:T.textMd, fontWeight:rec?.modalidade==="pacote_15d"?700:400}}>{fmt(l.custos?.pacote_15d)}</td>
                              <td className="num" style={{...tdStyle(T), textAlign:"right", color:rec?.modalidade==="pacote_m"?T.brand:T.textMd, fontWeight:rec?.modalidade==="pacote_m"?700:400}}>{fmt(l.custos?.pacote_m)}</td>
                              <td style={tdStyle(T)}>
                                <Badge T={T} color={recCor} size="sm">
                                  {MODALIDADE_LABEL[rec?.modalidade] || "—"}
                                </Badge>
                              </td>
                              <td className="num" style={{...tdStyle(T), textAlign:"right", fontWeight:700, color:rec?.economia > 0 ? T.success : T.textSm}}>
                                {rec?.economia > 0 ? fmt(rec.economia) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Como calculamos */}
          <Card T={T} style={{marginTop:24}}>
            <SectionHeader T={T} title="Como a recomendação é calculada" icon={AlertCircle}/>
            <div style={{padding:16, color:T.textMd, fontSize:12.5, lineHeight:1.7}}>
              <p style={{margin:"0 0 10px"}}>Para cada fornecedor × mês, simulamos cada modalidade:</p>
              <ul style={{margin:"0 0 10px 20px", padding:0}}>
                <li><strong style={{color:T.text}}>Eventual:</strong> n × diária cheia</li>
                <li><strong style={{color:T.text}}>Pacote 8D:</strong> valor do pacote + (n−8) × diária com desconto (se n&gt;8)</li>
                <li><strong style={{color:T.text}}>Pacote 15D:</strong> valor do pacote + (n−15) × diária com desconto (se n&gt;15)</li>
                <li><strong style={{color:T.text}}>Pacote Mensal:</strong> valor do pacote + (n−22) × diária com desconto (se n&gt;22)</li>
              </ul>
              <p style={{margin:"10px 0 0"}}>A recomendação é a modalidade de <strong style={{color:T.brand}}>menor custo</strong>. Economia = custo eventual − custo recomendado.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── CARD DE RECOMENDAÇÃO ─────────────────────────────────────────────────────
function RecomendacaoCard({ T, l }) {
  const rec = l.recomendacao;
  const cor = MODALIDADE_COLOR[rec?.modalidade] || T.brand;
  const pctEconomia = l.custos?.eventual ? (rec.economia / l.custos.eventual) * 100 : 0;
  return (
    <div style={{
      background: T.surface, border:`1px solid ${T.border}`,
      borderRadius: RADIUS.lg, overflow:"hidden",
      display:"flex", flexDirection:"column",
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${cor}44, ${cor}18)`,
        padding:"14px 18px", borderBottom:`1px solid ${cor}33`,
        display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12,
      }}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:4}}>
            <Avatar nome={l.fornecedor} size={32}/>
            <div style={{minWidth:0, flex:1}}>
              <div style={{color:T.text, fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{l.fornecedor}</div>
              <div style={{color:T.textMd, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600}}>
                {l.funcao} · {formatMes(l.mes)}
              </div>
            </div>
          </div>
        </div>
        <Badge T={T} color={cor} size="sm" variant="solid">{l.diarias} diárias</Badge>
      </div>
      <div style={{padding:"16px 18px", flex:1, display:"flex", flexDirection:"column", gap:12}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <div>
            <div style={{color:T.textSm, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, marginBottom:2}}>Modelo atual</div>
            <div className="num" style={{color:T.text, fontSize:15, fontWeight:700, textDecoration:"line-through", textDecorationColor:T.danger+"aa"}}>
              {fmt(l.custos?.eventual)}
            </div>
            <div style={{color:T.textSm, fontSize:10}}>Eventual</div>
          </div>
          <div>
            <div style={{color:T.textSm, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, marginBottom:2}}>Recomendado</div>
            <div className="num" style={{color:cor, fontSize:15, fontWeight:700}}>
              {fmt(rec.custo)}
            </div>
            <div style={{color:cor, fontSize:10, fontWeight:600}}>{MODALIDADE_LABEL[rec.modalidade]}</div>
          </div>
        </div>
        <div style={{
          marginTop:"auto",
          padding:"12px 14px",
          background: T.success+"14",
          border:`1px solid ${T.success}44`,
          borderRadius:8,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <TrendingDown size={14} color={T.success}/>
            <span style={{color:T.text, fontSize:11, fontWeight:600}}>Economia mensal</span>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="num" style={{color:T.success, fontSize:15, fontWeight:800}}>{fmt(rec.economia)}</div>
            <div style={{color:T.success, fontSize:9, fontWeight:600}}>{pctEconomia.toFixed(1)}% a menos</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Loading = ({T}) => (
  <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
  </div>
);
const thStyle = (T, align="left") => ({
  padding:"11px 12px", color:T.textSm, fontSize:10, fontWeight:700,
  letterSpacing:"0.06em", textTransform:"uppercase",
  textAlign:align, whiteSpace:"nowrap",
  borderBottom:`1px solid ${T.border}`,
});
const tdStyle = (T) => ({ padding:"11px 12px", fontSize:12.5, color:T.text });
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
