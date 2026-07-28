import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { buildUserPrompt, outputSchemaForStep, SYSTEM_PROMPT } from "./prompts";
import { sanitizeDeep } from "./sanitize";
import { schemaForStep, type ErrorCode, type Step, type StepResult } from "./schema";

const MODEL = process.env.GZ_MODEL ?? "claude-sonnet-5";
const MAX_TOKENS = 8000;

/** Anahtar yalnız sunucuda okunur; istemci paketine hiçbir koşulda girmez. */
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AnalyzeError("UPSTREAM", "Sunucuda API anahtarı tanımlı değil.");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export class AnalyzeError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AnalyzeError";
  }
}

/**
 * Model bazen JSON'u ``` çitiyle sarar. Yapılandırılmış çıktı bunu büyük ölçüde
 * engeller ama geri düşüş katmanı ucuz ve bir kez işe yaradığında analizi kurtarır.
 */
export function extractJson(raw: string): unknown {
  let t = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function callOnce(step: Step, topic: string): Promise<StepResult> {
  let message: Anthropic.Message;
  try {
    message = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: outputSchemaForStep(step) },
      },
      messages: [{ role: "user", content: buildUserPrompt(step, topic) }],
    });
  } catch (err) {
    // Yapılandırma hatası gibi kendi tanımladığımız hatalar olduğu gibi geçer;
    // aksi halde "anahtar yok" tanısı "modele ulaşılamadı"ya dönüşüp kaybolur.
    if (err instanceof AnalyzeError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new AnalyzeError("RATE", "Model hız sınırına takıldı.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AnalyzeError("UPSTREAM", `Model çağrısı başarısız (${err.status ?? "?"}).`);
    }
    throw new AnalyzeError("UPSTREAM", "Modele ulaşılamadı.");
  }

  if (message.stop_reason === "refusal") {
    throw new AnalyzeError("UPSTREAM", "Model bu mevzuyu analiz etmeyi reddetti.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new AnalyzeError("PARSE", "Model çıktısı tamamlanmadan kesildi.");
  }

  let parsed: unknown;
  try {
    parsed = extractJson(textOf(message));
  } catch {
    throw new AnalyzeError("PARSE", "Model çıktısı JSON olarak okunamadı.");
  }

  const result = schemaForStep(step).safeParse(parsed);
  if (!result.success) {
    throw new AnalyzeError("PARSE", "Model çıktısı beklenen şemaya uymadı.");
  }

  return sanitizeDeep(result.data);
}

/**
 * Bir adımı çalıştırır. Ayrıştırma/şema hatasında bir kez sessizce tekrar dener;
 * hız sınırı ve bağlantı hatalarında tekrar denemez — bekleme çözüm değildir.
 */
export async function runStep(step: Step, topic: string): Promise<StepResult> {
  try {
    return await callOnce(step, topic);
  } catch (err) {
    if (err instanceof AnalyzeError && err.code === "PARSE") {
      return await callOnce(step, topic);
    }
    throw err;
  }
}
