import "server-only";

/**
 * Günlük model çağrısı tavanı — ücretsiz katmanın bir günde tükenmemesi için.
 *
 * Hız sınırı (lib/rate-limit.ts) tek bir ziyaretçinin aşırıya kaçmasını
 * durdurur; bu ise toplamı sınırlar. İkisi farklı şeyi korur: biri kullanıcıya
 * karşı, bu ise kotaya karşıdır. Yüz ayrı ziyaretçi hız sınırına hiç
 * takılmadan kotayı bitirebilir.
 *
 * Sayaç her model çağrısında artar — §7 tekrarı da bir çağrıdır ve sayılır;
 * kota tarafında da öyle sayıldığı için doğru olan budur.
 *
 * SINIR: sayaç süreç belleğindedir. Sunucusuz ortamda birden çok örnek
 * çalışıyorsa gerçek tavan örnek sayısıyla çarpılır. Yani bu tavan kotayı
 * garanti etmez, tüketim hızını bilinen bir kata indirir. Kesin garanti,
 * Faz 2'deki paylaşımlı sayaçla (Redis) gelir.
 */

const DEFAULT_CAP = 200;

function cap(): number {
  const raw = Number(process.env.GZ_DAILY_CALL_CAP);
  // 0 geçerli bir değerdir: canlı analizi tamamen kapatmak anlamına gelir.
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_CAP;
}

/** Gün sınırı UTC'dir; sunucunun yerel saati ortamdan ortama değişir. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

let day = today();
let used = 0;

function roll(): void {
  const now = today();
  if (now !== day) {
    day = now;
    used = 0;
  }
}

export type BudgetState = { used: number; cap: number; remaining: number };

export function budgetState(): BudgetState {
  roll();
  const limit = cap();
  return { used, cap: limit, remaining: Math.max(0, limit - used) };
}

/**
 * Bir model çağrısı için bütçeden pay ayırır. Çağrıdan ÖNCE çağrılır ve
 * yalnızca izin verdiğinde sayaç artar.
 */
export function claimCall(): boolean {
  roll();
  if (used >= cap()) return false;
  used += 1;
  return true;
}

/** Yalnız sınama içindir; üretim akışında kullanılmaz. */
export function resetBudget(): void {
  day = today();
  used = 0;
}
