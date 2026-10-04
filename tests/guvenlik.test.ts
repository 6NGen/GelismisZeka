import assert from "node:assert/strict";
import { test } from "node:test";

import { safeRich, sanitizeModeResult, sanitizePlain, sanitizeRichSource } from "../lib/sanitize";
import type { ModeResult } from "../lib/schema";

/**
 * HTML güvenliği — iki katman, ikisi de ayrı ayrı sınanır.
 *
 * Katmanlardan biri atlansa diğerinin hâlâ tutması gerekir. Bu yüzden testler
 * "sonuçta ekranda betik çalışmıyor" demez; her katmanın KENDİ başına ne
 * yaptığını ölçer.
 */

const DUSMANCA = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<iframe src="evil"></iframe>',
  '<b onclick="x()">kalın</b>',
  '<svg/onload=alert(1)>',
  '<BODY ONLOAD=alert(1)>',
];

test("düz alanlarda hiçbir açılı ayraç kalmaz", () => {
  for (const kotu of DUSMANCA) {
    const temiz = sanitizePlain(`önce ${kotu} sonra`);
    assert.ok(!/[<>]/.test(temiz), `açılı ayraç kaldı: ${temiz}`);
  }
});

test("zengin alanlarda yalnız <b> ve <i> hayatta kalır", () => {
  const temiz = sanitizeRichSource(
    '<b>kalın</b> <i>eğik</i> <script>kötü()</script> <b onclick="x">tuzak</b> <u>altı</u>',
  );
  assert.ok(temiz.includes("<b>kalın</b>"), "izinli <b> korunmalı");
  assert.ok(temiz.includes("<i>eğik</i>"), "izinli <i> korunmalı");
  assert.ok(!temiz.includes("script"), "script etiketi kalmamalı");
  assert.ok(!temiz.includes("onclick"), "olay işleyicisi kalmamalı");
  assert.ok(!temiz.includes("<u>"), "izinsiz etiket kalmamalı");
});

test("büyük harfli izinli etiket küçültülür, nitelikli olan atılır", () => {
  assert.equal(sanitizeRichSource("<B>a</B>"), "<b>a</b>");
  assert.ok(!sanitizeRichSource('<b class="x">a</b>').includes("<b class"));
});

test("safeRich son kapıdır: her şeyi kaçışlar, yalnız <b>/<i> geri açar", () => {
  const cikti = safeRich('<script>alert(1)</script> <b>kalın</b> & "tırnak"');
  assert.ok(!cikti.includes("<script>"), "betik etiketi açık kalmamalı");
  assert.ok(cikti.includes("&lt;script&gt;"), "betik kaçışlanmış olmalı");
  assert.ok(cikti.includes("<b>kalın</b>"), "izinli çift geri açılmalı");
  assert.ok(cikti.includes("&amp;"), "ve işareti kaçışlanmalı");
});

test("safeRich kaçışlamayı ÖNCE yapar — çifte kaçış açığı yok", () => {
  // "&lt;script&gt;" girdisi, kaçışlama sonrası "&amp;lt;..." olmalı; aksi
  // halde saldırgan zaten kaçışlanmış metin göndererek etiketi geri açtırırdı.
  assert.ok(safeRich("&lt;script&gt;").startsWith("&amp;lt;"));
});

test("model çıktısının tamamı temizlenir — görsel alanları dâhil", () => {
  const kirli = {
    foot: "<script>a()</script>Alt not. <b>vurgu</b>",
    mertebe: "konu",
    gorsel: {
      tur: "surec",
      baslik: "<img src=x onerror=alert(1)>Başlık",
      adimlar: [
        { ad: "<iframe></iframe>Adım", aciklama: "<script>x</script>Açıklama" },
        { ad: "B", aciklama: "C" },
      ],
    },
    branches: [
      {
        name: "<script>x</script>Ad",
        ar: "<b>عربي</b>",
        ilim: "<img onerror=x>Fizik",
        word: "<i>Kelime</i>",
        sentence: "<svg onload=x>Cümle",
        para: "<b>Kalın</b> birinci. <script>kötü()</script> İkinci.",
      },
    ],
  } as unknown as ModeResult;

  const temiz = sanitizeModeResult(kirli);

  // Düz alanlarda ayraç kalmamalı.
  const d = temiz.branches[0]!;
  for (const [alan, deger] of Object.entries({ name: d.name, ar: d.ar, ilim: d.ilim, word: d.word, sentence: d.sentence })) {
    assert.ok(!/[<>]/.test(deger as string), `${alan} alanında ayraç kaldı: ${deger}`);
  }
  // Zengin alanlarda yalnız izinliler.
  assert.ok(!temiz.foot.includes("script"));
  assert.ok(temiz.foot.includes("<b>vurgu</b>"));
  assert.ok(!d.para.includes("script"));
  assert.ok(d.para.includes("<b>Kalın</b>"));

  // Görsel metinleri de temizlenmeli — unutulursa React kaçışlar ama
  // sunucu katmanı delinmiş olur.
  const g = temiz.gorsel as { baslik: string; adimlar: { ad: string; aciklama: string }[] };
  assert.ok(!/[<>]/.test(g.baslik));
  assert.ok(!/[<>]/.test(g.adimlar[0]!.ad));
  assert.ok(!/[<>]/.test(g.adimlar[0]!.aciklama));
});

test("temizlik mertebe ve görseli DÜŞÜRMEZ", () => {
  // Nesne alan alan yeniden kurulduğu için yeni bir alan eklendiğinde buradan
  // sessizce düşebilir; düşerse ikinci doğrulama o adımı tamamen reddeder.
  const girdi = {
    foot: "Alt not.",
    mertebe: "konu",
    gorsel: { tur: "simulasyon", baslik: "Atış", model: "atis", hiz: 20, aci: 45 },
    branches: [{ name: "Ad", ar: "", ilim: "Fizik", word: "K", sentence: "C.", para: "Bir. İki." }],
  } as unknown as ModeResult;

  const temiz = sanitizeModeResult(girdi);
  assert.equal(temiz.mertebe, "konu");
  assert.equal(temiz.gorsel?.tur, "simulasyon");
  assert.equal(temiz.branches[0]!.ilim, "Fizik");
});

test("ilim mertebesinde `ilim` alanı temizlenir — aynı bilgi iki kez görünmesin", () => {
  const girdi = {
    foot: "Alt not.",
    mertebe: "ilim",
    branches: [{ name: "Matematik", ar: "", ilim: "Matematik", word: "K", sentence: "C.", para: "Bir. İki." }],
  } as unknown as ModeResult;

  assert.equal(sanitizeModeResult(girdi).branches[0]!.ilim, "");
});

test("kontrol karakterleri metinden düşer, satır sonu boşluğa döner", () => {
  const temiz = sanitizePlain("a\u0000b\nc");
  assert.ok(!temiz.includes("\u0000"));
  assert.equal(temiz, "ab c");
});
