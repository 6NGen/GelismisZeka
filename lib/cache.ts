import definecilik from "@/data/cached/definecilik.json";

import type { Analysis } from "./schema";
import { topicKey } from "./turkish";

/**
 * Faz 1 önbelleği: elle yazılmış statik analizler.
 *
 * Amaç maliyet değil güvence — ilk gösterimde uygulamanın çalıştığını
 * kanıtlayan en az bir tam örnek API'ye hiç gitmeden açılmalıdır.
 * Faz 2'de bu tablo Supabase'e taşınır; arayüz sözleşmesi aynı kalır.
 */

const CACHED: Analysis[] = [definecilik as Analysis];

const INDEX = new Map(CACHED.map((a) => [topicKey(a.topic), a]));

export function getCached(topic: string): Analysis | null {
  return INDEX.get(topicKey(topic)) ?? null;
}

export function isCached(topic: string): boolean {
  return INDEX.has(topicKey(topic));
}

/** Giriş çubuğunda gösterilen hazır mevzular. */
export const EXAMPLES: string[] = [
  "Definecilik",
  "Faiz",
  "Beslenme uzmanlığı",
];
