"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Layers,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const features = [
  [Bot, "Estrategia con IA", "Convierte oferta, audiencia y objetivos en pilares, voz de marca, calendario y tareas por red social."],
  [Layers, "Multi-tenant nativo", "Cada cliente opera con activos, cola, calendario, estrategia, costos y permisos aislados."],
  [Users, "Aprobacion humana", "El contenido sensible queda en cola de revision con roles, trazabilidad y control antes de ejecutar."],
  [ShieldCheck, "Readiness por red", "Publicacion, respuestas, pauta y scraping quedan bloqueados hasta cumplir condiciones explicitas."],
  [CalendarDays, "Calendario operativo", "Planifica publicaciones, reordena prioridades y mantiene checklist de assets por canal."],
  [BarChart3, "Reporting por cliente", "Resume actividad, pendientes, aprobaciones, costos y proximas acciones recomendadas."],
] as const;

const operatingModel = [
  ["Intake", "Captura oferta, publico, restricciones, canales, activos y objetivo comercial antes de generar estrategia."],
  ["Orquestacion", "Agentes de estrategia, contenido, QA y costos trabajan sobre el mismo estado del tenant."],
  ["Control", "Dry-run, approval queue, audit log y readiness gate mantienen cada accion sensible bajo supervision."],
] as const;

const signals = [
  ["6", "redes sociales"],
  ["4", "familias de IA"],
  ["1", "consola central"],
  ["0", "acciones reales sin gate"],
] as const;

export function CodexLanding({ loginHref = "/login" }: { loginHref?: string }) {
  return (
    <main className="codex-landing" id="top">
      <header className="codex-nav" aria-label="Principal">
        <a href="#top" className="codex-brand" aria-label="HeptaCore inicio">
          <img src="/brand/heptacore-logo-horizontal.svg" alt="HeptaCore" />
        </a>
        <nav>
          <a href="#platform">Plataforma</a>
          <a href="#model">Modelo</a>
          <a href="#control">Control</a>
          <a href="#contact">Contacto</a>
        </nav>
        <Link href={loginHref} className="codex-nav-action">
          Entrar <ArrowRight size={16} />
        </Link>
      </header>

      <section className="codex-hero">
        <div className="codex-hero-orbit" aria-hidden="true" />
        <div className="codex-hero-copy">
          <p className="codex-kicker"><Sparkles size={16} /> Inteligencia multidimensional para RRSS</p>
          <h1>Marketing con criterio, no con plantillas.</h1>
          <p>
            HeptaCore centraliza estrategia, contenido, aprobaciones, calendario, respuestas, costos y reporting por
            cliente. Una consola comercial para operar redes sociales con IA y supervision real.
          </p>
          <div className="codex-actions">
            <Link href={loginHref} className="codex-primary">Entrar a la consola <ArrowRight size={18} /></Link>
            <a href="#contact" className="codex-secondary">Solicitar acceso</a>
          </div>
        </div>

        <div className="codex-command" aria-label="Resumen operativo de HeptaCore">
          <div className="codex-command-head"><span>HeptaCore OS</span><strong>tenant-ready</strong></div>
          <div className="codex-command-core">
            <div><span>Pipeline</span><strong>Estrategia / Drafts / QA / Aprobacion</strong></div>
            <CheckCircle2 size={24} />
          </div>
          <div className="codex-command-grid">
            <div><span>Clientes</span><strong>Multi-tenant</strong></div>
            <div><span>Canales</span><strong>IG FB TT YT LI X</strong></div>
            <div><span>Modo</span><strong>Approval gate</strong></div>
            <div><span>Costos</span><strong>Uso trazable</strong></div>
          </div>
          <div className="codex-command-row">
            <Lock size={16} />
            <span>Sin publicar, pautar o scrapear sin aprobacion explicita.</span>
          </div>
        </div>
      </section>

      <section className="codex-signals" aria-label="Senales de plataforma">
        {signals.map(([value, label]) => (
          <div key={label}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </section>

      <section className="codex-section" id="platform">
        <div className="codex-section-head">
          <p className="codex-kicker">Plataforma</p>
          <h2>Gestion centralizada para marketing, RRSS y clientes.</h2>
        </div>
        <div className="codex-feature-grid">
          {features.map(([Icon, title, copy]) => (
            <article key={title}><Icon size={24} /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section className="codex-section codex-model" id="model">
        <div className="codex-section-head">
          <p className="codex-kicker">Modelo operativo</p>
          <h2>Del diagnostico del cliente a la ejecucion controlada.</h2>
        </div>
        <div className="codex-model-grid">
          {operatingModel.map(([title, copy], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="codex-section codex-control" id="control">
        <div>
          <p className="codex-kicker">Release-ready</p>
          <h2>Control comercial sin romper la operacion interna.</h2>
          <p>
            La landing publica abre la puerta al producto; la consola, dashboards, auth, APIs y datos operativos siguen
            viviendo en sus rutas internas. La experiencia publica no compite con la operacion.
          </p>
        </div>
        <ul>
          <li><Zap size={18} /> Onboarding y activacion por invitacion.</li>
          <li><ShieldCheck size={18} /> Bloqueos para acciones sensibles.</li>
          <li><BarChart3 size={18} /> Costos, reportes y estados por tenant.</li>
          <li><MessageCircle size={18} /> Contacto comercial por WhatsApp.</li>
        </ul>
      </section>

      <section className="codex-section codex-contact" id="contact">
        <div>
          <p className="codex-kicker">Contacto</p>
          <h2>Activa el acceso comercial a HeptaCore.</h2>
        </div>
        <div className="codex-contact-actions">
          <Link href={loginHref} className="codex-primary">Entrar a la consola</Link>
          <a href="https://wa.me/584168017844" target="_blank" rel="noopener noreferrer" className="codex-whatsapp">
            <MessageCircle size={18} /> WhatsApp +58 416 801 7844
          </a>
        </div>
      </section>

      <footer className="codex-footer">
        <strong>HEPTACORE</strong>
        <span>Sistema operativo de marketing AI multi-tenant.</span>
        <Link href={loginHref}>Consola</Link>
      </footer>
    </main>
  );
}
