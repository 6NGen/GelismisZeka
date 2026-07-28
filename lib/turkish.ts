/**
 * Türkçe karakter tuzağı — 01-MİMARİ §6.
 *
 * JavaScript'in `toUpperCase()` metodu Türkçe'de bozuk çalışır: "i" harfini
 * "İ" değil "I" yapar. Kitap üretiminde tam bu hata 47 başlığı bozdu.
 * Bu dosyadaki yardımcılar dışında büyütme/küçültme yapılmamalıdır.
 *
 * CSS tarafında `text-transform: uppercase` kullanılan her eleman `lang="tr"`
 * taşımalıdır; aksi halde tarayıcı aynı hatayı yapar.
 */

export function trUpper(s: string): string {
  return s.toLocaleUpperCase("tr");
}

export function trLower(s: string): string {
  return s.toLocaleLowerCase("tr");
}

/** Önbellek anahtarı: Türkçe'ye göre küçültülmüş, boşlukları sadeleştirilmiş mevzu. */
export function topicKey(topic: string): string {
  return trLower(topic).trim().replace(/\s+/g, " ");
}
