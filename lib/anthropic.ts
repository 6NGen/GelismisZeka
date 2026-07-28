import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { ModeKey } from "./modes";
import { buildUserPrompt, outputSchemaForMode, RETRY_SUFFIX, systemPromptFor } from "./prompts";
import { sanitizeModeResult } from "./sanitize";
import { ModeResultZ, type ErrorCode, type ModeResult } from "./schema";

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

/**
 * Mîzân modunda KELİME katmanı sayıların birebir yansımasıdır
 * (02-VERİ-ŞEMASI §5). Modelin yazdığı metne değil, tarttığı sayıya güvenilir:
 * böylece "Tez 3 — Karşı 7" yazıp {tez:1, karsi:9} veren bir çıktı ekranda
 * kendisiyle çelişemez.
 */
function alignMizanWord(result: ModeResult): ModeResult {
  return {
    ...result,
    branches: result.branches.map((b) =>
      b.mizan ? { ...b, word: `Tez ${b.mizan.tez} — Karşı ${b.mizan.karsi}` } : b,
    ),
  };
}

async function callOnce(mode: ModeKey, topic: string, isRetry = false): Promise<ModeResult> {
  // 03-PROMPTLAR §5: Mîzân'ın sistem promptu ilk üç çağrınınkinden farklıdır.
  const system = systemPromptFor(mode);
  // 03-PROMPTLAR §7: tekrar denemede ek talimat kullanıcı promptuna eklenir.
  const user = isRetry
    ? `${buildUserPrompt(mode, topic)}\n\n${RETRY_SUFFIX}`
    : buildUserPrompt(mode, topic);

  let message: Anthropic.Message;
  try {
    message = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: outputSchemaForMode(mode) },
      },
      messages: [{ role: "user", content: user }],
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

  const first = ModeResultZ.safeParse(parsed);
  if (!first.success) {
    throw new AnalyzeError("PARSE", "Model çıktısı beklenen şemaya uymadı.");
  }

  // Temizlik bir alanı boşaltabilir (yalnız etiketten ibaret bir paragraf gibi).
  // Bu yüzden temizlenmiş nesne bir kez daha doğrulanır.
  const cleaned = ModeResultZ.safeParse(sanitizeModeResult(first.data));
  if (!cleaned.success) {
    throw new AnalyzeError("PARSE", "Model çıktısı temizlendikten sonra geçersiz kaldı.");
  }

  return mode === "mizan" ? alignMizanWord(cleaned.data) : cleaned.data;
}

/**
 * Bir adımı çalıştırır. Ayrıştırma/şema hatasında TEK SEFER, §7'deki ek
 * talimatla tekrar dener; ikinci deneme de tutmazsa adım hatalı işaretlenir.
 * Hız sınırı ve bağlantı hatalarında tekrar denemez — bekleme çözüm değildir.
 */
export async function runStep(mode: ModeKey, topic: string): Promise<ModeResult> {
  try {
    return await callOnce(mode, topic);
  } catch (err) {
    if (err instanceof AnalyzeError && err.code === "PARSE") {
      return await callOnce(mode, topic, true);
    }
    throw err;
  }
}
