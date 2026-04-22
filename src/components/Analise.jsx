// ─── ANÁLISE DE VANTAGEM CONTRATUAL ───────────────────────────────────────────
// Para cada fornecedor × mês, calcula custo em cada modalidade (eventual,
// pacote 8D/15D/mensal) e recomenda a de menor custo. Indica economia potencial
// e alerta sobre padrões (ex: estouro recorrente).

import { useState, useEffect, useMemo } from "react";
import { Card, SectionHeader, Stat, Badge, Button, Chip, IconButton } from "./ui";
import { RADIUS, MODALIDADE_COLOR } from "../constants";
import { fmt } from "../utils";
import { FUNCOES, FORNECEDORES } from "../data/seed";
import { getState, setState as setSupabaseState, supabase, supabaseConfigured } from "../lib/supabase";
import {
  ArrowLeft, Sun, Moon, TrendingUp, DollarSign, Target,
  ArrowUpRight, AlertCircle,
} from "lucide-react";
import {
  agregarPorFornecedorMes, recomendar, custosPorModalidade, breakevens, MODALIDADE_LABEL,
} from "../lib/escala";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const KEY_FORNECED  = "escala_fornecedores";
const KEY_FUNCOES   = "escala_funcoes";
const KEY_ALOCACOES = "escala_alocacoes";

export default function Analise({ onBack, T, darkMode, setDarkMode }) {
  const [fornecedores, setFornecedoresRaw] = useState(FORNECEDORES);
  const [funcoes, setFuncoesRaw]           = useState(FUNCOES);
  const [alocacoes, setAlocacoesRaw]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState("todos");

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

  const economiaTotal = linhas.reduce((s,l) => s + (l.recomendacao?.economia || 0), 0);
  const linhasComRecomendacao = linhas.filter(l => l.recomendacao?.modalidade !== "eventual" && l.recomendacao?.economia > 0);

  const chartData = linhas.slice(0, 10).map(l => ({
    nome: l.fornecedor.split(" ")[0],
    eventual: l.custos?.eventual || 0,
    recomendado: l.recomendacao?.custo || 0,
    economia: l.recomendacao?.economia || 0,
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
                Recomendação de modalidade (eventual / pacote) por fornecedor × mês
              </p>
            </div>
          </div>
        </div>

        <div style={{padding:"24px 32px"}}>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
            <Stat T={T} label="Economia Potencial" value={fmt(economiaTotal)} sub={`${linhasComRecomendacao.length} migrações sugeridas`} color={T.success} icon={DollarSign}/>
            <Stat T={T} label="Fornecedores Analisados" value={String(linhas.length)} sub={mesFiltro === "todos" ? "todos os meses" : mesFiltro} color={T.info} icon={Target}/>
            <Stat T={T} label="Recomendações de Mudança" value={String(linhasComRecomendacao.length)} sub="Pacote vs Eventual" color={T.warning} icon={ArrowUpRight}/>
          </div>

          {/* Filtros de mês */}
          <div style={{display:"flex", gap:8, marginBottom:20, flexWrap:"wrap"}}>
            <Chip T={T} active={mesFiltro === "todos"} onClick={()=>setMesFiltro("todos")}>Todos os meses</Chip>
            {meses.map(m => (
              <Chip key={m} T={T} active={mesFiltro === m} onClick={()=>setMesFiltro(m)}>{formatMes(m)}</Chip>
            ))}
          </div>

          {/* Gráfico */}
          {chartData.length > 0 && (
            <Card T={T} style={{marginBottom:24}}>
              <SectionHeader T={T} title="Top 10 — Eventual vs Recomendado" subtitle="Barras comparam custo atual (eventual) vs melhor modalidade sugerida" icon={DollarSign}/>
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
                    />
                    <Bar dataKey="eventual"    fill={T.info}  name="Eventual"/>
                    <Bar dataKey="recomendado" fill={T.brand} name="Recomendado"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Tabela */}
          <Card T={T}>
            <SectionHeader T={T} title="Detalhamento por Fornecedor × Mês" subtitle="Ordenado por maior economia potencial" icon={Target}/>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", minWidth:1000}}>
                <thead>
                  <tr style={{background:T.surfaceAlt}}>
                    <th style={thStyle(T, "left")}>Fornecedor</th>
                    <th style={thStyle(T, "left")}>Função</th>
                    <th style={thStyle(T, "left")}>Mês</th>
                    <th style={thStyle(T, "right")}>Diárias</th>
                    <th style={thStyle(T, "right")}>Custo Eventual</th>
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
                        <td style={{...tdStyle(T), fontWeight:600}}>{l.fornecedor}</td>
                        <td style={{...tdStyle(T), color:T.textMd}}>{l.funcao}</td>
                        <td style={{...tdStyle(T), color:T.textMd}}>{formatMes(l.mes)}</td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right"}}>{l.diarias}</td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right", color:l.custos?.eventual===rec?.custo?T.brand:T.text}}>{fmt(l.custos?.eventual)}</td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right", color:rec?.modalidade==="pacote_8d"?T.brand:T.textMd}}>{fmt(l.custos?.pacote_8d)}</td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right", color:rec?.modalidade==="pacote_15d"?T.brand:T.textMd}}>{fmt(l.custos?.pacote_15d)}</td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right", color:rec?.modalidade==="pacote_m"?T.brand:T.textMd}}>{fmt(l.custos?.pacote_m)}</td>
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
                  {linhas.length === 0 && (
                    <tr><td colSpan={10} style={{padding:"28px 16px", textAlign:"center", color:T.textSm}}>Sem alocações para analisar — faça import ou registre na grade.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Legenda / Regra */}
          <Card T={T} style={{marginTop:24}}>
            <SectionHeader T={T} title="Como a recomendação é calculada" icon={AlertCircle}/>
            <div style={{padding:16, color:T.textMd, fontSize:12.5, lineHeight:1.7}}>
              <p style={{margin:"0 0 10px"}}>Para cada fornecedor × mês:</p>
              <ul style={{margin:"0 0 10px 20px", padding:0}}>
                <li><strong style={{color:T.text}}>Eventual:</strong> n × diária cheia</li>
                <li><strong style={{color:T.text}}>Pacote 8D:</strong> valor do pacote + diárias extras (acima de 8) pela diária com desconto</li>
                <li><strong style={{color:T.text}}>Pacote 15D:</strong> idem, acima de 15</li>
                <li><strong style={{color:T.text}}>Pacote Mensal:</strong> idem, acima de 22 dias úteis</li>
              </ul>
              <p style={{margin:"10px 0 0"}}>A recomendação é sempre a modalidade de <strong style={{color:T.brand}}>menor custo</strong>. Economia = custo eventual − custo recomendado.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatMes(m) {
  if (!m) return "—";
  const [y, mm] = m.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[Number(mm)-1]} ${y}`;
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
