import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import index from "@/data/kutuphane-index.json";

import type { ModeKey } from "./modes";
import type { Analysis, ModeResult } from "./schema";
import { topicKey } from "./turkish";

/**
 * Kütüphanenin sunucu tarafındaki karşılığı.
 *
 * İstemci zaten kütüphaneye bakıyor ve orada bulursa API'ye hiç gelmiyor.
 * Buradaki denetim onun yedeği değil, kota güvencesinin istemcinin davranışına
 * bağlı kalmaması içindir: uç noktaya doğrudan gelen bir istek de kütüphanedeki
 * bir mevzu için model çağrısı yakmamalı.
 *
 * Gövdeler `public/` altında durur; oradan okunabilmesi için sunucu paketine
 * dâhil edilmeleri gerekir (bkz. next.config.ts → outputFileTracingIncludes).
 * Okuma başarısız olursa akış modele düşer — kütüphane bir hızlandırmadır,
 * erişilemediğinde uygulama durmaz.
 */

type Girdi = { slug: string; topic: string };

const ARAMA = new Map((index as Girdi[]).map((g) => [topicKey(g.topic), g]));

export function kutuphaneAdimi(mode: ModeKey, topic: string): ModeResult | null {
  const girdi = ARAMA.get(topicKey(topic));
  if (!girdi) return null;

  try {
    const yol = join(process.cwd(), "public", "kutuphane", `${girdi.slug}.json`);
    if (!existsSync(yol)) return null;
    const analiz = JSON.parse(readFileSync(yol, "utf8")) as Analysis;
    return analiz[mode] ?? null;
  } catch {
    return null;
  }
}
