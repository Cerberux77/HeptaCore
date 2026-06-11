import type { ClientIntake } from "./index";
import type { StrategyOutput } from "./strategy-runner";
import { reframeOffer, generateDraftPlan } from "./strategy-runner";

export interface LLMProviderConfig {
  provider: string;
  apiKey?: string;
  model?: string;
}

export interface LLMGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface LLMGenerateResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMProvider {
  provider: string;
  generate(params: LLMGenerateParams): Promise<LLMGenerateResult>;
}

export interface TurpialContext {
  businessName: string;
  offer: string;
  market: string;
  audience: string;
  brandVoice: string[];
  contentPillars: Array<{ name: string; description: string }>;
  existingAssets: Array<{ filename: string; kind: string }>;
  sourceDocs: Array<{ title: string; content: string }>;
  constraints: string[];
}

class DeterministicProvider implements LLMProvider {
  provider = "deterministic";

  async generate(_params: LLMGenerateParams): Promise<LLMGenerateResult> {
    return {
      content: JSON.stringify({ fallback: true, reason: "deterministic provider cannot generate free-text; use generateStrategy instead" }),
      model: "deterministic/v1",
    };
  }
}

class OpenAIProvider implements LLMProvider {
  provider = "openai";
  private apiKey: string;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey ?? "";
    this.model = config.model ?? "gpt-4o-mini";
  }

  async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
    if (!this.apiKey) {
      throw new Error("apiKey is required for OpenAI provider");
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2000,
        ...(params.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model ?? this.model,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}

class AnthropicProvider implements LLMProvider {
  provider = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey ?? "";
    this.model = config.model ?? "claude-3-5-haiku-latest";
  }

  async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
    if (!this.apiKey) {
      throw new Error("apiKey is required for Anthropic provider");
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: params.maxTokens ?? 2000,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text ?? "",
      model: data.model ?? this.model,
      usage: data.usage
        ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
        : undefined,
    };
  }
}

class GeminiProvider implements LLMProvider {
  provider = "gemini";
  private apiKey: string;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey ?? "";
    this.model = config.model ?? "gemini-2.0-flash";
  }

  async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
    if (!this.apiKey) {
      throw new Error("apiKey is required for Gemini provider");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const contents = [];
    if (params.systemPrompt) {
      contents.push({ role: "user", parts: [{ text: `System: ${params.systemPrompt}` }] });
    }
    contents.push({ role: "user", parts: [{ text: params.userPrompt }] });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens ?? 2000,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      modelVersion: string;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      model: data.modelVersion ?? this.model,
      usage: data.usageMetadata
        ? { promptTokens: data.usageMetadata.promptTokenCount, completionTokens: data.usageMetadata.candidatesTokenCount }
        : undefined,
    };
  }
}

