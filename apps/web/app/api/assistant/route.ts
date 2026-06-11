import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getLLMProvider } from "@heptacore/agents";

const KNOWLEDGE_PATH = join(process.cwd(), "..", "..", "docs", "qa", "heptacore-knowledge.md");

function loadKnowledge(): string {
  try {
    if (existsSync(KNOWLEDGE_PATH)) {
      return readFileSync(KNOWLEDGE_PATH, "utf8");
    }
  } catch { /* ignore */ }
  return "HeptaCore es un sistema operativo de marketing AI multi-tenant.";
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW = 3600000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim();

  if (!question || question.length > 500) {
    return NextResponse.json({ error: "Question is required (max 500 chars)" }, { status: 400 });
  }

  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: "Rate limit reached. Intenta de nuevo en una hora." }, { status: 429 });
  }

  const knowledge = loadKnowledge();

  const knowledgeSummary = knowledge.length > 8000
    ? knowledge.slice(0, 8000) + "\n\n(conocimiento truncado)"
    : knowledge;

  const providerConfig = {
    provider: process.env.LLM_PROVIDER ?? "deterministic",
    apiKey: process.env.LLM_PROVIDER_API_KEY,
    model: process.env.LLM_MODEL,
  };

  if (providerConfig.provider === "deterministic") {
    const reply = deterministicReply(question);
    return NextResponse.json({ ok: true, reply, provider: "deterministic" });
  }

  try {
    const provider = getLLMProvider(providerConfig);
    const result = await provider.generate({
      systemPrompt: [
        "Eres un asistente de HeptaCore. Responde preguntas sobre la plataforma usando SOLO la informacion del conocimiento proporcionado.",
        "Si la pregunta no puede responderse con el conocimiento dado, di: 'No tengo esa informacion. Contacta a soporte por WhatsApp +584168017844.'",
        "Responde en espanol, en 2-4 oraciones maximo. Se util y directo.",
        "CONOCIMIENTO:\n" + knowledgeSummary,
      ].join("\n"),
      userPrompt: question,
      temperature: 0.5,
      maxTokens: 400,
    });

    return NextResponse.json({ ok: true, reply: result.content.slice(0, 600), provider: providerConfig.provider });
  } catch {
    const reply = deterministicReply(question);
    return NextResponse.json({ ok: true, reply, provider: "deterministic (fallback)" });
  }
}

function deterministicReply(q: string): string {
  const ql = q.toLowerCase();
  if (ql.includes("registr") || ql.includes("crear cuenta")) return "El registro es por invitacion. El admin de tu tenant te envia un link de invitacion por email.";
  if (ql.includes("contrasena") || ql.includes("password") || ql.includes("recuperar")) return "En la pagina de login, haz clic en 'Olvide mi contrasena'. Ingresa tu email y recibiras un link de recuperacion.";
  if (ql.includes("pago") || ql.includes("precio") || ql.includes("costo") || ql.includes("plan")) return "HeptaCore usa un modelo de pago con overhead. Contacta por WhatsApp +584168017844 para activar tu plan.";
  if (ql.includes("publicar") || ql.includes("publicacion") || ql.includes("post")) return "Para publicar: aprueba un draft, ve a la vista Publicacion, selecciona el modo (dry-run o live) y confirma.";
  if (ql.includes("estrategia") || ql.includes("llm") || ql.includes("ia")) return "Ve a la vista Estrategia, configura el LLM (provider, modelo, API key) y haz clic en 'Generar estrategia'.";
  if (ql.includes("asset") || ql.includes("imagen") || ql.includes("video")) return "Ve a la vista Activos. Ahi veras las especificaciones por plataforma y los assets cargados.";
  if (ql.includes("editar") || ql.includes("modificar")) return "En la cola de drafts, cada card tiene un boton EDITAR arriba a la derecha. Puedes modificar titulo, caption y hashtags.";
  return "No tengo esa informacion especifica. Contacta a soporte por WhatsApp +584168017844 para ayuda personalizada.";
}
