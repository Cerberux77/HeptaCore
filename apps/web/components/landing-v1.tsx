"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Clock3,
  CreditCard,
  FileCheck2,
  Layers3,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

const stats = [
  ["2 gratis", "publicaciones por red social"],
  ["4 IAs", "estrategia, contenido, respuesta y control"],
  ["6 redes", "Instagram, Facebook, TikTok, YouTube, LinkedIn y X"],
  ["100%", "supervision en acciones sensibles"],
] as const;

const features = [
  [Bot, "Estrategia con IA", "Convierte datos del negocio en posicionamiento, canales, calendario y tareas concretas."],
  [FileCheck2, "Drafts editables", "Genera copies, CTAs, hashtags y fechas; el operador puede editar antes de aprobar."],
  [ShieldCheck, "Gate humano", "Aprobacion explicita para publicar, pautar, responder o tocar acciones de riesgo."],
  [BarChart3, "Pulse reports", "Resume rendimiento, objeciones, oportunidades y siguiente accion recomendada."],
  [Layers3, "Multi-tenant", "Cada cliente trabaja aislado con roles, activos, cola y costos propios."],
  [CreditCard, "Costos claros", "Muestra consumo de IA, overhead y propuesta de activacion sin ocultar cargos."],
] as const;

const steps = [
  ["01", "Invitacion", "Solicitas acceso o recibes un link de registro para tu negocio."],
  ["02", "Diagnostico", "Cargas oferta, publico, redes, activos, tono y objetivo comercial."],
  ["03", "Operacion", "HeptaCore genera estrategia, calendario, drafts y checklist de assets."],
  ["04", "Control", "Apruebas, editas, publicas en dry-run o activas plan completo con trazabilidad."],
] as const;

const contacts = [
  [MessageCircle, "WhatsApp", "+58 416 801 7844", "https://wa.me/584168017844"],
  [Mail, "Email", "heptacore@turpialsound.com", "mailto:heptacore@turpialsound.com"],
  [MapPin, "Caracas", "Operacion remota y tenant Turpial Sound", "#top"],
] as const;

export function LandingV1({ loginHref = "/login" }: { loginHref?: string }) {
  return (
    <main className="hc-premium-landing" id="top">
      <header className="hc-premium-nav" aria-label="Principal">
        <a href="#top" className="hc-premium-brand" aria-label="HeptaCore inicio">
          <img src="/brand/heptacore-logo-horizontal.svg" alt="HeptaCore" />
        </a>
        <nav>
          <a href="#features">Sistema</a>
          <a href="#process">Proceso</a>
          <a href="#pricing">Precio</a>
          <a href="#contact">Contacto</a>
        </nav>
        <Link href={loginHref} className="hc-premium-login">Entrar a la consola</Link>
      </header>

      <section className="hc-premium-hero">
        <div className="hc-premium-hero-bg" aria-hidden="true" />
        <div className="hc-premium-hero-inner">
          <div className="hc-premium-hero-copy">
            <p className="hc-premium-kicker">Marketing AI operado con supervision humana</p>
            <h1>Marketing operado por inteligencia artificial</h1>
            <p>
              HeptaCore organiza estrategia, calendario, publicaciones, respuestas, assets, reportes y costos para
              que un negocio pueda operar sus redes con control real, no con promesas automaticas.
            </p>
            <div className="hc-premium-actions">
              <Link href={loginHref} className="hc-premium-primary">Entrar a la consola <ArrowRight size={18} /></Link>
              <a href="https://wa.me/584168017844" target="_blank" rel="noopener" className="hc-premium-secondary">
                Solicitar invitacion <UserPlus size={18} />
              </a>
            </div>
            <small>
              2 publicaciones gratis por red social. Sin gasto de campañas, scraping real ni publicacion real sin
              aprobacion explicita.
            </small>
          </div>

          <div className="hc-premium-console" aria-label="Resumen de consola HeptaCore">
            <div className="hc-console-top"><span>HeptaCore Console</span><strong>Trial activo</strong></div>
            <div className="hc-console-focus">
              <Sparkles size={22} />
              <div>
                <h2>Turpial Sound</h2>
                <p>Estrategia lista, 29 drafts, 46 assets, publicacion protegida.</p>
              </div>
            </div>
            <div className="hc-console-grid">
              <div><span>Pendientes</span><strong>8</strong></div>
              <div><span>Aprobados</span><strong>12</strong></div>
              <div><span>Assets</span><strong>46</strong></div>
              <div><span>Guardrails</span><strong>ON</strong></div>
            </div>
            <div className="hc-console-row"><Clock3 size={16} /><span>Proximo dry-run preparado</span><strong>09:30</strong></div>
            <div className="hc-console-row"><LockKeyhole size={16} /><span>Publicacion real</span><strong>por readiness</strong></div>
          </div>
        </div>
      </section>

      <section className="hc-premium-stats" aria-label="Indicadores">
        {stats.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="hc-premium-section" id="features">
        <div className="hc-premium-section-head">
          <p className="hc-premium-kicker">Sistema operativo de marketing</p>
          <h2>Una sola consola para estrategia, contenido, aprobacion y reporting.</h2>
        </div>
        <div className="hc-premium-feature-grid">
          {features.map(([Icon, title, copy]) => (
            <article key={title}><Icon size={24} /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section className="hc-premium-section hc-premium-process" id="process">
        <div className="hc-premium-section-head">
          <p className="hc-premium-kicker">De acceso a operacion</p>
          <h2>Cuatro pasos, sin esconder el control sensible.</h2>
        </div>
        <div className="hc-premium-steps">
          {steps.map(([n, title, copy]) => <article key={title}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="hc-premium-section" id="pricing">
        <div className="hc-premium-pricing">
          <div>
            <p className="hc-premium-kicker">Trial + activacion</p>
            <h2>Empieza con 2 publicaciones gratis por red social.</h2>
            <p>
              El trial permite probar el flujo completo con supervision. Despues, el paquete se activa con metodo de
              pago local o Binance Pay y revision manual del comprobante.
            </p>
          </div>
          <article>
            <span>desde</span>
            <strong>~$0.001</strong>
            <small>por ejecucion IA base, antes de overhead y segun modelo seleccionado</small>
            <ul>
              <li><Check size={16} /> Registro por invitacion</li>
              <li><Check size={16} /> Dashboard por rol</li>
              <li><Check size={16} /> Drafts, assets y calendario</li>
              <li><Check size={16} /> Publicacion real por red con aprobacion y credenciales</li>
            </ul>
            <Link href={loginHref} className="hc-premium-primary">Entrar a la consola <Send size={17} /></Link>
          </article>
        </div>
      </section>

      <section className="hc-premium-section hc-premium-contact" id="contact">
        <div className="hc-premium-section-head">
          <p className="hc-premium-kicker">Contacto</p>
          <h2>Activa el acceso y revisa el primer tenant con supervision.</h2>
        </div>
        <div className="hc-premium-contact-grid">
          {contacts.map(([Icon, title, value, href]) => (
            <a key={title} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener" : undefined}>
              <Icon size={22} /><span>{title}</span><strong>{value}</strong>
            </a>
          ))}
        </div>
      </section>

      <footer className="hc-premium-footer">
        <div><strong>HEPTACORE</strong><span>Inteligencia multidimensional para marketing operado.</span></div>
        <div><a href="#features">Sistema</a><a href="#process">Proceso</a><a href="#pricing">Precio</a></div>
        <div><Link href={loginHref}>Entrar a la consola</Link><a href="https://wa.me/584168017844" target="_blank" rel="noopener">WhatsApp</a></div>
      </footer>
    </main>
  );
}
