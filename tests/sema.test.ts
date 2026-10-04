import assert from "node:assert/strict";
import { test } from "node:test";

import { modeResultSchema, sentenceCount, wordCount } from "../lib/schema";

/**
 * İçerik kuralları — yapılandırılmış çıktının garanti EDEMEDİĞİ kurallar.
 *
 * Şema alanın var olduğunu söyler, "en fazla 15 kelime" olduğunu söylemez.
 * Bu sayımlar sunucuda elle yapılır; bozulduklarında kimse fark etmez, çünkü
 * sonuç yine de ekrana basılır — yalnız kural çiğnenmiş olur.
 */

const dal = (over: Record<string, unknown> = {}) => ({
  name: "Dal Adı",
  ar: "",
  ilim: "",
  word: "Anahtar",
  sentence: "Kısa şerh cümlesi burada durur.",
  para: "Birinci cümle. İkinci cümle.",
  ...over,
});

const sonuc = (n: number, over: Record<string, unknown> = {}, dalOver = {}) => ({
  foot: "Alt not.",
  branches: Array.from({ length: n }, () => dal(dalOver)),
  ...over,
});

test("kelime ve cümle sayıcıları etiketleri yok sayar", () => {
  assert.equal(wordCount("<b>iki</b> kelime"), 2);
  assert.equal(wordCount("   "), 0);
  // Ondalık sayı cümle sonu sayılmamalı.
  assert.equal(sentenceCount("Değer 3.5 oldu. İkinci cümle."), 2);
  assert.equal(sentenceCount("Tek cümle"), 1);
});

test("dal sayısı 3-6 arasında olmalı", () => {
  assert.ok(modeResultSchema("nedir").safeParse(sonuc(3)).success);
  assert.ok(modeResultSchema("nedir").safeParse(sonuc(6)).success);
  assert.ok(!modeResultSchema("nedir").safeParse(sonuc(2)).success);
  assert.ok(!modeResultSchema("nedir").safeParse(sonuc(7)).success);
});

test("name 5, word 2 kelimeyi aşamaz — sınır değerleri dâhil", () => {
  const S = modeResultSchema("nedir");
  assert.ok(S.safeParse(sonuc(4, {}, { name: "bir iki üç dört beş" })).success);
  assert.ok(!S.safeParse(sonuc(4, {}, { name: "bir iki üç dört beş altı" })).success);
  assert.ok(S.safeParse(sonuc(4, {}, { word: "besin ögesi" })).success);
  assert.ok(!S.safeParse(sonuc(4, {}, { word: "bir iki üç" })).success);
});

test("cümle 15 kelimeyi, paragraf 2-3 cümleyi ve 2 vurguyu aşamaz", () => {
  const S = modeResultSchema("nedir");
  const onAlti = Array.from({ length: 16 }, (_, i) => `k${i}`).join(" ");
  assert.ok(!S.safeParse(sonuc(4, {}, { sentence: onAlti })).success);
  assert.ok(!S.safeParse(sonuc(4, {}, { para: "Tek cümle." })).success);
  assert.ok(!S.safeParse(sonuc(4, {}, { para: "Bir. İki. Üç. Dört." })).success);
  assert.ok(
    !S.safeParse(sonuc(4, {}, { para: "<b>a</b> <b>b</b> <b>c</b> bir. İki." })).success,
  );
});

test("Mîzân name/word kuralından muaftır ama tez/karsi zorunludur", () => {
  const S = modeResultSchema("mizan");
  const uzunAd = '"Çok çok çok çok çok uzun bir iddia cümlesi"';

  assert.ok(
    S.safeParse(sonuc(3, {}, { name: uzunAd, word: "Tez 5 — Karşı 5", mizan: { tez: 5, karsi: 5 } }))
      .success,
    "mîzânda uzun name reddedilmemeli",
  );
  assert.ok(!S.safeParse(sonuc(3)).success, "mizan alanı olmadan geçmemeli");
});

test("bağ adımı: mertebe zorunlu, konu mertebesinde ilim zorunlu", () => {
  const S = modeResultSchema("bagli");

  assert.ok(S.safeParse(sonuc(5, { mertebe: "ilim" })).success);
  assert.ok(S.safeParse(sonuc(5, { mertebe: "konu" }, { ilim: "Fizik" })).success);

  assert.ok(!S.safeParse(sonuc(5)).success, "mertebesiz geçmemeli");
  assert.ok(!S.safeParse(sonuc(5, { mertebe: "bölüm" })).success, "uydurma mertebe geçmemeli");
  assert.ok(
    !S.safeParse(sonuc(5, { mertebe: "konu" })).success,
    "konu mertebesinde ilimsiz dal geçmemeli",
  );
});

test("mertebe kuralı yalnız bağ adımına uygulanır", () => {
  // Diğer adımlarda mertebe istenmez; istenseydi üç adım birden düşerdi.
  assert.ok(modeResultSchema("nedir").safeParse(sonuc(4)).success);
  assert.ok(modeResultSchema("nedegildir").safeParse(sonuc(4)).success);
});

test("görsel: beş tür tanınır, uydurma tür ve bozuk sayı reddedilir", () => {
  const S = modeResultSchema("nedir");
  const ile = (gorsel: unknown) => S.safeParse(sonuc(4, { gorsel }));

  assert.ok(ile(undefined).success, "görselsiz sonuç geçerli olmalı");
  assert.ok(
    ile({
      tur: "zaman-cizgisi",
      baslik: "Z",
      seritler: [{ ad: "a", noktalar: [{ etiket: "e", konum: 50 }] }],
    }).success,
  );
  assert.ok(
    ile({
      tur: "sinir",
      baslik: "S",
      sol: { ad: "A", ogeler: ["x"] },
      sag: { ad: "B", ogeler: ["y"] },
      ortak: [],
    }).success,
  );
  assert.ok(
    ile({
      tur: "grafik",
      baslik: "G",
      xEtiket: "x",
      yEtiket: "y",
      egriler: [{ ad: "e", noktalar: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
    }).success,
  );
  assert.ok(
    ile({ tur: "surec", baslik: "S", adimlar: [{ ad: "a", aciklama: "b" }, { ad: "c", aciklama: "d" }] })
      .success,
  );
  assert.ok(ile({ tur: "simulasyon", baslik: "A", model: "atis", hiz: 20, aci: 45 }).success);

  assert.ok(!ile({ tur: "3d-model", baslik: "X" }).success, "uydurma tür geçmemeli");
  assert.ok(
    !ile({ tur: "simulasyon", baslik: "X", model: "roket" }).success,
    "desteklenmeyen simülasyon modeli geçmemeli",
  );
  assert.ok(
    !ile({ tur: "simulasyon", baslik: "X", model: "atis", aci: 400 }).success,
    "90 dereceyi aşan açı geçmemeli",
  );
  assert.ok(
    !ile({
      tur: "grafik",
      baslik: "G",
      xEtiket: "x",
      yEtiket: "y",
      egriler: [{ ad: "e", noktalar: [{ x: 0, y: 0 }, { x: 1, y: Infinity }] }],
    }).success,
    "sonsuz değer grafiği bozar, geçmemeli",
  );
  assert.ok(
    !ile({
      tur: "zaman-cizgisi",
      baslik: "Z",
      seritler: [{ ad: "a", noktalar: [{ etiket: "e", konum: 340 }] }],
    }).success,
    "0-100 dışındaki konum geçmemeli",
  );
});
