import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { MODES } from "../lib/modes";
import {
  buildUserPrompt,
  MIZAN_SYSTEM_PROMPT,
  outputSchemaForMode,
  RETRY_SUFFIX,
  SYSTEM_PROMPT,
  systemPromptFor,
} from "../lib/prompts";

/**
 * Protokol testleri — projenin en pahalı kuralları.
 *
 * Buradaki her şey bir performans ya da sadelik iyileştirmesiyle sessizce
 * bozulabilecek cinsten. Mîzân'ın yalıtımı tam olarak böyle kaybolur: biri
 * "dört çağrıyı birleştirip bağlamı taşıyalım" der ve protokol iptal olur.
 * O yüzden kural yorumda değil, testte durur.
 */

test("Mîzân çağrısına önceki adımların çıktısı GÖNDERİLEMEZ — imza seviyesinde", () => {
  // Yalıtım niyetle değil imzayla korunur: prompt kuran hiçbir fonksiyon
  // önceki sonuçları parametre olarak alamaz. Fonksiyonun aritesi 2'yi
  // (mode, topic) geçiyorsa bir yerden bağlam sızdırılıyor demektir.
  assert.equal(buildUserPrompt.length, 2, "buildUserPrompt yalnız (mode, topic) almalı");
  assert.equal(systemPromptFor.length, 1, "systemPromptFor yalnız (mode) almalı");
  assert.equal(outputSchemaForMode.length, 1, "outputSchemaForMode yalnız (mode) almalı");
});

test("Mîzân promptunun gövdesinde yalnız mevzu bulunur", () => {
  const digerleri = MODES.filter((m) => m !== "mizan").map((m) =>
    buildUserPrompt(m, "Definecilik"),
  );
  const mizan = buildUserPrompt("mizan", "Definecilik");

  // Diğer adımlara özgü ayırt edici ibareler mîzân promptunda geçmemeli.
  for (const imza of ["BU NEDİR", "BU NE DEĞİLDİR", "BU NEYE BAĞLIDIR", "MERTEBE"]) {
    assert.ok(!mizan.includes(imza), `mîzân promptunda "${imza}" bulunmamalı`);
  }
  // Ve mîzân promptu diğerlerinin hiçbirinin kopyası olmamalı.
  for (const p of digerleri) assert.notEqual(mizan, p);
});

test("Mîzân'ın sistem promptu ayrıdır ve iki koruma cümlesini taşır", () => {
  assert.notEqual(MIZAN_SYSTEM_PROMPT, SYSTEM_PROMPT);
  assert.equal(systemPromptFor("mizan"), MIZAN_SYSTEM_PROMPT);
  for (const m of MODES.filter((x) => x !== "mizan")) {
    assert.equal(systemPromptFor(m), SYSTEM_PROMPT);
  }

  // 03-PROMPTLAR §6 — bu iki cümle kaldırılırsa protokol bozulur.
  assert.ok(
    MIZAN_SYSTEM_PROMPT.includes("körü körüne çürütmezsin"),
    "körü körüne çürütme yasağı kayboldu",
  );
  assert.ok(
    MIZAN_SYSTEM_PROMPT.includes("mevzuya KARŞI olan uç bir iddia"),
    "uç karşı-tez zorunluluğu kayboldu",
  );
});

test("mevzu yerine konurken düzenli ifade kalıbı gibi yorumlanmaz", () => {
  // "$&" String.replace için "eşleşmenin tamamı" demektir. Düz metinle
  // değiştirilseydi mevzu bozulur, üstelik fark edilmezdi.
  const tuzak = 'Faiz $& $1 $` kaçış';
  assert.ok(buildUserPrompt("nedir", tuzak).includes(tuzak));
});

test("tekrar talimatı yalnız ikinci denemeye eklenir ve ilkini kirletmez", () => {
  const ilk = buildUserPrompt("nedir", "Faiz");
  assert.ok(!ilk.includes(RETRY_SUFFIX));
  assert.ok(RETRY_SUFFIX.trim().length > 0);
});

test("çıktı şeması moda göre değişir; bağ adımı mertebe ister", () => {
  const bagli = outputSchemaForMode("bagli") as {
    required: string[];
    properties: Record<string, unknown>;
  };
  assert.ok(bagli.required.includes("mertebe"), "bağ şemasında mertebe zorunlu olmalı");

  const nedir = outputSchemaForMode("nedir") as { required: string[] };
  assert.ok(!nedir.required.includes("mertebe"));

  // Görsel her modda isteğe bağlıdır: "gerektiğinde" kuralı.
  for (const m of MODES) {
    const s = outputSchemaForMode(m) as { required: string[]; properties: Record<string, unknown> };
    assert.ok(s.properties.gorsel, `${m}: görsel alanı şemada olmalı`);
    assert.ok(!s.required.includes("gorsel"), `${m}: görsel zorunlu OLMAMALI`);
  }
});

test("promptlardaki kelime sınırları şemadakiyle aynıdır", () => {
  // Ayrılırlarsa model, kendisine hiç söylenmemiş bir kuraldan düşer.
  const sema = readFileSync(new URL("../lib/schema.ts", import.meta.url), "utf8");
  const adSinir = /MAX_NAME_WORDS = (\d+)/.exec(sema)?.[1];
  const kelimeSinir = /MAX_WORD_WORDS = (\d+)/.exec(sema)?.[1];

  assert.ok(adSinir && kelimeSinir, "şemadaki sınırlar okunamadı");
  assert.ok(
    SYSTEM_PROMPT.includes(`en fazla ${adSinir} kelime`),
    `sistem promptu name için ${adSinir} kelime demiyor`,
  );
  assert.ok(
    SYSTEM_PROMPT.includes(`en fazla ${kelimeSinir} kelime`),
    `sistem promptu word için ${kelimeSinir} kelime demiyor`,
  );
});
