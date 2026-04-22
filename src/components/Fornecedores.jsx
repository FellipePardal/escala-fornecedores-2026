// ─── CADASTRO DE FORNECEDORES ─────────────────────────────────────────────────
// CRUD de prestadores com busca, filtro por função, link WhatsApp e histórico
// de alocações (diárias feitas).

import { useState, useEffect, useMemo } from "react";
import { Card, SectionHeader, Stat, Badge, Button, Chip, IconButton } from "./ui";
import { RADIUS } from "../constants";
import { fmt } from "../utils";
import { FUNCOES, FORNECEDORES } from "../data/seed";
import { getState, setState as setSupabaseState, supabase, supabaseConfigured } from "../lib/supabase";
import {
  ArrowLeft, Sun, Moon, Users, Plus, Trash2, Pencil, Search,
  MessageCircle, Save, X, Phone,
} from "lucide-react";
import { whatsappLink, mesDeISO } from "../lib/escala";

const KEY_FORNECED  = "escala_fornecedores";
const KEY_FUNCOES   = "escala_funcoes";
const KEY_ALOCACOES = "escala_alocacoes";

const TIPOS = [
  { value:"eventual", label:"Eventual (Diária)" },
  { value:"pacote",   label:"Pacote PJ" },
];

export default function Fornecedores({ onBack, T, darkMode, setDarkMode }) {
  const [fornecedores, setFornecedoresRaw] = useState(FORNECEDORES);
  const [funcoes, setFuncoesRaw]           = useState(FUNCOES);
  const [alocacoes, setAlocacoesRaw]       = useState([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca]           = useState("");
  const [filtroFunc, setFiltroFunc] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [edit, setEdit] = useState(null); // objeto sendo editado (ou "novo")

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured) { setLoading(false); return; }
      const [fo, fu, al] = await Promise.all([getState(KEY_FORNECED), getState(KEY_FUNCOES), getState(KEY_ALOCACOES)]);
      if (fo) setFornecedoresRaw(fo); else setSupabaseState(KEY_FORNECED, FORNECEDORES);
      if (fu) setFuncoesRaw(fu);       else setSupabaseState(KEY_FUNCOES, FUNCOES);
      if (al) setAlocacoesRaw(al);
      setLoading(false);
    }
    load();
    if (!supabaseConfigured) return;
    const channel = supabase.channel('forn_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, payload => {
        if (payload.new.key === KEY_FORNECED)   setFornecedoresRaw(payload.new.value);
        if (payload.new.key === KEY_FUNCOES)    setFuncoesRaw(payload.new.value);
        if (payload.new.key === KEY_ALOCACOES)  setAlocacoesRaw(payload.new.value);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const setFornecedores = fn => setFornecedoresRaw(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    setSupabaseState(KEY_FORNECED, next);
    return next;
  });

  // Histórico por fornecedor (nº de diárias e valor total)
  const statsPorForn = useMemo(() => {
    const map = {};
    alocacoes.forEach(a => {
      if (!a.fornecedor_id) return;
      if (!map[a.fornecedor_id]) map[a.fornecedor_id] = { diarias:0, valor:0, meses:new Set() };
      map[a.fornecedor_id].diarias += 1;
      map[a.fornecedor_id].valor += Number(a.valor || 0);
      const m = mesDeISO(a.data); if (m) map[a.fornecedor_id].meses.add(m);
    });
    return map;
  }, [alocacoes]);

  const lista = useMemo(() => {
    return fornecedores.filter(f => {
      if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroFunc !== "todas" && f.funcao_id !== filtroFunc) return false;
      if (filtroTipo !== "todos" && f.tipo !== filtroTipo) return false;
      return true;
    });
  }, [fornecedores, busca, filtroFunc, filtroTipo]);

  function salvar(f) {
    setFornecedores(prev => {
      const existe = prev.some(p => p.id === f.id);
      return existe ? prev.map(p => p.id === f.id ? f : p) : [...prev, f];
    });
    setEdit(null);
  }

  function remover(id) {
    if (!confirm("Remover este fornecedor?")) return;
    setFornecedores(prev => prev.filter(p => p.id !== id));
  }

  function abrirNovo() {
    setEdit({
      id: `novo_${Date.now()}`,
      nome: "",
      whatsapp: "",
      funcao_id: funcoes[0]?.id || "",
      tipo: "eventual",
    });
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,display:"flex"}}>
      <aside style={{
        width:72, minHeight:"100vh", background: T.gradSidebar,
        borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column", alignItems:"center",
        paddingTop:16, paddingBottom:16, gap:6, flexShrink:0,
        position:"sticky", top:0, height:"100vh",
      }}>
        <button onClick={onBack} title="Voltar" style={{
          width:44, height:44, borderRadius:12, border:"none", cursor:"pointer",
          background:"linear-gradient(135deg,#059669,#10b981)",
          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
          marginBottom:14, boxShadow:"0 6px 16px rgba(16,185,129,0.35)",
        }}>
          <ArrowLeft size={18} strokeWidth={2.25}/>
        </button>
        <div style={{ flex:1 }}/>
        <IconButton icon={darkMode ? Sun : Moon} onClick={()=>setDarkMode(d=>!d)} size={40} T={T}/>
      </aside>

      <div style={{flex:1, minWidth:0, paddingBottom:40}}>
        <div style={{background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"20px 32px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap"}}>
            <div style={{display:"flex", gap:14, alignItems:"center"}}>
              <div style={{
                width:42, height:42, borderRadius:12,
                background:T.info+"22", border:`1px solid ${T.info}55`, color:T.info,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Users size={20} strokeWidth={2.25}/>
              </div>
              <div>
                <p style={{color:T.info, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", margin:"0 0 3px", fontWeight:700}}>Cadastro</p>
                <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.02em"}}>Fornecedores</h1>
                <p style={{color:T.textMd, fontSize:12, margin:"4px 0 0"}}>{fornecedores.length} prestadores cadastrados</p>
              </div>
            </div>
            <Button T={T} icon={Plus} onClick={abrirNovo}>Novo Fornecedor</Button>
          </div>
        </div>

        <div style={{padding:"24px 32px"}}>
          {/* Filtros */}
          <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, alignItems:"center"}}>
            <div style={{display:"flex", alignItems:"center", gap:8, background:T.surface, border:`1px solid ${T.border}`, borderRadius:RADIUS.md, padding:"8px 12px", minWidth:260}}>
              <Search size={14} color={T.textSm}/>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome..."
                style={{border:"none", outline:"none", background:"transparent", color:T.text, fontSize:13, flex:1, fontFamily:"inherit"}}/>
            </div>
            <select value={filtroFunc} onChange={e=>setFiltroFunc(e.target.value)} style={selStyle(T)}>
              <option value="todas">Todas as funções</option>
              {funcoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <div style={{display:"flex", gap:6}}>
              <Chip T={T} active={filtroTipo==="todos"}    onClick={()=>setFiltroTipo("todos")}>Todos</Chip>
              <Chip T={T} active={filtroTipo==="eventual"} onClick={()=>setFiltroTipo("eventual")}>Eventual</Chip>
              <Chip T={T} active={filtroTipo==="pacote"}   onClick={()=>setFiltroTipo("pacote")}>Pacote</Chip>
            </div>
            <span style={{color:T.textSm, fontSize:12, marginLeft:"auto"}}>{lista.length} resultado(s)</span>
          </div>

          {/* Tabela */}
          <Card T={T}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", minWidth:900}}>
                <thead>
                  <tr style={{background:T.surfaceAlt}}>
                    <th style={thStyle(T, "left")}>Nome</th>
                    <th style={thStyle(T, "left")}>Função</th>
                    <th style={thStyle(T, "left")}>Tipo</th>
                    <th style={thStyle(T, "left")}>WhatsApp</th>
                    <th style={thStyle(T, "right")}>Diárias</th>
                    <th style={thStyle(T, "right")}>Valor Total</th>
                    <th style={thStyle(T, "right")}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(f => {
                    const funcao = funcoes.find(x => x.id === f.funcao_id);
                    const stats = statsPorForn[f.id] || { diarias:0, valor:0 };
                    return (
                      <tr key={f.id} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{...tdStyle(T), fontWeight:600}}>{f.nome}</td>
                        <td style={tdStyle(T)}>
                          <Badge T={T} color={funcao?.grupo === "coordenacao" ? "#a855f7" : T.brand} size="sm">
                            {funcao?.nome || "—"}
                          </Badge>
                        </td>
                        <td style={tdStyle(T)}>
                          <Badge T={T} color={f.tipo === "pacote" ? T.info : T.textMd} size="sm" variant="soft">
                            {f.tipo === "pacote" ? "Pacote" : "Eventual"}
                          </Badge>
                        </td>
                        <td style={tdStyle(T)}>
                          {f.whatsapp ? (
                            <a href={whatsappLink(f.whatsapp)} target="_blank" rel="noreferrer" style={{color:T.brand, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4, fontSize:12}}>
                              <MessageCircle size={12}/>
                              {f.whatsapp}
                            </a>
                          ) : <span style={{color:T.textSm, fontSize:12}}>—</span>}
                        </td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right"}}>{stats.diarias}</td>
                        <td className="num" style={{...tdStyle(T), textAlign:"right", color:stats.valor?T.text:T.textSm}}>{fmt(stats.valor)}</td>
                        <td style={{...tdStyle(T), textAlign:"right"}}>
                          <div style={{display:"inline-flex", gap:6}}>
                            <button onClick={()=>setEdit(f)} title="Editar" style={actBtn(T)}>
                              <Pencil size={12}/>
                            </button>
                            <button onClick={()=>remover(f.id)} title="Remover" style={{...actBtn(T), color:T.danger}}>
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {lista.length === 0 && (
                    <tr><td colSpan={7} style={{padding:"28px 16px", textAlign:"center", color:T.textSm}}>Nenhum fornecedor encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {edit && (
        <ModalForn T={T} funcoes={funcoes} forn={edit} onSave={salvar} onClose={()=>setEdit(null)}/>
      )}
    </div>
  );
}

function ModalForn({ T, funcoes, forn, onSave, onClose }) {
  const [f, setF] = useState(forn);
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.surface, border:`1px solid ${T.border}`, borderRadius:RADIUS.lg,
        width:"100%", maxWidth:480, padding:24,
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18}}>
          <h2 style={{margin:0, color:T.text, fontSize:16, fontWeight:700}}>{forn.nome ? "Editar" : "Novo"} Fornecedor</h2>
          <button onClick={onClose} style={{background:"transparent", border:"none", color:T.textMd, cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          <Field T={T} label="Nome">
            <input value={f.nome} onChange={e=>setF({...f, nome:e.target.value})} style={inpStyle(T)}/>
          </Field>
          <Field T={T} label="Função">
            <select value={f.funcao_id} onChange={e=>setF({...f, funcao_id:e.target.value})} style={inpStyle(T)}>
              {funcoes.map(fn => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
            </select>
          </Field>
          <Field T={T} label="Tipo">
            <select value={f.tipo} onChange={e=>setF({...f, tipo:e.target.value})} style={inpStyle(T)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field T={T} label="WhatsApp (ex: 5521999999999)">
            <input value={f.whatsapp} onChange={e=>setF({...f, whatsapp:e.target.value.replace(/\D/g,"")})} style={inpStyle(T)}/>
          </Field>
        </div>
        <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:20}}>
          <Button T={T} variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button T={T} icon={Save} onClick={()=>f.nome && onSave(f)}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ T, label, children }) => (
  <div>
    <label style={{color:T.textMd, fontSize:11, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase", display:"block", marginBottom:6}}>{label}</label>
    {children}
  </div>
);

const thStyle = (T, align="left") => ({
  padding:"11px 14px", color:T.textSm, fontSize:10, fontWeight:700,
  letterSpacing:"0.06em", textTransform:"uppercase",
  textAlign:align, whiteSpace:"nowrap",
  borderBottom:`1px solid ${T.border}`,
});
const tdStyle = (T) => ({ padding:"12px 14px", fontSize:13, color:T.text });
const selStyle = (T) => ({
  background:T.surface, border:`1px solid ${T.border}`, borderRadius:8,
  color:T.text, padding:"8px 12px", fontSize:13, fontFamily:"inherit", cursor:"pointer",
});
const inpStyle = (T) => ({
  width:"100%", boxSizing:"border-box",
  background:T.bg, border:`1px solid ${T.border}`, borderRadius:8,
  color:T.text, padding:"9px 12px", fontSize:13, fontFamily:"inherit",
});
const actBtn = (T) => ({
  width:28, height:28, border:`1px solid ${T.border}`, borderRadius:6, background:T.surface,
  color:T.textMd, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center",
});
