// ─── IMPORT DA PLANILHA ───────────────────────────────────────────────────────
// Cola o CSV da planilha Excel → parser extrai alocações (escala eventual) e
// pacotes mensais, dedupa fornecedores, mostra preview e aplica via Supabase.

import { useState, useEffect } from "react";
import { Card, SectionHeader, Stat, Badge, Button, IconButton } from "./ui";
import { RADIUS } from "../constants";
import { fmt } from "../utils";
import { FUNCOES, FORNECEDORES } from "../data/seed";
import { getState, setState as setSupabaseState, supabaseConfigured } from "../lib/supabase";
import {
  ArrowLeft, Sun, Moon, Upload, FileText, CheckCircle2, AlertCircle, Database,
} from "lucide-react";
import { importarEscala, importarPacotes } from "../lib/csvImport";

const KEY_FORNECED  = "escala_fornecedores";
const KEY_ALOCACOES = "escala_alocacoes";
const KEY_PACOTES   = "escala_pacotes";

export default function ImportCSV({ onBack, T, darkMode, setDarkMode }) {
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [funcoes, setFuncoes] = useState(FUNCOES);
  const [fornecedoresAtuais, setFornecedoresAtuais] = useState(FORNECEDORES);

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured) return;
      const fo = await getState(KEY_FORNECED);
      if (fo) setFornecedoresAtuais(fo);
    }
    load();
  }, []);

  function analisar() {
    setErro(""); setSucesso("");
    try {
      const escala   = importarEscala(texto);
      const pacotes  = importarPacotes(texto);

      // Preencher valor das alocações pela diária da função
      escala.alocacoes.forEach(a => {
        const f = funcoes.find(fn => fn.id === a.funcao_id);
        if (f) a.valor = f.diaria;
      });

      // Mesclar fornecedores de ambos
      const fornMap = {};
      [...escala.fornecedoresEncontrados, ...pacotes.fornecedoresEncontrados].forEach(f => {
        if (!fornMap[f.id]) fornMap[f.id] = f;
        else {
          // mesclar whatsapp/função
          if (!fornMap[f.id].whatsapp && f.whatsapp) fornMap[f.id].whatsapp = f.whatsapp;
          if (!fornMap[f.id].funcao_id && f.funcao_id) fornMap[f.id].funcao_id = f.funcao_id;
        }
      });

      setPreview({
        alocacoes: escala.alocacoes,
        pacotes: pacotes.pacotes,
        fornecedores: Object.values(fornMap),
      });
    } catch (err) {
      setErro("Erro ao analisar CSV: " + err.message);
    }
  }

  async function aplicar() {
    if (!preview) return;
    if (!supabaseConfigured) {
      setErro("Supabase não configurado — configure o .env para persistir");
      return;
    }
    try {
      // Merge fornecedores (novo + existente)
      const fornMap = {};
      fornecedoresAtuais.forEach(f => { fornMap[f.id] = f; });
      preview.fornecedores.forEach(f => {
        fornMap[f.id] = { ...fornMap[f.id], ...f };
      });
      const novosForn = Object.values(fornMap);

      // Merge alocações (dedupe por id)
      const alocAtuais = (await getState(KEY_ALOCACOES)) || [];
      const alocMap = {};
      alocAtuais.forEach(a => { alocMap[a.id] = a; });
      preview.alocacoes.forEach(a => { alocMap[a.id] = a; });
      const novasAloc = Object.values(alocMap);

      // Merge pacotes
      const pacAtuais = (await getState(KEY_PACOTES)) || [];
      const pacMap = {};
      pacAtuais.forEach(p => { pacMap[p.id] = p; });
      preview.pacotes.forEach(p => { pacMap[p.id] = p; });
      const novosPac = Object.values(pacMap);

      await Promise.all([
        setSupabaseState(KEY_FORNECED, novosForn),
        setSupabaseState(KEY_ALOCACOES, novasAloc),
        setSupabaseState(KEY_PACOTES, novosPac),
      ]);
      setSucesso(`Importação concluída: ${preview.alocacoes.length} alocações, ${preview.pacotes.length} pacotes, ${preview.fornecedores.length} fornecedores.`);
      setPreview(null);
      setTexto("");
    } catch (err) {
      setErro("Erro ao aplicar: " + err.message);
    }
  }

  function carregarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTexto(String(reader.result));
    reader.readAsText(file);
  }

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
              background:T.textMd+"22", border:`1px solid ${T.textMd}55`, color:T.textMd,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Upload size={20} strokeWidth={2.25}/>
            </div>
            <div>
              <p style={{color:T.textMd, fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", margin:"0 0 3px", fontWeight:700}}>Importação</p>
              <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.02em"}}>Importar Planilha CSV</h1>
              <p style={{color:T.textMd, fontSize:12, margin:"4px 0 0"}}>Cole o conteúdo da planilha Excel (em CSV) ou carregue um arquivo</p>
            </div>
          </div>
        </div>

        <div style={{padding:"24px 32px", display:"flex", flexDirection:"column", gap:20}}>
          <Card T={T}>
            <SectionHeader T={T} title="Etapa 1 — Entrada" subtitle="Salve a planilha como CSV (separador vírgula) e cole aqui" icon={FileText}/>
            <div style={{padding:16, display:"flex", flexDirection:"column", gap:12}}>
              <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.brand, fontSize:13, fontWeight:600}}>
                <Upload size={14}/>
                <span>Carregar arquivo .csv</span>
                <input type="file" accept=".csv,text/csv" onChange={carregarArquivo} style={{display:"none"}}/>
              </label>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Cole o CSV aqui..."
                rows={10}
                style={{
                  width:"100%", boxSizing:"border-box",
                  background:T.bg, border:`1px solid ${T.border}`, borderRadius:8,
                  color:T.text, padding:12, fontSize:12,
                  fontFamily:"'JetBrains Mono', monospace",
                  resize:"vertical",
                }}
              />
              <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
                <Button T={T} variant="secondary" onClick={() => { setTexto(""); setPreview(null); setErro(""); setSucesso(""); }}>Limpar</Button>
                <Button T={T} icon={Database} onClick={analisar} disabled={!texto.trim()}>Analisar CSV</Button>
              </div>
            </div>
          </Card>

          {erro && (
            <Card T={T} style={{borderColor:T.danger}}>
              <div style={{padding:16, display:"flex", gap:10, alignItems:"flex-start", color:T.danger}}>
                <AlertCircle size={16}/>
                <p style={{margin:0, fontSize:13}}>{erro}</p>
              </div>
            </Card>
          )}

          {sucesso && (
            <Card T={T} style={{borderColor:T.success}}>
              <div style={{padding:16, display:"flex", gap:10, alignItems:"flex-start", color:T.success}}>
                <CheckCircle2 size={16}/>
                <p style={{margin:0, fontSize:13}}>{sucesso}</p>
              </div>
            </Card>
          )}

          {preview && (
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
                <Stat T={T} label="Alocações Detectadas" value={String(preview.alocacoes.length)} sub="Diárias eventuais" color={T.info} icon={FileText}/>
                <Stat T={T} label="Pacotes Mensais" value={String(preview.pacotes.length)} sub="Contratos PJ" color={T.success} icon={CheckCircle2}/>
                <Stat T={T} label="Fornecedores" value={String(preview.fornecedores.length)} sub="Novos ou existentes" color={T.brand} icon={Database}/>
              </div>

              <Card T={T}>
                <SectionHeader T={T} title="Etapa 2 — Preview" subtitle="Conferir antes de aplicar" icon={Database}
                  right={<Button T={T} icon={CheckCircle2} onClick={aplicar}>Aplicar importação</Button>}/>
                <div style={{padding:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
                  <div>
                    <h4 style={{color:T.textMd, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 8px"}}>Alocações ({preview.alocacoes.length})</h4>
                    <div style={{maxHeight:260, overflowY:"auto", border:`1px solid ${T.border}`, borderRadius:8}}>
                      {preview.alocacoes.slice(0, 100).map((a,i) => (
                        <div key={i} style={{padding:"6px 12px", fontSize:11, borderBottom:`1px solid ${T.border}`, color:T.textMd}}>
                          <span style={{color:T.text, fontWeight:600}}>{a.fornecedor_id}</span> · {a.data} · {a.projeto_nome} · <span style={{color:T.brand}}>{fmt(a.valor)}</span>
                        </div>
                      ))}
                      {preview.alocacoes.length > 100 && (
                        <div style={{padding:"6px 12px", fontSize:11, color:T.textSm, textAlign:"center"}}>+ {preview.alocacoes.length - 100} a mais</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 style={{color:T.textMd, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 8px"}}>Fornecedores ({preview.fornecedores.length})</h4>
                    <div style={{maxHeight:260, overflowY:"auto", border:`1px solid ${T.border}`, borderRadius:8}}>
                      {preview.fornecedores.slice(0, 50).map((f,i) => (
                        <div key={i} style={{padding:"6px 12px", fontSize:11, borderBottom:`1px solid ${T.border}`, color:T.textMd}}>
                          <span style={{color:T.text, fontWeight:600}}>{f.nome}</span> · {f.funcao_id || "?"} · {f.whatsapp || "s/ contato"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
