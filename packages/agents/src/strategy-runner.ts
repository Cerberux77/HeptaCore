import type { ClientIntake } from "./index.js";
import type { SocialNetwork } from "@heptacore/core";
import { recommendNetworks, buildMinimumIntakeChecklist } from "./index.js";

export interface StrategyOutput {
  title: string;
  businessGoals: Record<string, string>;
  positioning: Record<string, string>;
  audience: Record<string, string>;
  channels: Array<{
    network: SocialNetwork;
    priority: number;
    cadence: string;
    formats: string[];
  }>;
  assetChecklist: string[];
  draftPlan: DraftPlanItem[];
}

export interface DraftPlanItem {
  network: SocialNetwork;
  format: string;
  pillar: string;
  titleTemplate: string;
  ctaTemplate: string;
  hashtags: string[];
  scheduledDay: number;
}

const PILLARS = [
  { key: "brand_intro", label: "Presentacion de marca", formats: ["feed", "carousel", "reel"] },
  { key: "social_proof", label: "Prueba social", formats: ["feed", "story"] },
  { key: "education", label: "Educacion", formats: ["carousel", "feed", "reel"] },
  { key: "offer_detail", label: "Detalle de oferta", formats: ["feed", "carousel"] },
  { key: "engagement", label: "Engagement / comunidad", formats: ["story", "feed"] },
  { key: "trust", label: "Confianza / operacion", formats: ["feed", "carousel"] },
  { key: "cta_direct", label: "Llamado a la accion", formats: ["story", "reel"] },
];

export function reframeOffer(intake: ClientIntake) {
  const networks = recommendNetworks(intake);
  const primary = networks[0]?.network ?? "instagram";

  return {
    title: `Estrategia ${intake.businessName}`,
    businessGoals: {
      primary: `Posicionar ${intake.businessName} en ${primary} como referencia en ${intake.market}`,
      conversion: intake.offer.split(".")[0] || intake.offer.slice(0, 80),
      retention: "Construir comunidad recurrente con contenido educativo y social proof",
    },
    positioning: {
      offer: intake.offer,
      differentiator: `${intake.businessName} no compite por precio. Compite por criterio, confianza y consistencia.`,
      promise: "Cada publicacion tiene detras un criterio tecnico, no una plantilla.",
    },
    audience: {
      primary: intake.audience,
      secondary: "Compradores y vendedores del ecosistema " + intake.market,
      channels: networks.map((n) => n.network).join(", "),
    },
    channels: networks.map((n) => ({
      network: n.network,
      priority: n.priority,
      cadence: n.canStartImmediately ? "3-5 posts/semana" : "1-2 posts/semana",
      formats: n.network === "instagram"
        ? ["feed", "reel", "story", "carousel"]
        : n.network === "facebook"
          ? ["feed", "carousel"]
          : ["feed"],
    })),
    assetChecklist: buildMinimumIntakeChecklist(networks.map((n) => n.network)),
  };
}

export function generateDraftPlan(
  intake: ClientIntake,
  dayCount = 30,
): DraftPlanItem[] {
  const networks = recommendNetworks(intake);
  const active = networks.filter((n) => n.canStartImmediately).map((n) => n.network);
  const plan: DraftPlanItem[] = [];

  for (let day = 0; day < dayCount; day++) {
    const network = active[day % active.length] as SocialNetwork;
    const pillar = PILLARS[day % PILLARS.length];

    const format = pillar.formats.includes("reel") && day % 3 === 0
      ? "reel"
      : pillar.formats.includes("story") && day % 4 === 0
        ? "story"
        : pillar.formats.includes("carousel") && day % 5 === 0
          ? "carousel"
          : "feed";

    plan.push({
      network,
      format,
      pillar: pillar.label,
      titleTemplate: `[${pillar.label}] ${intake.businessName} - Dia ${day + 1}`,
      ctaTemplate: day % 7 === 0 ? "Escribe por WhatsApp" : "Guarda este post",
      hashtags: [`#${intake.businessName.replace(/\s+/g, "")}`, `#${pillar.key}`, `#${intake.market.replace(/\s+/g, "")}`],
      scheduledDay: day + 1,
    });
  }

  return plan;
}
