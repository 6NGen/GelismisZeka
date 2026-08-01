import index from "@/data/kutuphane-index.json";

import type { Analysis } from "./schema";
import { topicKey } from "./turkish";

/**
 * Kütüphane — önceden üretilmiş, elle gözden geçirilmiş analizler.
 *
 * Amaç iki katlıdır ve ikincisi birincisinden önemlidir:
 *
 *  1. KOTA. Kütüphanedeki bir mevzu hiç model çağrısı yapmaz. Halka açık bir
 *     adreste trafiğin büyük kısmı aynı birkaç mevzuya gider; onlar burada
 *     durursa kota yalnız YENİ mevzular için harcanır.
 *
 *  2. DOĞRULUK. Kütüphane içeriği kullanıcının önünde canlı üretilmez;
 *     üretilir, İNSAN TARAFINDAN OKUNUR, sonra depoya girer. İlimler arası
 *     bağların ve Arapça terimlerin sessizce yanlış olma riski ancak böyle
 *     kesilir. Canlı üretimde bu denetim imkânsızdır.
 *
 * YÜKLEME BİÇİMİ ÖNEMLİ: yalnız dizin paketlenir (mevzu adı → dosya adı,
 * mevzu başına birkaç bayt). Analizlerin gövdesi `public/kutuphane/` altında
 * durur ve istendiğinde indirilir. Hepsi paketlenseydi 200 mevzuluk bir
 * kütüphane istemci paketine megabaytlar eklerdi.
 */

type Girdi = { slug: string; topic: string };

const GIRDILER = index as Girdi[];

const ARAMA = new Map(GIRDILER.map((g) => [topicKey(g.topic), g]));

/**
 * Statik dışa aktarımda site alt dizinde sunulur (`/GelismisZeka`). `fetch`
 * bunu kendiliğinden eklemez — `next/link` ve `next/image` ekler, ham istek
 * eklemez — bu yüzden önek burada elle konur.
 */
const BASE = process.env.NEXT_PUBLIC_GZ_BASE_PATH ?? "";

export function kutuphanedeVar(topic: string): boolean {
  return ARAMA.has(topicKey(topic));
}

/** Kütüphanedeki bütün mevzular — giriş çubuğundaki çipler buradan gelir. */
export function kutuphaneMevzulari(): string[] {
  return GIRDILER.map((g) => g.topic);
}

/**
 * Mevzuun analizini getirir. Kütüphanede yoksa null döner ve akış modele gider.
 * Ağ hatasında da null döner: kütüphane bir hızlandırma katmanıdır, erişilemezse
 * uygulama durmaz, yalnız o mevzu için model çağrısı yapılır.
 */
export async function kutuphanedenGetir(topic: string): Promise<Analysis | null> {
  const girdi = ARAMA.get(topicKey(topic));
  if (!girdi) return null;

  try {
    const res = await fetch(`${BASE}/kutuphane/${girdi.slug}.json`, { cache: "force-cache" });
    if (!res.ok) return null;
    return (await res.json()) as Analysis;
  } catch {
    return null;
  }
}
