import type { AutomationMode, SocialNetwork } from "@heptacore/core";
import { z } from "zod";

export const automationModes: AutomationMode[] = [
  "draft_only",
  "approval_required",
  "autopilot_limited",
  "autopilot_full"
];

export const clientIntakeSchema = z.object({
  tenantId: z.string().min(1),
  businessName: z.string().min(2),
  offer: z.string().min(10),
  market: z.string().min(3),
  audience: z.string().min(3),
  constraints: z.array(z.string()).default([]),
  preferredNetworks: z
    .array(z.enum(["instagram", "facebook", "tiktok", "youtube", "linkedin", "x"]))
    .default([])
});

export type ClientIntake = z.infer<typeof clientIntakeSchema>;

export const agentCouncil = [
  { role: "Chief Product Strategist", output: "Replantea oferta, nicho, promesa comercial y criterios de priorizacion." },
  { role: "Growth Strategist", output: "Define embudo, canales, campanas, conversiones y pruebas medibles." },
  { role: "Social Media Systems Architect", output: "Traduce estrategia a calendario, formatos, cadencia y workflows por red." },
  { role: "AI Agent Orchestration Architect", output: "Coordina agentes, memoria por cliente, herramientas, approvals y trazabilidad." },
  { role: "Security Architect", output: "Aisla tenants, secretos, OAuth, logs, permisos y defensa contra prompt injection." },
  { role: "Data Analytics Architect", output: "Modela metricas, eventos, reportes, insights y aprendizaje continuo." },
  { role: "UX Conversion Specialist", output: "Disena onboarding, checklist de insumos, landing y tracking de bloqueos." },
  { role: "Compliance Reviewer", output: "Evalua claims, ToS de plataformas, scraping, privacidad y aprobaciones humanas." }
] as const;

export const mvpModules = [
  { name: "Onboarding", purpose: "Captura negocio, oferta, audiencia, restricciones y objetivos." },
  { name: "Strategy Agent", purpose: "Genera replanteo comercial, nicho, pilares y prioridades." },
  { name: "Asset Intake", purpose: "Valida insumos minimos, recomendados, avanzados y bloqueos." },
  { name: "Draft Factory", purpose: "Produce posts, reels, stories, captions, CTAs y FAQs." },
  { name: "Approval Queue", purpose: "Controla revision humana antes de publicar o gastar." },
  { name: "RRSS Worker", purpose: "Orquesta colas, retries, API adapters y dry-run por tenant." },
  { name: "Response Agent", purpose: "Sugiere respuestas y escala temas sensibles." },
  { name: "Reporting", purpose: "Resume actividad, insights, quejas, oportunidades y ROI estimado." }
] as const;

export function recommendNetworks(input: Pick<ClientIntake, "preferredNetworks" | "market">) {
  const defaultPriority: SocialNetwork[] = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "x"];
  const preferred = input.preferredNetworks.filter((network, index, arr) => arr.indexOf(network) === index);
  const ordered = [...preferred, ...defaultPriority.filter((network) => !preferred.includes(network))];

  return ordered.map((network, index) => ({
    network,
    priority: index + 1,
    canStartImmediately: network === "instagram" || network === "facebook",
    rationale:
      network === "instagram" || network === "facebook"
        ? "Canal MVP prioritario para validacion visual, comunidad y Meta Business Suite."
        : "Canal recomendado para expansion una vez cubiertos assets y cadencia base."
  }));
}

export function buildMinimumIntakeChecklist(networks: SocialNetwork[]) {
  const base = [
    "propuesta de valor",
    "descripcion del producto/servicio",
    "audiencia objetivo",
    "restricciones legales/comerciales",
    "tono de marca",
    "logo o marca base",
    "5 assets visuales utilizables",
    "canal de conversion principal"
  ];

  const networkItems = networks.flatMap((network) => [
    `${network}: usuario/handle`,
    `${network}: objetivo de canal`,
    `${network}: reglas de publicacion y aprobacion`
  ]);

  return [...base, ...networkItems];
}

export { reframeOffer, generateDraftPlan } from "./strategy-runner";
export type { StrategyOutput, DraftPlanItem } from "./strategy-runner";
export { generateStrategyWithLLM, getLLMProvider } from "./llm-adapter";
export type { LLMProvider, LLMProviderConfig, LLMGenerateParams, LLMGenerateResult, TurpialContext } from "./llm-adapter";
