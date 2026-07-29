import "server-only";

/**
 * Bellek içi hız sınırı — IP başına saatte 20 istek (varsayılan).
 *
 * Bir analiz 4 istektir; yani varsayılan tavan saatte 5 analiz eder.
 * `GZ_RATE_LIMIT` ile değiştirilebilir: 4'ün katları vermek anlamlıdır,
 * aksi halde saatin son analizi ortasından kesilir.
 *
 * Sınır süreç başınadır: birden çok sunucu örneği çalışıyorsa gerçek tavan
 * örnek sayısıyla çarpılır. MVP için yeterli; Faz 2'de Redis'e taşınacak.
 * Amaç kötü niyetli kullanımı durdurmak değil, kazara oluşan maliyeti kesmek.
 */

const WINDOW_MS = 60 * 60 * 1000;

const DEFAULT_LIMIT = 20;

function limit(): number {
  const raw = Number(process.env.GZ_RATE_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LIMIT;
}

const hits = new Map<string, number[]>();

/** Sızıntıyı önlemek için pencere dışında kalan anahtarları ara sıra temizler. */
function sweep(now: number): void {
  for (const [key, times] of hits) {
    const live = times.filter((t) => now - t < WINDOW_MS);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

let lastSweep = 0;

export type RateVerdict = { allowed: boolean; remaining: number; retryAfterSec: number };

export function checkRateLimit(key: string): RateVerdict {
  const now = Date.now();

  if (now - lastSweep > WINDOW_MS) {
    sweep(now);
    lastSweep = now;
  }

  const LIMIT = limit();
  const times = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (times.length >= LIMIT) {
    const oldest = times[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  times.push(now);
  hits.set(key, times);
  return { allowed: true, remaining: LIMIT - times.length, retryAfterSec: 0 };
}

/** İstemci IP'si — ters vekil arkasında `x-forwarded-for` ilk değeri. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "bilinmeyen";
}
