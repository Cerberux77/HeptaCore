import type { ClientIntake } from "./index";
import type { SocialNetwork } from "@heptacore/core";
import { recommendNetworks, buildMinimumIntakeChecklist } from "./index";

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

function formatsForNetwork(network: SocialNetwork) {
  switch (network) {
    case "instagram":
      return ["feed", "reel", "story", "carousel"];
    case "facebook":
      return ["feed", "carousel", "long_form"];
    case "youtube":
      return ["short", "video", "community"];
    case "tiktok":
      return ["vertical_video", "trend_adaptation", "behind_the_scenes"];
    case "linkedin":
      return ["feed", "document", "case_note", "short_video"];
    case "x":
      return ["post", "thread"];
    default:
      return ["feed"];
  }
}

function pillarForNetwork(network: SocialNetwork, day: number) {
  if (network === "youtube") {
    return { key: "semantic_authority", label: "Autoridad semantica / primeros 30 segundos", formats: ["short", "video"] };
  }
  if (network === "tiktok") {
    return { key: "discovery_hook", label: "Descubrimiento / hook visual", formats: ["vertical_video"] };
  }
  if (network === "linkedin") {
    return { key: "business_trust", label: "Autoridad de negocio / confianza", formats: ["feed", "document"] };
  }
  return PILLARS[day % PILLARS.length];
}

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
      cadence: n.network === "instagram" || n.network === "facebook" ? "3-5 posts/semana" : "1-3 piezas/semana",
      formats: formatsForNetwork(n.network),
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
  const activeNetworks = active.length > 0 ? active : networks.slice(0, 2).map((n) => n.network);
  const plan: DraftPlanItem[] = [];

  for (let day = 0; day < dayCount; day++) {
    const network = activeNetworks[day % activeNetworks.length] as SocialNetwork;
    const pillar = pillarForNetwork(network, day);
    const availableFormats = formatsForNetwork(network);

    const format = network === "youtube"
      ? (day % 3 === 0 ? "video" : "short")
      : network === "tiktok"
        ? "vertical_video"
        : network === "linkedin"
          ? (day % 2 === 0 ? "feed" : "document")
          : pillar.formats.includes("reel") && day % 3 === 0
      ? "reel"
      : pillar.formats.includes("story") && day % 4 === 0
        ? "story"
        : pillar.formats.includes("carousel") && day % 5 === 0
          ? "carousel"
          : availableFormats[0] ?? "feed";

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
