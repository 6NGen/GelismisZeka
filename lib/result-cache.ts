import "server-only";

import type { ModeKey } from "./modes";
import type { ModeResult } from "./schema";
import { topicKey } from "./turkish";

/**
 * Sunucu tarafı sonuç önbelleği — aynı mevzu ikinci kez sorulduğunda modele
 * hiç gidilmez.
 *
 * `lib/cache.ts` elle yazılmış tanıtım örneklerini tutar; burası ise modelin
 * ürettiği sonuçları tutar. İkisi ayrıdır: biri güvence, bu ise kota koruması.
 *
 * Halka açık bir adreste aynı birkaç mevzu tekrar tekrar sorulur ("faiz",
 * "definecilik", günün gündemi). Her tekrar 4 model çağrısı demektir; önbellek
 * bu tekrarların tamamını sıfıra indirir.
 *
 * SINIR: bellek süreç başınadır. Sunucusuz ortamda her örnek kendi tablosunu
 * tutar ve örnek yenilendiğinde tablo boşalır — yani bu bir garanti değil,
 * gerçek trafikte işe yarayan bir azaltmadır. Sert tavan lib/budget.ts'tedir.
 */

const TTL_MS = Number(process.env.GZ_CACHE_TTL_HOURS ?? 24) * 60 * 60 * 1000;

/** Bellek sızıntısını önleyen üst sınır; aşılınca en eski kayıt düşer. */
const MAX_ENTRIES = 300;

type Entry = { at: number; result: ModeResult };

const store = new Map<string, Entry>();

function keyOf(mode: ModeKey, topic: string): string {
  return `${mode}|${topicKey(topic)}`;
}

export function getResult(mode: ModeKey, topic: string): ModeResult | null {
  const key = keyOf(mode, topic);
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() - entry.at > TTL_MS) {
    store.delete(key);
    return null;
  }

  // Map ekleme sırasını korur; okunan kaydı sona taşımak onu en yeni yapar,
  // böylece taşma temizliği gerçekten en az kullanılanı atar.
  store.delete(key);
  store.set(key, entry);
  return entry.result;
}

export function putResult(mode: ModeKey, topic: string, result: ModeResult): void {
  const key = keyOf(mode, topic);
  store.delete(key);
  store.set(key, { at: Date.now(), result });

  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/** Tanı amaçlı; üretim akışında kullanılmaz. */
export function resultCacheSize(): number {
  return store.size;
}
