import Link from "next/link";
import { auth } from "../lib/auth";
import { redirect } from "next/navigation";

const DEFAULT_TENANT = "turpial-sound";

export default async function Home() {
  const session = await auth();
  if (session) {
    if (session.user?.memberships?.some((m) => m.role === "SUPER_ADMIN")) redirect("/admin");
    redirect(`/tenant/${DEFAULT_TENANT}`);
  }

  return (
    <div className="landing-root">
      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-eyebrow">
            <span className="landing-accent-line" />
            Caracas, Venezuela &middot; Beta activa
          </div>
          <h1 className="landing-hero-title">
            Marketing operado por
            <br />
            <span className="landing-hero-gradient">inteligencia artificial</span>
          </h1>
          <p className="landing-hero-desc">
            HeptaCore genera tu estrategia, escribe cada post, arma el calendario
            y publica en todas tus redes. Vos revisas, aprobas, y creces.
          </p>
          <div className="landing-cta-group">
            <Link href="/login" className="landing-btn landing-btn-primary">
              Entrar a la consola &rarr;
            </Link>
            <a href="https://wa.me/584168017844" target="_blank" rel="noopener" className="landing-btn landing-btn-outline">
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="landing-stats">
        <div className="landing-stats-inner">
          <div className="landing-stat"><strong>2</strong><span>publicaciones gratis<br />por red social</span></div>
          <div className="landing-stat"><strong>4</strong><span>modelos de IA<br />disponibles</span></div>
          <div className="landing-stat"><strong>6</strong><span>redes sociales<br />soportadas</span></div>
          <div className="landing-stat"><strong>100%</strong><span>supervision<br />humana</span></div>
        </div>
      </div>

      {/* ── WHAT IS IT ── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">
              <span className="landing-accent-line" />
              El producto
            </div>
            <h2 className="landing-section-title">
              Un sistema operativo.<br />Todas tus redes. Cero plantillas.
            </h2>
            <p className="landing-section-desc">
              HeptaCore es la plataforma que usan negocios y agencias para
              gestionar marketing digital con inteligencia artificial.
              No es un generador de posts genericos: es un equipo de agentes
              que trabajan coordinados bajo tu supervision.
            </p>
          </div>

          <div className="landing-cards-grid">
            {[
              { icon: "🧠", title: "Estrategia con IA", desc: "Elige entre OpenAI GPT-4o, Claude, Gemini o DeepSeek. Cada tenant configura su propio LLM y la IA genera la estrategia completa." },
              { icon: "🏢", title: "Multi-tenant nativo", desc: "Cada cliente aislado con su inventario de assets, cola de publicaciones, estrategia y reportes independientes. Sin fugas de datos." },
              { icon: "✅", title: "Aprobacion humana", desc: "Nada se publica sin tu revision. Roles: editor, estratega, aprobador, publisher. AuditLog trazable por accion y actor." },
              { icon: "🧪", title: "Dry-run sin riesgo", desc: "Prueba cada post en simulador antes de lanzarlo. Rollback documentado si algo falla. Sin afectar tus redes reales." },
              { icon: "📅", title: "Calendario inteligente", desc: "Vistas dia, semana y mes. Hora exacta de publicacion. Reordena con un click. Checklist de preparacion por red." },
              { icon: "💰", title: "Pago por uso real", desc: "Pagas solo el costo del LLM mas un overhead configurable. Sin suscripciones fijas. Facturacion transparente." },
            ].map((card) => (
              <div key={card.title} className="landing-card">
                <div className="landing-card-icon">{card.icon}</div>
                <h3 className="landing-card-title">{card.title}</h3>
                <p className="landing-card-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">
              <span className="landing-accent-line" />
              Como funciona
            </div>
            <h2 className="landing-section-title">Cuatro pasos. Resultado medible.</h2>
          </div>
          <div className="landing-steps-grid">
            {[
              { step: "1", title: "Conecta", desc: "Vincula tus cuentas de Instagram, Facebook, TikTok, YouTube, LinkedIn y X con OAuth seguro de Meta." },
              { step: "2", title: "Define", desc: "La IA analiza tu negocio, oferta, audiencia y objetivos. Genera pilares, voz de marca y calendario completo." },
              { step: "3", title: "Revisa", desc: "Cada post se crea como borrador. Edita, ajusta, aprueba o rechaza. Nada se publica sin tu OK explicito." },
              { step: "4", title: "Publica", desc: "Un click. Todas tus redes. El dashboard te muestra metricas, actividad y resultados en tiempo real." },
            ].map((s) => (
              <div key={s.step} className="landing-step-card">
                <div className="landing-step-number">{s.step}</div>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">
              <span className="landing-accent-line" />
              Sin letra chica
            </div>
            <h2 className="landing-section-title">Un plan. Pago por uso. Sin suscripciones.</h2>
          </div>
          <div className="landing-pricing-card">
            <div className="landing-pricing-badge">UN PLAN</div>
            <h3 className="landing-pricing-name">HeptaCore</h3>
            <div className="landing-pricing-cost">
              <span className="landing-pricing-from">desde</span>
              <span className="landing-pricing-amount">~$0.001</span>
              <span className="landing-pricing-per">/ post generado</span>
            </div>
            <ul className="landing-pricing-list">
              <li>2 publicaciones gratis por red social (trial sin costo)</li>
              <li>Estrategia con IA ilimitada (costo del modelo)</li>
              <li>Todos los LLMs: OpenAI, Claude, Gemini, DeepSeek</li>
              <li>Dashboard, calendario y checklist completos</li>
              <li>Dry-run, rollback y AuditLog trazable</li>
              <li>Asistente QA integrado en la plataforma</li>
            </ul>
            <div className="landing-pricing-actions">
              <Link href="/login" className="landing-btn landing-btn-primary">Empezar gratis</Link>
              <a href="https://wa.me/584168017844" target="_blank" rel="noopener" className="landing-pricing-contact">o contactanos por WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">
              <span className="landing-accent-line" />
              Contacto
            </div>
            <h2 className="landing-section-title">Activa tu tenant hoy</h2>
            <p className="landing-section-desc">
              Escribinos por WhatsApp. Revisamos tu caso, armamos la estrategia inicial
              y te damos acceso en menos de 24 horas.
            </p>
          </div>
          <div className="landing-contact-grid">
            <a href="https://wa.me/584168017844" target="_blank" rel="noopener" className="landing-contact-card">
              <span className="landing-contact-icon">💬</span>
              <strong>WhatsApp</strong>
              <span>+58 416 8017844</span>
            </a>
            <div className="landing-contact-card">
              <span className="landing-contact-icon">📧</span>
              <strong>Email</strong>
              <span>contacto@heptacore.dev</span>
            </div>
            <div className="landing-contact-card">
              <span className="landing-contact-icon">📍</span>
              <strong>Caracas, Venezuela</strong>
              <span>Operando desde 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-col">
            <span className="landing-footer-logo">◆ HeptaCore</span>
            <p>Sistema operativo de marketing con IA. Sin publicar sin aprobar. Sin gastar sin gate.</p>
            <p className="landing-footer-copy">&copy; {new Date().getFullYear()} HeptaCore &mdash; Caracas, VE</p>
          </div>
          <div className="landing-footer-col">
            <strong>Producto</strong>
            <Link href="/#features">Features</Link>
            <Link href="/#pricing">Precios</Link>
            <Link href="/#how">Como funciona</Link>
            <Link href="/login">Consola</Link>
          </div>
          <div className="landing-footer-col">
            <strong>Legal</strong>
            <span>Sin publicacion real sin aprobacion.</span>
            <span>Sin gasto en campanas sin gate.</span>
            <span>Credenciales encriptadas AES-256.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
