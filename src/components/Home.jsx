// ─── PAINEL DE COMANDO ────────────────────────────────────────────────────────
// Centro do app: KPIs da semana corrente, ações rápidas, timeline de hoje e
// cards dos módulos. Exibe estado vazio convidativo se ainda não houver dados.

import { useState, useEffect, useMemo } from "react";
import { RADIUS, APP_NAME, APP_SUBTITLE } from "../constants";
import { MODULOS, FUNCOES, FORNECEDORES, PROJETOS } from "../data/seed";
import { Card, Stat, Button, Badge, IconButton } from "./ui";
import { EmptyState, Avatar } from "./ui/Toast";
import { getState, supabase, supabaseConfigured } from "../lib/supabase";
import {
  LayoutDashboard, Sun, Moon, ArrowRight, Activity, Calendar,
  Users, TrendingUp, Upload, Clock, Zap, Target, AlertTriangle, DollarSign,
  CalendarDays, Sparkles,
} from "lucide-react";
import { fmt } from "../utils";
import { recomendar, agregarPorFornecedorMes, detectarConflitos, mesDeISO } from "../lib/escala";

const KEY_FORNECED  = "escala_fornecedores";
const KEY_FUNCOES   = "escala_funcoes";
const KEY_ALOCACOES = "escala_alocacoes";

function diasDaSemanaDeHoje() {
  const hoje = new Date();
  const dia = hoje.getDay();
  const offsetSeg = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() + offsetSeg);
  return Array.from({ length: 7 }, (_, i) => {
    const dx = new Date(seg);
    dx.setDate(seg.getDate() + i);
    return dx.toISOString().slice(0, 10);
  });
}