class DeepSeekProvider implements LLMProvider {
  provider = "deepseek";
  private apiKey: string;
  private model: string;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey ?? "";
    this.model = config.model ?? "deepseek-chat";
  }

  async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
    if (!this.apiKey) {
      throw new Error("apiKey is required for DeepSeek provider");
    }
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2000,
        ...(params.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`DeepSeek API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model ?? this.model,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}

function resolveProvider(config?: Partial<LLMProviderConfig>): LLMProvider {
  const provider = config?.provider?.toLowerCase() ?? "deterministic";
  const apiKey = config?.apiKey ?? "";
  const model = config?.model;

  switch (provider) {
    case "openai":
      return new OpenAIProvider({ provider, apiKey, model });
    case "anthropic":
      return new AnthropicProvider({ provider, apiKey, model });
    case "gemini":
      return new GeminiProvider({ provider, apiKey, model });
    case "deepseek":
      return new DeepSeekProvider({ provider, apiKey, model });
    default:
      return new DeterministicProvider();
  }
}

export function getLLMProvider(config?: Partial<LLMProviderConfig>): LLMProvider {
  return resolveProvider(config);
}

function buildSystemPrompt(): string {
  return [
    "Eres un agente estratega de marketing digital en HeptaCore.",
    "Tu trabajo es generar una estrategia de contenido para RRSS estructurada y auditable.",
    "Responde SIEMPRE con JSON valido. No incluyas texto fuera del JSON.",
    "El JSON debe tener exactamente estas claves de primer nivel:",
    "  title, businessGoals, positioning, audience, channels, assetChecklist, draftPlan.",
    "businessGoals es un objeto con claves primary, conversion, retention.",
    "positioning es un objeto con claves offer, differentiator, promise.",
    "audience es un objeto con claves primary, secondary, channels.",
    "channels es un array de objetos con network, priority (numero), cadence (string), formats (array de strings).",
    "assetChecklist es un array de strings con insumos minimos necesarios.",
    "draftPlan es un array de maximo 14 objetos con network, format, pillar, titleTemplate, ctaTemplate, hashtags (array), scheduledDay (numero).",
    "No inventes plataformas. Usa solo: instagram, facebook, tiktok, youtube, linkedin, x.",
    "No sugieras publicacion real ni gasto en campanas.",
  ].join("\n");
}

function buildUserPrompt(intake: ClientIntake, context?: Partial<TurpialContext>): string {
  const parts: string[] = [];

  parts.push("Genera una estrategia de contenido para el siguiente cliente:");
  parts.push(`- Negocio: ${intake.businessName}`);
  parts.push(`- Oferta: ${intake.offer}`);
  parts.push(`- Mercado: ${intake.market}`);
  parts.push(`- Audiencia: ${intake.audience}`);
  parts.push(`- Restricciones: ${intake.constraints.join(", ") || "ninguna"}`);
  parts.push(`- Redes preferidas: ${intake.preferredNetworks.join(", ") || "instagram, facebook"}`);

  if (context) {
    if (context.brandVoice?.length) {
      parts.push(`\nVoz de marca: ${context.brandVoice.join(", ")}`);
    }
    if (context.contentPillars?.length) {
      parts.push(`\nPilares de contenido existentes:`);
      for (const p of context.contentPillars) {
        parts.push(`  - ${p.name}: ${p.description}`);
      }
    }
    if (context.existingAssets?.length) {
      parts.push(`\nActivos disponibles (${context.existingAssets.length}):`);
      for (const a of context.existingAssets.slice(0, 20)) {
        parts.push(`  - ${a.filename} (${a.kind})`);
      }
    }
    if (context.constraints?.length) {
      parts.push(`\nRestricciones adicionales: ${context.constraints.join(", ")}`);
    }
  }

  parts.push("\nDevuelve el JSON con la estrategia completa.");
  return parts.join("\n");
}

export async function generateStrategyWithLLM(
  intake: ClientIntake,
  context?: Partial<TurpialContext>,
  providerConfig?: Partial<LLMProviderConfig>,
): Promise<{ strategy: StrategyOutput; provider: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const provider = getLLMProvider(providerConfig);

  if (provider.provider === "deterministic") {
    return {
      strategy: buildDeterministicStrategy(intake, context),
      provider: "deterministic",
    };
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(intake, context);

    const result = await provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 3000,
      responseFormat: "json_object",
    });

    const parsed = JSON.parse(result.content) as StrategyOutput;
    return {
      strategy: validateStrategyOutput(parsed, intake),
      provider: provider.provider,
      usage: result.usage ? { promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens } : undefined,
    };
  } catch (err) {
    console.warn(`LLM strategy generation failed (${provider.provider}), falling back to deterministic:`, err instanceof Error ? err.message : err);
    return {
      strategy: buildDeterministicStrategy(intake, context),
      provider: `deterministic (fallback from ${provider.provider})`,
    };
  }
}

function buildDeterministicStrategy(
  intake: ClientIntake,
  context?: Partial<TurpialContext>,
): StrategyOutput {
  const base = reframeOffer(intake);
  const draftPlan = generateDraftPlan(intake, 14);

  return {
    title: base.title,
    businessGoals: {
      ...(base.businessGoals as Record<string, string>),
      ...(context?.contentPillars?.length
        ? { pillars: context.contentPillars.map((p) => p.name).join(", ") }
        : {}),
    },
    positioning: {
      ...(base.positioning as Record<string, string>),
      ...(context?.brandVoice?.length
        ? { voice: context.brandVoice.join(" / ") }
        : {}),
    },
    audience: base.audience as Record<string, string>,
    channels: base.channels,
    assetChecklist: base.assetChecklist,
    draftPlan,
  };
}

function validateStrategyOutput(parsed: StrategyOutput, intake: ClientIntake): StrategyOutput {
  return {
    title: parsed.title ?? `Estrategia ${intake.businessName}`,
    businessGoals: parsed.businessGoals ?? {},
    positioning: parsed.positioning ?? {},
    audience: parsed.audience ?? {},
    channels: Array.isArray(parsed.channels)
      ? parsed.channels.map((ch) => ({
          network: ch.network ?? "instagram",
          priority: typeof ch.priority === "number" ? ch.priority : 1,
          cadence: ch.cadence ?? "1-2 posts/semana",
          formats: Array.isArray(ch.formats) ? ch.formats : ["feed"],
        }))
      : [],
    assetChecklist: Array.isArray(parsed.assetChecklist) ? parsed.assetChecklist : [],
    draftPlan: Array.isArray(parsed.draftPlan)
      ? parsed.draftPlan.map((d) => ({
          network: d.network ?? "instagram",
          format: d.format ?? "feed",
          pillar: d.pillar ?? "general",
          titleTemplate: d.titleTemplate ?? "",
          ctaTemplate: d.ctaTemplate ?? "",
          hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
          scheduledDay: typeof d.scheduledDay === "number" ? d.scheduledDay : 1,
        }))
      : [],
  };
}
