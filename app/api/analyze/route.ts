import { NextResponse } from "next/server";

import { AnalyzeError, runStep } from "@/lib/model";
import { kutuphaneAdimi } from "@/lib/kutuphane-server";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { getResult, putResult } from "@/lib/result-cache";
import { AnalyzeRequestSchema, type AnalyzeResponse, type ErrorCode } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(code: ErrorCode, error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json<AnalyzeResponse>({ ok: false, error, code }, { status, headers });
}

export async function POST(request: Request): Promise<NextResponse<AnalyzeResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INPUT", "İstek gövdesi okunamadı.", 400);
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Geçersiz istek.";
    return fail("INPUT", message, 400);
  }

  const verdict = checkRateLimit(clientKey(request.headers));
  if (!verdict.allowed) {
    return fail("RATE", "Çok fazla istek — biraz sonra tekrar deneyin.", 429, {
      "retry-after": String(verdict.retryAfterSec),
    });
  }

  const { topic, step } = parsed.data;

  // Üç kademeli arama, ucuzdan pahalıya: kütüphane (kalıcı, gözden geçirilmiş)
  // → çalışma-zamanı önbelleği (süreç ömrü kadar) → model.
  // Hız sınırından SONRA bakılır: ucuz olmaları uç noktanın sınırsız
  // dövülmesini serbest bırakmaz.
  const kutuphaneden = kutuphaneAdimi(step, topic);
  if (kutuphaneden) {
    return NextResponse.json<AnalyzeResponse>({ ok: true, data: kutuphaneden });
  }

  const cached = getResult(step, topic);
  if (cached) {
    return NextResponse.json<AnalyzeResponse>({ ok: true, data: cached });
  }

  try {
    const data = await runStep(step, topic);
    putResult(step, topic, data);
    return NextResponse.json<AnalyzeResponse>({ ok: true, data });
  } catch (err) {
    if (err instanceof AnalyzeError) {
      return fail(err.code, err.message, err.code === "RATE" ? 429 : 502);
    }
    // Beklenmeyen hatanın ayrıntısı istemciye sızmaz; sunucu günlüğünde kalır.
    console.error("[analyze] beklenmeyen hata:", err);
    return fail("UPSTREAM", "Analiz sırasında beklenmeyen bir hata oluştu.", 500);
  }
}