export default function Home({ onEnter, T, darkMode, setDarkMode }) {
  const [fornecedores, setFornecedores] = useState(FORNECEDORES);
  const [funcoes, setFuncoes]           = useState(FUNCOES);
  const [alocacoes, setAlocacoes]       = useState([]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    async function load() {
      const [fo, fu, al] = await Promise.all([getState(KEY_FORNECED), getState(KEY_FUNCOES), getState(KEY_ALOCACOES)]);
      if (fo) setFornecedores(fo);
      if (fu) setFuncoes(fu);
      if (al) setAlocacoes(al);
    }
    load();
    const channel = supabase.channel('home_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === KEY_FORNECED)   setFornecedores(payload.new.value);
        if (payload.new.key === KEY_FUNCOES)    setFuncoes(payload.new.value);
        if (payload.new.key === KEY_ALOCACOES)  setAlocacoes(payload.new.value);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const diasSemana = useMemo(diasDaSemanaDeHoje, []);
  const hoje = new Date().toISOString().slice(0,10);
  const mesAtual = mesDeISO(hoje);

  const alocSemana = useMemo(
    () => alocacoes.filter(a => diasSemana.includes(a.data)),
    [alocacoes, diasSemana]
  );
  const alocHoje = useMemo(
    () => alocacoes.filter(a => a.data === hoje),
    [alocacoes, hoje]
  );
  const alocMes = useMemo(
    () => alocacoes.filter(a => mesDeISO(a.data) === mesAtual),
    [alocacoes, mesAtual]
  );

  const gastoSemana = alocSemana.reduce((s,a) => s + (Number(a.valor) || 0), 0);
  const gastoMes    = alocMes.reduce((s,a) => s + (Number(a.valor) || 0), 0);
  const conflitos   = detectarConflitos(alocSemana);

  // Economia potencial do mês
  const economiaPotencial = useMemo(() => {
    const agg = agregarPorFornecedorMes(alocMes);
    return agg.reduce((sum, a) => {
      const forn = fornecedores.find(f => f.id === a.fornecedor_id);
      const funcao = funcoes.find(f => f.id === a.funcao_id) || (forn ? funcoes.find(f => f.id === forn.funcao_id) : null);
      const rec = recomendar(funcao, a.diarias);
      return sum + (rec?.economia || 0);
    }, 0);
  }, [alocMes, fornecedores, funcoes]);

  const semDados = alocacoes.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header style={{
        background: T.surface || T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 16, flexWrap: "wrap",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "saturate(180%) blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: T.gradBrand || "linear-gradient(135deg,#059669,#10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
          }}>
            <Calendar size={20} color="#fff" strokeWidth={2.25} />
          </div>
          <div>
            <p style={{
              color: T.textSm, fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", margin: "0 0 2px", fontWeight: 600,
            }}>{APP_NAME}</p>
            <h1 style={{
              fontSize: 17, fontWeight: 700, margin: 0, color: T.text,
              letterSpacing: "-0.02em",
            }}>{APP_SUBTITLE}</h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge color={T.brand} T={T}>
            <Activity size={11} strokeWidth={2.5} />
            {supabaseConfigured ? "Sincronizado" : "Offline"}
          </Badge>
          <Button T={T} variant="secondary" size="sm" icon={darkMode ? Sun : Moon} onClick={() => setDarkMode(d => !d)}>
            {darkMode ? "Claro" : "Escuro"}
          </Button>
        </div>
      </header>

      {/* ── Hero de status ─────────────────────────────────────────────── */}
      <main style={{ padding: "28px 32px 48px", maxWidth: 1320, margin: "0 auto" }}>
        <div style={{
          background: T.gradHeader || T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: RADIUS.xl,
          padding: "28px 32px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position:"absolute", top:-60, right:-60,
            width:240, height:240, borderRadius:"50%",
            background: T.brandGlow || "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 60%)",
            pointerEvents:"none",
          }}/>
          <div style={{position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:20}}>
            <div>
              <p style={{color:T.brand, fontSize:11, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", margin:"0 0 8px"}}>Semana de hoje</p>
              <h2 style={{fontSize:32, fontWeight:800, margin:"0 0 6px", letterSpacing:"-0.025em", color:T.text}}>
                {new Date(hoje).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" })}
              </h2>
              <p style={{color:T.textMd, fontSize:14, margin:0}}>
                {alocHoje.length} {alocHoje.length === 1 ? "alocação" : "alocações"} hoje · {alocSemana.length} na semana
              </p>
            </div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              <Button T={T} icon={Calendar} onClick={() => onEnter("escala")}>Abrir grade</Button>
              <Button T={T} variant="secondary" icon={Users} onClick={() => onEnter("fornecedores")}>Fornecedores</Button>
              {semDados && (
                <Button T={T} variant="secondary" icon={Upload} onClick={() => onEnter("import")}>Importar planilha</Button>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16, marginBottom: 28,
        }}>
          <Stat T={T} label="Gasto da Semana"     value={fmt(gastoSemana)} sub={`${alocSemana.length} diárias`} color={T.brand}   icon={DollarSign}/>
          <Stat T={T} label="Gasto do Mês"        value={fmt(gastoMes)}    sub={`${alocMes.length} diárias em ${mesAtual}`} color={T.info} icon={TrendingUp}/>
          <Stat T={T} label="Conflitos na Semana" value={String(conflitos.length)} sub={conflitos.length?"verificar overlaps":"nenhum conflito"} color={conflitos.length?T.warning:T.success} icon={AlertTriangle}/>
          <Stat T={T} label="Economia Potencial"  value={fmt(economiaPotencial)} sub="migrando para pacotes" color={economiaPotencial?T.success:T.textMd} icon={Zap}/>
        </div>

        {/* Dois painéis: Hoje + Módulos */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28}}>
          {/* Hoje */}
          <Card T={T}>
            <div style={{padding:"18px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{display:"flex", gap:10, alignItems:"center"}}>
                <div style={{
                  width:32, height:32, borderRadius:8,
                  background: T.brandSoft, color: T.brand,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}><Clock size={16} strokeWidth={2.25}/></div>
                <div>
                  <h3 style={{margin:0, fontSize:13, fontWeight:700, color:T.text}}>Hoje</h3>
                  <p style={{margin:"2px 0 0", fontSize:11, color:T.textSm}}>{alocHoje.length} {alocHoje.length === 1 ? "alocação" : "alocações"}</p>
                </div>
              </div>
              <Button T={T} variant="ghost" size="sm" icon={ArrowRight} onClick={() => onEnter("escala")}>Ver grade</Button>
            </div>
            <div style={{padding: alocHoje.length ? 0 : undefined}}>
              {alocHoje.length === 0 ? (
                <EmptyState
                  T={T}
                  icon={CalendarDays}
                  title="Dia livre"
                  message="Nenhum prestador alocado para hoje."
                />
              ) : (
                <div style={{maxHeight:260, overflowY:"auto"}}>
                  {alocHoje.map(a => {
                    const forn = fornecedores.find(f => f.id === a.fornecedor_id);
                    const projeto = PROJETOS.find(p => p.id === a.projeto_id);
                    const cor = projeto?.cor || T.brand;
                    return (
                      <div key={a.id} style={{
                        display:"flex", alignItems:"center", gap:12,
                        padding:"12px 20px", borderBottom:`1px solid ${T.border}`,
                      }}>
                        <Avatar nome={forn?.nome || a.fornecedor_id} size={32}/>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontSize:13, fontWeight:600, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                            {forn?.nome || a.fornecedor_id}
                          </div>
                          <div style={{fontSize:11, color:T.textSm, display:"flex", gap:6, alignItems:"center"}}>
                            <span style={{
                              display:"inline-block", width:8, height:8, borderRadius:"50%",
                              background: cor,
                            }}/>
                            {a.projeto_nome || projeto?.nome || "?"}
                          </div>
                        </div>
                        <span className="num" style={{color:T.brand, fontSize:12, fontWeight:700}}>{fmt(a.valor)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Ações rápidas */}
          <Card T={T}>
            <div style={{padding:"18px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:10, alignItems:"center"}}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background: T.warning+"22", color: T.warning,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}><Sparkles size={16} strokeWidth={2.25}/></div>
              <div>
                <h3 style={{margin:0, fontSize:13, fontWeight:700, color:T.text}}>Ações rápidas</h3>
                <p style={{margin:"2px 0 0", fontSize:11, color:T.textSm}}>Atalhos principais</p>
              </div>
            </div>
            <div style={{padding:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <QuickAction T={T} icon={Calendar}   label="Grade Semanal"   hint="G" onClick={()=>onEnter("escala")}/>
              <QuickAction T={T} icon={Users}      label="Fornecedores"    hint="F" onClick={()=>onEnter("fornecedores")}/>
              <QuickAction T={T} icon={TrendingUp} label="Análise"         hint="A" onClick={()=>onEnter("analise")}/>
              <QuickAction T={T} icon={Upload}     label="Importar CSV"    hint="I" onClick={()=>onEnter("import")}/>
            </div>
            {semDados && (
              <div style={{padding:"12px 20px", borderTop:`1px solid ${T.border}`, background:T.brandSoft+"30"}}>
                <p style={{margin:0, fontSize:12, color:T.text}}>
                  💡 <strong>Dica:</strong> começa importando sua planilha atual pra popular o sistema rapidamente.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Cards de módulos (secundários) */}
        <div>
          <h3 style={{margin:"0 0 12px", fontSize:13, color:T.textSm, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase"}}>Todos os módulos</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {MODULOS.map(mod => (
              <button
                key={mod.id}
                onClick={() => onEnter(mod.id)}
                style={{
                  background: T.surface, border:`1px solid ${T.border}`, borderRadius: RADIUS.lg,
                  padding:16, cursor:"pointer", textAlign:"left",
                  display:"flex", gap:14, alignItems:"center",
                  transition:"border-color .15s, transform .15s",
                  color:T.text, fontFamily:"inherit",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.brandBorder; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{
                  width:42, height:42, borderRadius:10,
                  background: mod.corGrad, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:22,
                }}>{mod.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, color:T.text}}>{mod.nome}</div>
                  <div style={{fontSize:11, color:T.textSm, marginTop:2, lineHeight:1.4}}>{mod.descricao}</div>
                </div>
                <ArrowRight size={14} color={T.textSm}/>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginTop:48, paddingTop:20, borderTop:`1px solid ${T.border}`,
          textAlign:"center", color:T.textSm, fontSize:11, letterSpacing:"0.04em",
        }}>
          {APP_NAME} · {APP_SUBTITLE}
        </div>
      </main>
    </div>
  );
}

function QuickAction({ T, icon: Icon, label, hint, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:T.surfaceAlt || T.bg, border:`1px solid ${T.border}`, borderRadius:10,
      padding:"12px 14px", cursor:"pointer", fontFamily:"inherit",
      display:"flex", alignItems:"center", gap:10,
      transition:"border-color .15s, background .15s",
      color:T.text, textAlign:"left",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.brandBorder; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
    >
      <div style={{
        width:30, height:30, borderRadius:8,
        background:T.brandSoft, color:T.brand,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}><Icon size={14} strokeWidth={2.25}/></div>
      <span style={{flex:1, fontSize:13, fontWeight:600}}>{label}</span>
      {hint && (
        <kbd style={{
          background:T.bg, border:`1px solid ${T.border}`,
          padding:"2px 6px", fontSize:10, borderRadius:4,
          color:T.textSm, fontFamily:"'JetBrains Mono',monospace",
        }}>{hint}</kbd>
      )}
    </button>
  );
}
