import assert from "node:assert/strict";
import { test } from "node:test";

import { mizanWidths, verdict } from "../lib/modes";
import { slugify, topicKey, trLower, trUpper } from "../lib/turkish";

/**
 * Türkçe büyütme tuzağı ve Mîzân hükmü.
 *
 * İkisi de "çalışıyor gibi görünüp yanlış olan" cinsten: toUpperCase() hata
 * fırlatmaz, yalnız "İ" yerine "I" yazar. Mîzân hükmü de her zaman bir cümle
 * döndürür, yalnız yanlış tarafı gösterebilir.
 */

test("Türkçe büyütme i→İ yapar, küçültme I→ı", () => {
  assert.equal(trUpper("iğne"), "İĞNE");
  assert.equal(trUpper("ilim"), "İLİM");
  assert.notEqual(trUpper("ilim"), "ILIM");
  assert.equal(trLower("IŞIK"), "ışık");
  assert.equal(trLower("İLİM"), "ilim");
});

test("önbellek anahtarı büyük/küçük harf ve boşluk farkını siler", () => {
  assert.equal(topicKey("  DEFİNECİLİK  "), "definecilik");
  assert.equal(topicKey("Definecilik"), topicKey("definecilik"));
  assert.equal(topicKey("Dil   ve   Anlatım"), "dil ve anlatım");
});

test("slug Türkçe harfleri düzleştirir ve çakışma üretmez", () => {
  assert.equal(slugify("Fıkıh"), "fikih");
  assert.equal(slugify("Coğrafya"), "cografya");
  assert.equal(slugify("Belâgat"), "belagat");
  assert.equal(slugify("Usûl-i Fıkıh"), "usul-i-fikih");
  assert.equal(slugify("Beslenme uzmanlığı"), "beslenme-uzmanligi");
  assert.equal(slugify("Dil ve Anlatım"), "dil-ve-anlatim");

  // "İ" düzleştirmesi küçültmeden SONRA olmalı; ters sırada "I" çıkar.
  assert.equal(slugify("İLİM"), "ilim");
  assert.ok(!slugify("İLİM").includes("i̇"), "birleşik nokta kalmamalı");

  // Baştaki/sondaki tireler kırpılır, ardışık ayraçlar tekilleşir.
  assert.equal(slugify("  --Faiz??  "), "faiz");
});

test("mîzân hükmü sayıların gösterdiği tarafı söyler", () => {
  assert.match(verdict({ tez: 2, karsi: 8 }), /Karşı-düğüm ağır/);
  assert.match(verdict({ tez: 8, karsi: 2 }), /Tez ağır/);
  assert.match(verdict({ tez: 5, karsi: 5 }), /dengede/);
});

test("mîzân çubuğu 0-0 girdisinde NaN üretmez", () => {
  const w = mizanWidths({ tez: 0, karsi: 0 });
  assert.ok(Number.isFinite(w.tez) && Number.isFinite(w.karsi));
  assert.equal(w.tez + w.karsi, 0);

  const oran = mizanWidths({ tez: 3, karsi: 7 });
  assert.equal(Math.round(oran.tez), 30);
  assert.equal(Math.round(oran.karsi), 70);
});
