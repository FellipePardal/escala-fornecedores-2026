import { RADIUS, APP_NAME, APP_SUBTITLE } from "../constants";
import { MODULOS } from "../data/seed";
import { Card, Stat, Button, Badge } from "./ui";
import {
  LayoutDashboard, Sun, Moon, ArrowRight, Activity, Sparkles, Package,
} from "lucide-react";

export default function Home({ onEnter, T, darkMode, setDarkMode }) {
  const ativos = MODULOS.filter(m => !m.emBreve).length;
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header style={{
        background: T.surface || T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "saturate(180%) blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: T.gradBrand || "linear-gradient(135deg,#059669,#10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
          }}>
            <LayoutDashboard size={20} color="#fff" strokeWidth={2.25} />
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
            Online
          </Badge>
          <Button
            T={T}
            variant="secondary"
            size="sm"
            icon={darkMode ? Sun : Moon}
            onClick={() => setDarkMode(d => !d)}
          >
            {darkMode ? "Claro" : "Escuro"}
          </Button>
        </div>
      </header>

      {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
      <main style={{ padding: "40px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <p style={{
            color: T.brand || "#10b981", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 8px",
          }}>Visão Geral</p>
          <h2 style={{
            fontSize: 28, fontWeight: 800, color: T.text, margin: "0 0 8px",
            letterSpacing: "-0.025em",
          }}>Painel de módulos</h2>
          <p style={{ color: T.textMd, fontSize: 14, margin: 0, maxWidth: 640 }}>
            Ponto de partida para dashboards corporativos. Duplique um módulo, ajuste a regra de negócio e publique.
          </p>
        </div>

        {/* KPIs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16, marginBottom: 40,
        }}>
          <Stat T={T} label="Módulos Ativos" value={String(ativos)} sub={`de ${MODULOS.length} cadastrados`} color={T.brand} icon={Package} />
          <Stat T={T} label="Stack"          value="React + Vite" sub="Supabase realtime" color={T.info} icon={Sparkles} />
          <Stat T={T} label="Status"         value="Pronto"       sub="Configure e publique"  color="#a855f7" icon={Activity} />
        </div>

        {/* Section header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16,
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: 16, color: T.text, fontWeight: 700,
              letterSpacing: "-0.01em",
            }}>Módulos</h3>
            <p style={{ color: T.textSm, fontSize: 12, margin: "2px 0 0" }}>
              {MODULOS.length} {MODULOS.length === 1 ? "módulo cadastrado" : "módulos cadastrados"}
            </p>
          </div>
        </div>

        {/* Cards de módulos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 20,
        }}>
          {MODULOS.map(mod => (
            <Card
              key={mod.id}
              T={T}
              hoverable={!mod.emBreve}
              style={{
                opacity: mod.emBreve ? 0.65 : 1,
                cursor: mod.emBreve ? "not-allowed" : "pointer",
              }}
            >
              <div style={{
                background: mod.corGrad,
                padding: "22px 24px 20px",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 160, height: 160, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)",
                  pointerEvents: "none",
                }}/>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", position: "relative", gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 32, lineHeight: 1, display: "block", marginBottom: 12 }}>{mod.icon}</span>
                    <h4 style={{
                      margin: "0 0 4px", fontSize: 18, fontWeight: 700,
                      color: "#fff", letterSpacing: "-0.015em",
                    }}>{mod.nome}</h4>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                      {mod.descricao}
                    </p>
                  </div>
                  <span style={{
                    background: mod.statusColor + "22",
                    color: mod.statusColor === "#22c55e" ? "#86efac" : mod.statusColor,
                    border: `1px solid ${mod.statusColor}55`,
                    borderRadius: RADIUS.pill,
                    padding: "4px 10px", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>{mod.status}</span>
                </div>
              </div>

              <div style={{ padding: "18px 24px 22px" }}>
                <Button
                  T={T}
                  variant={mod.emBreve ? "secondary" : "primary"}
                  size="md"
                  fullWidth
                  disabled={mod.emBreve}
                  icon={ArrowRight}
                  onClick={() => !mod.emBreve && onEnter(mod.id)}
                >
                  {mod.emBreve ? "Em breve" : "Abrir módulo"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div style={{
          marginTop: 56, paddingTop: 24, borderTop: `1px solid ${T.border}`,
          textAlign: "center", color: T.textSm, fontSize: 11, letterSpacing: "0.04em",
        }}>
          {APP_NAME} · Template base reutilizável
        </div>
      </main>
    </div>
  );
}
