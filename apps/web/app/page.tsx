import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap, Layers, ShieldCheck, Users, BarChart3, Lock, Sparkles, TrendingUp, MessageCircle, Bot, CalendarDays } from "lucide-react";

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
    <main className="landing-root">
      {/* ========== HERO ========== */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Sparkles size={14} /> Beta activa — Turpial Sound
          </div>
          <h1 className="landing-headline">
            Marketing operado<br />por inteligencia artificial
          </h1>
          <p className="landing-subheadline">
            HeptaCore genera tu estrategia de contenido, escribe los posts,
            programa el calendario y publica en todas tus redes sociales.
            Todo bajo supervision humana, sin riesgo y con trazabilidad total.
          </p>

          {/* ===== TRIAL OFFER BOX ===== */}
          <div className="landing-trial-box">
            <div className="landing-trial-badge">PRUEBA GRATIS</div>
            <p className="landing-trial-text">
              <strong>2 publicaciones gratis por cada red social</strong> —
              Instagram, Facebook, TikTok, YouTube, LinkedIn, X.
              Sin tarjeta de credito. Sin compromiso.
              Solo necesitas una invitacion de tu administrador.
            </p>
          </div>

          <div className="landing-cta-row">
            <Link href="/login" className="landing-cta-primary">
              Entrar a la consola
            </Link>
            <a href="#how-it-works" className="landing-cta-secondary">
              Como funciona
            </a>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="landing-features">
        <h2 className="landing-section-title">Como opera HeptaCore</h2>
        <p className="landing-section-subtitle">Cuatro pasos. Cero plantillas. Resultado medible.</p>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3>Conecta tus redes</h3>
            <p>Vincula Instagram, Facebook, TikTok, YouTube, LinkedIn y X. HeptaCore se integra con Meta Business Suite via OAuth seguro.</p>
          </div>
          <div className="landing-step-arrow">&rarr;</div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3>Define tu estrategia</h3>
            <p>Nuestra IA analiza tu negocio, audiencia y objetivos. Genera pilares de contenido, calendario y voz de marca en minutos.</p>
          </div>
          <div className="landing-step-arrow">&rarr;</div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3>Revisa y aprueba</h3>
            <p>Cada publicacion pasa por vos antes de salir. Edita, ajusta, aprueba o rechaza. Sin publicacion automatica sin tu visto bueno.</p>
          </div>
          <div className="landing-step-arrow">&rarr;</div>
          <div className="landing-step">
            <div className="landing-step-number">4</div>
            <h3>Publica y mide</h3>
            <p>Un click publica en todas tus redes. El dashboard te muestra metricas, actividad y resultados en tiempo real.</p>
          </div>
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section className="landing-features">
        <h2 className="landing-section-title">Todo lo que incluye</h2>
        <div className="landing-features-grid">
          <FeatureCard icon={<Bot size={24} />} title="Estrategia con IA" description="Elige entre OpenAI GPT-4o, Anthropic Claude, Gemini y DeepSeek. Cada tenant configura su propio LLM. Estrategia generada en segundos." />
          <FeatureCard icon={<Layers size={24} />} title="Multi-tenant y multi-red" description="Cada cliente es un tenant aislado. Cada tenant maneja hasta 6 redes sociales con pilares, assets y calendario independientes." />
          <FeatureCard icon={<Users size={24} />} title="Cola de aprobacion humana" description="Todo contenido pasa por revision antes de publicarse. Roles: editor, estratega, aprobador, publisher. Trazabilidad total con AuditLog." />
          <FeatureCard icon={<ShieldCheck size={24} />} title="Dry-run y rollback" description="Prueba cada publicacion en modo simulado antes de lanzarla. Si algo falla, el rollback documentado revierte sin afectar tus redes." />
          <FeatureCard icon={<CalendarDays size={24} />} title="Calendario inteligente" description="Vistas dia, semana y mes. Hora exacta de publicacion. Reordena drafts con drag & drop. Checklist de preparacion por red." />
          <FeatureCard icon={<TrendingUp size={24} />} title="Precio transparente" description="Pagas solo el costo real del LLM mas un overhead configurable. Sin suscripciones fijas. Sin costos ocultos. Facturacion por uso." />
          <FeatureCard icon={<BarChart3 size={24} />} title="Reportes y metricas" description="Dashboard con conteo por estado, por red y actividad reciente. Reportes diarios, semanales y mensuales por tenant." />
          <FeatureCard icon={<Lock size={24} />} title="Seguridad empresarial" description="RBAC multi-rol. Credenciales OAuth encriptadas con AES-256-GCM. Sin secretos en git. Aislamiento total entre tenants." />
          <FeatureCard icon={<MessageCircle size={24} />} title="Asistente QA" description="Chatbot integrado que responde preguntas sobre la plataforma. Lee la documentacion de HeptaCore y contesta en tiempo real." />
        </div>
      </section>

      {/* ========== PRICING / TRIAL ========== */}
      <section className="landing-pricing">
        <h2 className="landing-section-title">Empieza sin costo</h2>
        <p className="landing-section-subtitle">Sin tarjeta. Sin permanencia. Sin letra chica.</p>
        <div className="landing-pricing-grid">
          <div className="landing-pricing-card">
            <div className="landing-pricing-header">
              <h3>Trial</h3>
              <div className="landing-pricing-price">$0</div>
              <p>para siempre</p>
            </div>
            <ul>
              <li>2 publicaciones gratis por red social</li>
              <li>Acceso a todos los LLMs</li>
              <li>Dashboard completo</li>
              <li>Estrategia con IA ilimitada</li>
              <li>Calendario y checklist</li>
              <li>Asistente QA</li>
            </ul>
            <Link href="/login" className="landing-cta-primary" style={{ width: "100%", textAlign: "center", display: "block" }}>
              Empezar ahora
            </Link>
          </div>
          <div className="landing-pricing-card landing-pricing-featured">
            <div className="landing-pricing-badge">Recomendado</div>
            <div className="landing-pricing-header">
              <h3>Activado</h3>
              <div className="landing-pricing-price">Pago por uso</div>
              <p>sin limites de publicacion</p>
            </div>
            <ul>
              <li>Publicaciones ilimitadas</li>
              <li>Todos los LLMs sin restriccion</li>
              <li>Multi-tenant completo</li>
              <li>Autopilot disponible</li>
              <li>Reportes avanzados</li>
              <li>Soporte prioritario WhatsApp</li>
            </ul>
            <a href="#contact" className="landing-cta-primary" style={{ width: "100%", textAlign: "center", display: "block", textDecoration: "none" }}>
              Contactar para activar
            </a>
          </div>
        </div>
      </section>

      {/* ========== CONTACT / CTA ========== */}
      <section id="contact" className="landing-contact">
        <h2 className="landing-section-title">Listo para empezar</h2>
        <p className="landing-section-subtitle">
          Solo necesitas una invitacion. Si ya la tienes, entra a la consola. Si no, contactanos.
        </p>
        <div className="landing-contact-actions">
          <Link href="/login" className="landing-cta-primary">
            Entrar a la consola
          </Link>
          <a href="https://wa.me/584168017844" target="_blank" rel="noopener noreferrer" className="landing-cta-whatsapp">
            <MessageCircle size={18} /> WhatsApp +58 416 8017844
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div>
            <strong>HeptaCore</strong>
            <p>Sistema operativo de marketing AI multi-tenant. Sin publicacion real sin aprobacion. Sin gasto sin gate.</p>
          </div>
          <div>
            <strong>Redes</strong>
            <p>Instagram · Facebook · TikTok · YouTube · LinkedIn · X</p>
          </div>
          <div>
            <strong>Contacto</strong>
            <p>WhatsApp +58 416 8017844</p>
          </div>
        </div>
        <p className="landing-footer-copy">HeptaCore &copy; {new Date().getFullYear()} — Hecho en Caracas, VE</p>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="landing-feature-card">
      <div className="landing-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

