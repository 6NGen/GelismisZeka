import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { kutuphaneAdimi } from "../lib/kutuphane-server";
import { MODES } from "../lib/modes";
import { modeResultSchema } from "../lib/schema";
import { slugify } from "../lib/turkish";

/**
 * Kütüphanenin bütünlüğü.
 *
 * Dizin ile gövdeler iki ayrı dosyada durduğu için birbirinden kopabilirler:
 * dizinde adı geçen bir mevzunun dosyası silinmiş olabilir, ya da bir dosya
 * dizine hiç girmemiş olabilir. İkisi de sessizdir — kullanıcı yalnız
 * "bulunamadı" görür ve kota boşuna harcanır.
 */

const KOK = process.cwd();
const GOVDE = join(KOK, "public", "kutuphane");
const DIZIN = join(KOK, "data", "kutuphane-index.json");
const MEVZULAR = join(KOK, "data", "mevzular.json");

type Girdi = { slug: string; topic: string };
const girdiler = JSON.parse(readFileSync(DIZIN, "utf8")) as Girdi[];

test("dizindeki her mevzunun gövde dosyası vardır", () => {
  for (const g of girdiler) {
    assert.ok(existsSync(join(GOVDE, `${g.slug}.json`)), `${g.slug}.json eksik`);
  }
});

test("her gövde dosyası dizinde kayıtlıdır", () => {
  const dizindekiler = new Set(girdiler.map((g) => g.slug));
  for (const dosya of readdirSync(GOVDE).filter((f) => f.endsWith(".json"))) {
    const slug = dosya.replace(/\.json$/, "");
    assert.ok(dizindekiler.has(slug), `${dosya} dizine girmemiş`);
  }
});

test("slug'lar mevzu adından türetilmiştir ve çakışmaz", () => {
  const gorulen = new Set<string>();
  for (const g of girdiler) {
    assert.equal(g.slug, slugify(g.topic), `${g.topic} için slug tutarsız`);
    assert.ok(!gorulen.has(g.slug), `çakışan slug: ${g.slug}`);
    gorulen.add(g.slug);
  }
});

test("kütüphanedeki her analiz dört adımı taşır ve şemadan geçer", () => {
  for (const g of girdiler) {
    const analiz = JSON.parse(readFileSync(join(GOVDE, `${g.slug}.json`), "utf8")) as Record<
      string,
      unknown
    >;
    assert.equal(analiz.topic, g.topic, `${g.slug}: topic dizinle uyuşmuyor`);

    for (const mod of MODES) {
      assert.ok(analiz[mod], `${g.slug}: ${mod} adımı eksik`);
      const sonuc = modeResultSchema(mod).safeParse(analiz[mod]);
      assert.ok(sonuc.success, `${g.slug} / ${mod}: ${sonuc.success ? "" : sonuc.error.issues[0]?.message}`);
    }
  }
});

test("üretim listesindeki mevzular geçerli ve benzersizdir", () => {
  const liste = JSON.parse(readFileSync(MEVZULAR, "utf8")) as string[];
  assert.ok(Array.isArray(liste) && liste.length > 0);

  const slugler = new Set<string>();
  for (const mevzu of liste) {
    assert.equal(typeof mevzu, "string");
    assert.ok(mevzu.trim().length >= 2, `çok kısa mevzu: "${mevzu}"`);
    const s = slugify(mevzu);
    assert.ok(s.length > 0, `"${mevzu}" boş slug üretiyor`);
    assert.ok(!slugler.has(s), `"${mevzu}" başka bir mevzuyla aynı slug'a düşüyor: ${s}`);
    slugler.add(s);
  }
});

test("sunucu kütüphaneyi okur ve istenen adımı döndürür", () => {
  const ilk = girdiler[0];
  assert.ok(ilk, "kütüphane boş olmamalı");

  const sonuc = kutuphaneAdimi("nedir", ilk.topic);
  assert.ok(sonuc, "kütüphanedeki mevzu sunucudan okunamadı");
  assert.ok(sonuc.branches.length >= 3);

  // Türkçe normalleşme sunucu tarafında da geçerli olmalı.
  assert.ok(kutuphaneAdimi("nedir", `  ${ilk.topic.toLocaleUpperCase("tr")}  `));
  assert.equal(kutuphaneAdimi("nedir", "kütüphanede olmayan bir mevzu"), null);
});
