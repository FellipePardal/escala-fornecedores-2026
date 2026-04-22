import { useState } from "react";
import { DARK, LIGHT, LS_DARK, LS_AUTH, ACCESS_PIN, APP_NAME } from "./constants";
import { lsGet, lsSet } from "./utils";
import { Lock } from "lucide-react";
import Home from "./components/Home";
import Escala from "./components/Escala";
import Fornecedores from "./components/Fornecedores";
import Analise from "./components/Analise";
import ImportCSV from "./components/ImportCSV";

function LoginGate({ onAuth, T }) {
  const [pin, setPin]   = useState("");
  const [erro, setErro] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (pin === ACCESS_PIN) {
      lsSet(LS_AUTH, true);
      onAuth();
    } else {
      setErro(true);
      setTimeout(() => setErro(false), 2000);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <div style={{width:"100%",maxWidth:400,padding:32}}>
        <div style={{
          width:56,height:56,borderRadius:16,
          background:"linear-gradient(135deg,#059669,#10b981)",
          display:"flex",alignItems:"center",justifyContent:"center",
          margin:"0 auto 24px",
          boxShadow:"0 8px 24px rgba(16,185,129,0.35)",
        }}>
          <Lock size={26} color="#fff" strokeWidth={2.25}/>
        </div>
        <h1 style={{textAlign:"center",fontSize:22,fontWeight:800,color:T.text,margin:"0 0 6px",letterSpacing:"-0.02em"}}>{APP_NAME}</h1>
        <p style={{textAlign:"center",color:T.textMd,fontSize:13,margin:"0 0 28px"}}>Acesso restrito — insira o código de acesso</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Código de acesso"
            autoFocus
            style={{
              width:"100%",boxSizing:"border-box",
              background:T.card,border:`1px solid ${erro ? (T.danger||"#ef4444") : T.muted}`,
              borderRadius:10,padding:"12px 16px",fontSize:15,color:T.text,
              fontFamily:"'Inter',sans-serif",textAlign:"center",letterSpacing:"0.1em",
              transition:"border-color 0.2s",
            }}
          />
          {erro && <p style={{color:T.danger||"#ef4444",fontSize:12,textAlign:"center",margin:"8px 0 0",fontWeight:600}}>Código incorreto</p>}
          <button type="submit" style={{
            width:"100%",marginTop:16,
            background:"linear-gradient(135deg,#047857,#059669)",
            color:"#fff",border:"none",borderRadius:10,padding:"12px",
            cursor:"pointer",fontWeight:700,fontSize:14,
            boxShadow:"0 4px 14px rgba(5,150,105,0.35)",
          }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => lsGet(LS_DARK, true));
  const [pagina,   setPagina]   = useState("home");
  const [authed,   setAuthed]   = useState(() => lsGet(LS_AUTH, false));
  const T = darkMode ? DARK : LIGHT;

  const toggleDark = v => {
    const next = typeof v === "function" ? v(darkMode) : v;
    setDarkMode(next); lsSet(LS_DARK, next);
  };

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} T={T}/>;

  const common = { onBack: () => setPagina("home"), T, darkMode, setDarkMode: toggleDark };

  if (pagina === "escala")       return <Escala {...common}/>;
  if (pagina === "fornecedores") return <Fornecedores {...common}/>;
  if (pagina === "analise")      return <Analise {...common}/>;
  if (pagina === "import")       return <ImportCSV {...common}/>;

  return <Home onEnter={setPagina} T={T} darkMode={darkMode} setDarkMode={toggleDark}/>;
}
