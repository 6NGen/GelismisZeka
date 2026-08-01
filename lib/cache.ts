import { kutuphaneMevzulari, kutuphanedeVar, kutuphanedenGetir } from "./kutuphane";
import type { Analysis } from "./schema";

/**
 * Önbellek arayüzü — gövdesi artık `lib/kutuphane.ts`.
 *
 * Faz 1'de burada elle yazılmış tek bir örnek dururdu ve amacı maliyet değil
 * güvenceydi. Kütüphaneyle birlikte amaç ikiye çıktı: aynı mevzu tekrar
 * sorulduğunda model çağrısı yapılmaması (kota) ve yayına giren içeriğin
 * önceden okunmuş olması (doğruluk).
 *
 * Sözleşme korunuyor; değişen tek şey `getCached`'in artık eşzamansız olması —
 * analizlerin gövdesi paketlenmiyor, istendiğinde indiriliyor.
 */

export async function getCached(topic: string): Promise<Analysis | null> {
  return kutuphanedenGetir(topic);
}

export function isCached(topic: string): boolean {
  return kutuphanedeVar(topic);
}

/**
 * Giriş çubuğundaki hazır mevzular. Kütüphaneden türetilir; elle tutulan bir
 * liste, kütüphaneyle ayrı düşüp var olmayan mevzuyu önerebilirdi.
 */
export const EXAMPLES: string[] = kutuphaneMevzulari().slice(0, 6);
