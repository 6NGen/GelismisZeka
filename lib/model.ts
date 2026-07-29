import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";
import type { z } from "zod";

import type { ModeKey } from "./modes";
import { buildUserPrompt, outputSchemaForMode, RETRY_SUFFIX, systemPromptFor } from "./prompts";
import { sanitizeModeResult } from "./sanitize";
import { modeResultSchema, type ErrorCode, type ModeResult } from "./schema";

/**
 * Model katmanı — Google Gemini.
 *
 * Sağlayıcıya bağlı olan tek dosya budur. Promptlar, şema, içerik kuralları,
 * temizlik ve Mîzân yalıtımı sağlayıcıdan bağımsızdır ve burada değişmez.
 */

const MODEL = process.env.GZ_MODEL ?? "gemini-2.5-flash";

/**
 * Çıktı bütçesi. Gemini Flash modellerinde düşünme varsayılan olarak açıktır
 * ve bu bütçeden yer. Bütçe dar tutulursa model düşünmeyi bitirmeden kesilir,
 * geriye boş metin ve MAX_TOKENS kalır. Bu yüzden hem bütçe geniş tutulur hem
 * de düşünme kapatılır: burada istenen iş yaratıcı değil, biçimi belli bir
 * JSON üretmektir.
 */
const MAX_OUTPUT_TOKENS = 8192;
const THINKING_BUDGET = 0;

/** Anahtar yalnız sunucuda okunur; istemci paketine hiçbir koşulda girmez. */
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AnalyzeError("UPSTREAM", "Sunucuda API anahtarı tanımlı değil.");
    // Testte sahte bir uç noktaya yönlendirmek için; üretimde tanımsızdır.
    const baseUrl = process.env.GZ_BASE_URL;
    client = new GoogleGenAI({
      apiKey,
      ...(baseUrl ? { httpOptions: { baseUrl } } : {}),
    });
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

/**
 * Doğrulama hatasını tek cümleye indirger. Ayrıntı sunucuda kalır; istemciye
 * yalnız hangi alanın neden reddedildiği gider — ham model çıktısı gitmez.
 */
function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Model çıktısı beklenen şemaya uymadı.";
  const path = issue.path.join(".");
  return `Model çıktısı şemaya uymadı${path ? ` (${path})` : ""}: ${issue.message}`;
}

/**
 * Mîzân'da KELİME katmanı modele yazdırılmaz; `tez` ve `karsi` sayılarından
 * türetilir. Tek doğruluk kaynağı sayılardır: model "Tez 3 — Karşı 7" yazıp
 * {tez:1, karsi:9} verse bile ekran kendisiyle çelişemez.
 */
function deriveMizanWord(result: ModeResult): ModeResult {
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

  let text: string | undefined;
  let finishReason: string | undefined;

  try {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingBudget: THINKING_BUDGET },
        responseMimeType: "application/json",
        responseJsonSchema: outputSchemaForMode(mode),
      },
    });
    text = response.text;
    finishReason = response.candidates?.[0]?.finishReason;
  } catch (err) {
    // Yapılandırma hatası gibi kendi tanımladığımız hatalar olduğu gibi geçer;
    // aksi halde "anahtar yok" tanısı "modele ulaşılamadı"ya dönüşüp kaybolur.
    if (err instanceof AnalyzeError) throw err;
    if (err instanceof ApiError) {
      if (err.status === 429) {
        throw new AnalyzeError("RATE", "Model kota sınırına takıldı — biraz sonra tekrar deneyin.");
      }
      throw new AnalyzeError("UPSTREAM", `Model çağrısı başarısız (${err.status}).`);
    }
    throw new AnalyzeError("UPSTREAM", "Modele ulaşılamadı.");
  }

  if (finishReason === "MAX_TOKENS") {
    throw new AnalyzeError("PARSE", "Model çıktısı tamamlanmadan kesildi.");
  }
  // Güvenlik süzgeci ya da benzeri bir sebeple üretim durduysa metin gelmez.
  if (!text) {
    throw new AnalyzeError(
      "UPSTREAM",
      finishReason && finishReason !== "STOP"
        ? `Model bu mevzuyu yanıtlamadı (${finishReason}).`
        : "Model boş yanıt döndü.",
    );
  }

  // Biçim + içerik kuralları birlikte doğrulanır: yapılandırılmış çıktı yalnız
  // alanların varlığını garanti eder, "en fazla 15 kelime" gibi kuralları değil.
  const schema = modeResultSchema(mode);

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new AnalyzeError("PARSE", "Model çıktısı JSON olarak okunamadı.");
  }

  const first = schema.safeParse(parsed);
  if (!first.success) {
    throw new AnalyzeError("PARSE", firstIssue(first.error));
  }

  // Temizlik bir alanı boşaltabilir ve kelime/cümle sayısını değiştirebilir;
  // KELİME katmanı da burada sayılardan türetilir. Bu yüzden ortaya çıkan
  // nesne bir kez daha aynı şemadan geçirilir.
  const finalized = deriveMizanWord(sanitizeModeResult(first.data));

  const cleaned = schema.safeParse(finalized);
  if (!cleaned.success) {
    throw new AnalyzeError("PARSE", firstIssue(cleaned.error));
  }

  return cleaned.data;
}

/**
 * Bir adımı çalıştırır. Ayrıştırma/şema hatasında TEK SEFER, §7'deki ek
 * talimatla tekrar dener; ikinci deneme de tutmazsa adım hatalı işaretlenir.
 * Kota sınırı ve bağlantı hatalarında tekrar denemez — bekleme çözüm değildir.
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
