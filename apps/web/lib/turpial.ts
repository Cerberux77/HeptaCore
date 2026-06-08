import queueRaw from "./data/publication-queue.json";

export type QueueItem = {
  id: string;
  channel: string;
  format: string;
  pilar: string;
  status: string;
  title: string;
  caption: string;
  cta: string;
  hashtags: string[];
  sourceDoc: string;
  notes: string;
  riskLevel: "low" | "medium" | "high";
  requiresHumanReview: boolean;
  selectedAsset?: string;
  selectedAssetPath?: string;
  carouselAssets?: string[];
  scheduledFor: string;
  updatedAt: string;
  publishedAt?: string;
};

export type TurpialConsoleData = {
  tenant: {
    id: string;
    name: string;
    mode: string;
    primaryNetworks: string[];
    conversion: string;
  };
  metrics: {
    total: number;
    drafts: number;
    ready: number;
    review: number;
    published: number;
    missingAssets: number;
    nextDate: string;
  };
  strategy: {
    offer: string;
    audience: string;
    promise: string;
    priorities: string[];
    blockers: string[];
    minimums: string[];
  };
  queue: QueueItem[];
};

function decodeText(value: string) {
  return value
    .replaceAll("Ã³", "ó")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã­", "í")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ã±", "ñ")
    .replaceAll("Ã‘", "Ñ")
    .replaceAll("Â¿", "¿")
    .replaceAll("Â¡", "¡")
    .replaceAll("â€”", "-")
    .replaceAll("â†’", "->");
}

function cleanItem(item: QueueItem): QueueItem {
  return {
    ...item,
    title: decodeText(item.title),
    caption: decodeText(item.caption),
    cta: decodeText(item.cta),
    notes: decodeText(item.notes),
    hashtags: item.hashtags.map(decodeText)
  };
}

export function getTurpialConsoleData(): TurpialConsoleData {
  const queue = (queueRaw as QueueItem[]).map(cleanItem);
  const review = queue.filter((item) => item.requiresHumanReview || item.riskLevel !== "low").length;
  const published = queue.filter((item) => item.status === "published").length;
  const ready = queue.filter((item) => item.status === "ready").length;
  const drafts = queue.filter((item) => item.status === "draft").length;
  const next = queue
    .filter((item) => item.status !== "published")
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];

  return {
    tenant: {
      id: "turpial",
      name: "Turpial Sound / Marketplace",
      mode: "approval_required",
      primaryNetworks: ["Instagram", "Facebook"],
      conversion: "WhatsApp + marketplace"
    },
    metrics: {
      total: queue.length,
      drafts,
      ready,
      review,
      published,
      missingAssets: 0,
      nextDate: next?.scheduledFor ?? "sin fecha"
    },
    strategy: {
      offer:
        "Estudio, salas, produccion musical y marketplace protegido para musicos en Caracas.",
      audience:
        "Bandas, solistas, productores, podcasters, compradores y vendedores de equipos musicales en Venezuela.",
      promise:
        "Centralizar confianza, criterio tecnico y operacion continua para convertir atencion en reservas, publicaciones y conversaciones calificadas.",
      priorities: [
        "Instagram: vitrina visual, reels, stories e interaccion diaria.",
        "Facebook: confianza local, posts largos, marketplace y comunidad.",
        "TikTok/YouTube Shorts: expansion cuando haya cadencia de video suficiente.",
        "SEO/AEO: soporte para busquedas de estudio, salas y marketplace."
      ],
      blockers: [
        "OAuth real de Meta pendiente.",
        "Publicacion real bloqueada hasta aprobacion humana.",
        "Respuestas delicadas requieren cola de revision.",
        "Campanas pagas todavia en modo recomendacion."
      ],
      minimums: [
        "Confirmar voz de marca y CTA principal.",
        "Aprobar primeros 7 posts.",
        "Validar assets de cada publicacion.",
        "Definir ventanas horarias de publicacion.",
        "Preparar credenciales OAuth solo cuando el flujo dry-run este validado."
      ]
    },
    queue
  };
}
