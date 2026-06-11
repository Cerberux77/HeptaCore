import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const DEFAULT_TENANT = "turpial-sound";

export default async function Home() {
  const session = await auth();

  if (session) {
    if (session.user?.memberships?.some((m) => m.role === "SUPER_ADMIN")) {
      redirect("/admin");
    }
    redirect(`/tenant/${DEFAULT_TENANT}`);
  }

  return (
    <div className="landing-root">
      {/* ===== HEADER ===== */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">◆</span>
            <span className="landing-logo-text">HeptaCore</span>
          </div>
          <nav className="landing-nav">
            <a href="#features">Features</a>
            <a href="#pricing">Precios</a>
            <a href="#contact">Contacto</a>
          </nav>
          <Link href="/login" className="landing-header-cta">Entrar</Link>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-eyebrow">
            <span className="landing-dot" />
            Inteligencia artificial aplicada a marketing digital
          </div>
          <h1 className="landing-headline">
            Publica en todas tus redes<br />
            <span className="landing-gradient">sin tocar un boton.</span>
          </h1>
          <p className="landing-subheadline">
            HeptaCore es el primer sistema operativo de marketing que genera tu estrategia,
            escribe cada post, arma el calendario y publica por vos. Con supervision humana.
            Sin riesgo. Sin plantillas genericas.
          </p>

          <div className="landing-trial-box">
            <div className="landing-trial-badge">TRIAL SIN COSTO</div>
            <p className="landing-trial-text">
              <strong>2 publicaciones gratis por red social.</strong> Sin tarjeta.
              Sin limite de tiempo. Solo necesitas una invitacion.
            </p>
          </div>

          <div className="landing-cta-row">
            <Link href="/login" className="landing-cta-primary">
              Entrar a la consola &rarr;
            </Link>
            <a href="#how" className="landing-cta-secondary">
              Ver como funciona
            </a>
          </div>

          <div className="landing-hero-stats">
            <div><strong>6</strong><span>redes sociales</span></div>
            <div className="landing-stat-divider" />
            <div><strong>4</strong><span>modelos de IA</span></div>
            <div className="landing-stat-divider" />
            <div><strong>2x</strong><span>posts gratis</span></div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="landing-section landing-how">
        <div className="landing-container">
          <h2 className="landing-section-title">Como funciona</h2>
          <p className="landing-section-subtitle">Cuatro pasos. Cero friccion. Multiplicas tu presencia digital.</p>
          <div className="landing-steps">
            <Step number="1" title="Conecta" desc="Vincula tus cuentas de Instagram, Facebook, TikTok, YouTube, LinkedIn y X con OAuth seguro." />
            <Step number="2" title="Estrategia" desc="La IA analiza tu negocio, oferta y audiencia. Genera pilares de contenido, voz de marca y calendario." />
            <Step number="3" title="Revisa" desc="Cada publicacion se genera como borrador. Vos editas, ajustas, apruebas o rechazas. Nada sale sin tu OK." />
            <Step number="4" title="Publica" desc="Un click. Un post. Todas tus redes. El dashboard te muestra metricas, actividad y resultados." />
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="landing-section landing-features">
        <div className="landing-container">
          <h2 className="landing-section-title">Todo lo que incluye</h2>
          <p className="landing-section-subtitle">Una plataforma. Todas tus redes. Cero dolores de cabeza.</p>
          <div className="landing-features-grid">
            <FeatureCard emoji="🧠" title="Estrategia con IA" desc="Elige entre OpenAI GPT-4o, Claude, Gemini y DeepSeek. Cada tenant su propio LLM. Estrategia en segundos." />
            <FeatureCard emoji="🏢" title="Multi-tenant nativo" desc="Cada cliente aislado. Assets, cola, estrategia y reportes independientes por tenant." />
            <FeatureCard emoji="✅" title="Aprobacion humana" desc="Nada se publica sin tu revision. Roles: editor, estratega, aprobador. Trazabilidad total." />
            <FeatureCard emoji="🧪" title="Dry-run sin riesgo" desc="Prueba cada post en simulador antes de lanzar. Rollback documentado si algo falla." />
            <FeatureCard emoji="📅" title="Calendario inteligente" desc="Vistas dia, semana, mes. Hora exacta. Reordena con un click. Checklist por red." />
            <FeatureCard emoji="💰" title="Pago por uso real" desc="Pagas solo el costo del LLM + overhead. Sin suscripciones fijas. Sin costos ocultos." />
            <FeatureCard emoji="📊" title="Reportes y metricas" desc="Dashboard con actividad por estado, red y periodo. AuditLog trazable." />
            <FeatureCard emoji="🔒" title="Seguridad empresarial" desc="RBAC, OAuth en vault AES-256, zero secrets en git. Aislamiento total." />
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="landing-section landing-pricing">
        <div className="landing-container">
          <h2 className="landing-section-title">Sin letra chica</h2>
          <p className="landing-section-subtitle">Un modelo. Sin suscripciones. Sin permanencia.</p>
          <div className="landing-pricing-grid">
            <div className="landing-pricing-card landing-pricing-featured">
              <div className="landing-pricing-badge">UN PLAN</div>
              <h3 className="landing-pricing-name">HeptaCore</h3>
              <div className="landing-pricing-cost">
                <span className="landing-pricing-currency">desde</span>
                <span className="landing-pricing-amount">~$0.001</span>
                <span className="landing-pricing-unit">/post generado</span>
              </div>
              <ul className="landing-pricing-features-list">
                <li>2 publicaciones gratis por red (trial)</li>
                <li>Estrategia con IA ilimitada (costo del modelo)</li>
                <li>Multi-tenant y multi-red sin limites</li>
                <li>Dashboard, calendario y checklist</li>
                <li>Dry-run, rollback y AuditLog</li>
                <li>Asistente QA integrado</li>
              </ul>
              <div className="landing-pricing-cta-row">
                <Link href="/login" className="landing-cta-primary">Empezar gratis</Link>
                <a href="#contact" className="landing-pricing-contact-link">o contactanos</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact" className="landing-section landing-contact">
        <div className="landing-container">
          <h2 className="landing-section-title">Hablemos</h2>
          <p className="landing-section-subtitle">Escribinos por WhatsApp y activamos tu tenant hoy mismo.</p>
          <div className="landing-contact-grid">
            <div className="landing-contact-card">
              <span className="landing-contact-icon">💬</span>
              <strong>WhatsApp</strong>
              <a href="https://wa.me/584168017844" target="_blank" rel="noopener noreferrer">+58 416 8017844</a>
            </div>
            <div className="landing-contact-card">
              <span className="landing-contact-icon">📧</span>
              <strong>Email</strong>
              <span>contacto@heptacore.dev</span>
            </div>
            <div className="landing-contact-card">
              <span className="landing-contact-icon">📍</span>
              <strong>Ubicacion</strong>
              <span>Caracas, Venezuela</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo">◆ HeptaCore</span>
            <p>Sistema operativo de marketing con IA. Sin publicar sin aprobar. Sin gastar sin gate.</p>
          </div>
          <div className="landing-footer-links">
            <strong>Producto</strong>
            <a href="#features">Features</a>
            <a href="#pricing">Precios</a>
            <a href="#how">Como funciona</a>
            <a href="/login">Consola</a>
          </div>
          <div className="landing-footer-links">
            <strong>Contacto</strong>
            <a href="https://wa.me/584168017844" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <span>contacto@heptacore.dev</span>
            <span>Caracas, VE</span>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>HeptaCore &copy; {new Date().getFullYear()}</span>
          <span>Sin publicacion real sin aprobacion. Sin gasto sin gate.</span>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="landing-step">
      <div className="landing-step-circle">{number}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="landing-feature-card">
      <div className="landing-feature-emoji">{emoji}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}
