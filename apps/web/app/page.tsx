import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Layers, ShieldCheck, Users, BarChart3, Zap, Lock } from "lucide-react";

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
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-headline">
            Marketing con criterio,<br />no con plantillas
          </h1>
          <p className="landing-subheadline">
            HeptaCore es el sistema operativo de marketing AI que gestiona estrategia, contenido, RRSS, respuestas, campanas y reporting por cliente. Sin automatizacion sin supervision.
          </p>
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

      <section id="how-it-works" className="landing-features">
        <h2 className="landing-section-title">Como opera HeptaCore</h2>
        <div className="landing-features-grid">
          <FeatureCard
            icon={<Zap size={24} />}
            title="Onboarding guiado"
            description="Captura tu negocio, oferta, audiencia, restricciones y objetivos. El sistema evalua insumos minimos, recomendados y bloqueos antes de empezar."
          />
          <FeatureCard
            icon={<Layers size={24} />}
            title="Estrategia por tenant"
            description="Cada cliente recibe una estrategia independiente con pilares de contenido, canales, cadencia y voz de marca definidos por criterio tecnico."
          />
          <FeatureCard
            icon={<Users size={24} />}
            title="Cola de aprobacion humana"
            description="Todo contenido pasa por revision humana antes de ejecutarse. Sin publicacion automatica, sin gasto sin aprobacion, sin riesgo."
          />
          <FeatureCard
            icon={<ShieldCheck size={24} />}
            title="Dry-run y rollback"
            description="Cada publicacion se prueba en modo simulado. Si algo falla, el rollback documentado revierte el estado sin afectar redes reales."
          />
          <FeatureCard
            icon={<BarChart3 size={24} />}
            title="Reportes y auditoria"
            description="Dashboard con metricas por estado, red y actividad reciente. AuditLog trazable por accion, actor y tenant."
          />
          <FeatureCard
            icon={<Lock size={24} />}
            title="Seguridad multi-tenant"
            description="Cada cliente aislado con RBAC por rol. Credenciales OAuth en vault. Sin secretos en git. Sin scraping sin consentimiento."
          />
        </div>
      </section>

      <section className="landing-tenant-model">
        <h2 className="landing-section-title">Modelo operativo</h2>
        <div className="landing-model-grid">
          <div className="landing-model-card">
            <h3>Tenant</h3>
            <p>Cada cliente es un tenant aislado con su propio inventario de activos, cola de publicaciones, estrategia y configuracion de aprobaciones.</p>
            <ul>
              <li>Multi-red: Instagram, Facebook, TikTok, YouTube, LinkedIn, X</li>
              <li>Modos: draft_only, approval_required, autopilot_limited</li>
              <li>Assets, calendario y checklist por tenant</li>
            </ul>
          </div>
          <div className="landing-model-card">
            <h3>HeptaCore</h3>
            <p>La plataforma gestiona la orquestacion: intake de cliente, generacion de estrategia, cola de drafts, approval queue, dry-run y reporting.</p>
            <ul>
              <li>Agentes de estrategia con fallback deterministico</li>
              <li>Workers de publicacion con cola y retries</li>
              <li>Gate de seguridad antes de cualquier accion sensible</li>
            </ul>
          </div>
          <div className="landing-model-card">
            <h3>Crecimiento pago</h3>
            <p>Las campanas pagas se planifican con presupuesto de plataforma, 35% de overhead HeptaCore y cargo total visible. Sin gasto real sin aprobacion.</p>
            <ul>
              <li>Propuesta → Revision → Aprobacion → Ejecucion</li>
              <li>Overhead transparente: 35% sobre platform budget</li>
              <li>Gasto real bloqueado hasta aprobacion explicita</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-cta-bottom">
        <h2 className="landing-section-title">Turpial Sound: el piloto</h2>
        <p>
          Estudio de grabacion y marketplace de equipos musicales en Caracas. 29 drafts validados, 46 assets, estrategia activa y dry-run operativo.
        </p>
        <Link href="/login" className="landing-cta-primary">
          Ver la consola
        </Link>
      </section>

      <footer className="landing-footer">
        <p>HeptaCore &copy; {new Date().getFullYear()} &mdash; Sistema operativo de marketing AI. Sin publicacion real sin aprobacion. Sin gasto sin gate.</p>
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
