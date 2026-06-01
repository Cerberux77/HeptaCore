import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CircleDot,
  Clock3,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { agentCouncil, automationModes, mvpModules } from "@heptacore/agents";

const signals = ["mercado", "audiencia", "producto", "competencia", "contenido", "interaccion", "bloqueos"];

const stages = [
  {
    title: "Replantea la oferta",
    text: "Define nicho, promesa prudente, objeciones, diferenciadores y mensajes de venta antes de producir contenido."
  },
  {
    title: "Prioriza los canales",
    text: "Recomienda IG, FB, TikTok, YouTube, LinkedIn o X por impacto y urgencia sin bloquear el arranque."
  },
  {
    title: "Opera con aprobacion",
    text: "Genera drafts, respuestas, campanas y reportes con trazabilidad y gates humanos en acciones sensibles."
  }
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="HeptaCore home">
          <span className="mark mark-small" aria-hidden="true" />
          <span>H E P T A C O R E</span>
        </a>
        <nav aria-label="Principal">
          <a href="#system">Sistema</a>
          <a href="#agents">Agentes</a>
          <a href="#mvp">MVP</a>
        </nav>
        <a className="icon-button" href="#onboarding" aria-label="Ver flujo">
          <ArrowRight size={18} />
        </a>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Inteligencia multidimensional + gestion de RRSS</div>
          <h1>HeptaCore</h1>
          <p>
            El nucleo operativo para conectar cada negocio con su publico especifico:
            estrategia, contenido, campanas, respuestas, leads y reportes en una sola
            plataforma multi-cliente.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#onboarding">
              <span>Explorar plataforma</span>
              <ArrowRight size={17} />
            </a>
            <a className="secondary-action" href="#mvp">Ver arquitectura MVP</a>
          </div>
        </div>

        <div className="signal-field" aria-label="Mapa de senales HeptaCore">
          <span className="mark mark-hero" aria-hidden="true" />
          {signals.map((signal, index) => (
            <span key={signal} className={`signal signal-${index + 1}`}>
              <CircleDot size={12} />
              {signal}
            </span>
          ))}
        </div>
      </section>

      <section id="system" className="section system-band">
        <div className="section-heading">
          <span>01 / Sistema</span>
          <h2>De insumos dispersos a operacion de marketing continua.</h2>
        </div>
        <div className="stage-grid">
          {stages.map((stage) => (
            <article className="stage-card" key={stage.title}>
              <Check size={18} />
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="agents" className="section split-section">
        <div>
          <span className="section-label">02 / Consejo y agentes</span>
          <h2>El bot es el nucleo, no una funcion secundaria.</h2>
          <p>
            HeptaCore organiza agentes especializados para estrategia, calendario,
            contenido, respuesta comunitaria, analitica, campanas, leads y compliance.
            Cada accion queda vinculada a tenant, fuente, aprobacion y modo operativo.
          </p>
        </div>
        <div className="agent-list">
          {agentCouncil.slice(0, 6).map((agent) => (
            <article className="agent-row" key={agent.role}>
              <span>{agent.role}</span>
              <p>{agent.output}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="onboarding" className="section dashboard-preview">
        <div className="panel command-panel">
          <div className="panel-header">
            <span className="mark mark-tiny" aria-hidden="true" />
            <strong>Turpial tenant demo</strong>
            <span className="status-dot">Sistema activo</span>
          </div>
          <div className="metrics">
            <div>
              <span>Drafts</span>
              <strong>30</strong>
            </div>
            <div>
              <span>Assets</span>
              <strong>44+</strong>
            </div>
            <div>
              <span>Bloqueos</span>
              <strong>5</strong>
            </div>
          </div>
          <div className="timeline">
            <span />
          </div>
        </div>

        <div className="panel checklist-panel">
          <h2>Landing de carga y tracking</h2>
          <ul>
            <li><ShieldCheck size={17} /> Minimos para arrancar por red</li>
            <li><Radio size={17} /> Recomendaciones por prioridad e impacto</li>
            <li><LockKeyhole size={17} /> OAuth y secretos aislados por cliente</li>
            <li><BarChart3 size={17} /> Reportes diarios/semanales por canal</li>
          </ul>
        </div>
      </section>

      <section id="mvp" className="section mvp-section">
        <div className="section-heading">
          <span>03 / MVP</span>
          <h2>Construido para operar 24/7 con limites claros.</h2>
        </div>
        <div className="module-grid">
          {mvpModules.map((module) => (
            <article key={module.name}>
              <Activity size={16} />
              <h3>{module.name}</h3>
              <p>{module.purpose}</p>
            </article>
          ))}
        </div>
        <div className="mode-strip">
          {automationModes.map((mode) => (
            <span key={mode}>{mode}</span>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span>H E P T A C O R E</span>
        <span><Clock3 size={15} /> Operacion continua con aprobacion humana en acciones sensibles.</span>
        <span><Workflow size={15} /> Turpial Sound / Marketplace importado como primer tenant.</span>
      </footer>
    </main>
  );
}
