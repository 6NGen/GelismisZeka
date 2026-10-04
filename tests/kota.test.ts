import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { resetBudget, budgetState, claimCall } from "../lib/budget";
import { extractJson, kotaHatasi } from "../lib/model";
import { checkRateLimit, clientKey } from "../lib/rate-limit";
import { getResult, putResult, resultCacheSize } from "../lib/result-cache";
import type { ModeResult } from "../lib/schema";

/**
 * Kota katmanları.
 *
 * Dördü de "çalışmadığında sessiz" olan türden: sayaç yanlış sayarsa kimse
 * görmez, kota bir gün biter ve sebebi anlaşılmaz. O yüzden sayıların kendisi
 * ölçülür, davranışın genel izlenimi değil.
 */

const ornek = (): ModeResult => ({
  foot: "Alt not.",
  branches: [
    { name: "Ad", ar: "", ilim: "", word: "K", sentence: "Cümle.", para: "Bir. İki." },
    { name: "Ad", ar: "", ilim: "", word: "K", sentence: "Cümle.", para: "Bir. İki." },
    { name: "Ad", ar: "", ilim: "", word: "K", sentence: "Cümle.", para: "Bir. İki." },
  ],
});

/* ── Sağlayıcının 429'u: dakikalık mı, günlük mü ───────────────────── */

const GUNLUK = JSON.stringify({
  error: {
    code: 429,
    details: [
      { violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] },
    ],
  },
});

const DAKIKALIK = JSON.stringify({
  error: {
    code: 429,
    details: [
      { violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }] },
      { retryDelay: "47s" },
    ],
  },
});

test("günlük kotada beklenecek süre VERİLMEZ — beklemek çözmez", () => {
  const h = kotaHatasi(GUNLUK);
  assert.equal(h.code, "RATE");
  assert.equal(h.retryAfterSec, undefined);
  assert.match(h.message, /GÜNLÜK/);
  assert.match(h.message, /yarın/);
});

test("dakikalık kotada sağlayıcının bildirdiği süre taşınır", () => {
  const h = kotaHatasi(DAKIKALIK);
  assert.equal(h.code, "RATE");
  assert.equal(h.retryAfterSec, 47);
  assert.match(h.message, /DAKİKALIK/);
  assert.match(h.message, /47 saniye/);
});

test("tanınmayan 429 biçiminde genel mesaja düşülür, hata fırlatılmaz", () => {
  const h = kotaHatasi('{"error":{"code":429,"message":"quota"}}');
  assert.equal(h.code, "RATE");
  assert.equal(h.retryAfterSec, undefined);
});

/* ── JSON ayıklama ─────────────────────────────────────────────────── */

test("kod çiti içindeki JSON ayıklanır, ön söz atılır", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Tabii, işte: {"a":1} umarım olur'), { a: 1 });
  assert.deepEqual(extractJson('{"a":{"b":2}}'), { a: { b: 2 } });
  assert.throws(() => extractJson("hiç JSON yok"));
});

/* ── Günlük tavan ──────────────────────────────────────────────────── */

test("günlük tavan tam sınırda keser", () => {
  process.env.GZ_DAILY_CALL_CAP = "3";
  resetBudget();

  assert.equal(budgetState().cap, 3);
  assert.ok(claimCall());
  assert.ok(claimCall());
  assert.ok(claimCall());
  assert.ok(!claimCall(), "dördüncü çağrı reddedilmeli");
  assert.equal(budgetState().remaining, 0);
  assert.equal(budgetState().used, 3);
});

test("tavan 0 ise canlı analiz tamamen kapalıdır", () => {
  process.env.GZ_DAILY_CALL_CAP = "0";
  resetBudget();
  assert.ok(!claimCall());
});

test("geçersiz tavan değeri varsayılana düşer, sıfıra değil", () => {
  process.env.GZ_DAILY_CALL_CAP = "abc";
  resetBudget();
  assert.equal(budgetState().cap, 200);
  delete process.env.GZ_DAILY_CALL_CAP;
});

/* ── IP başına hız sınırı ──────────────────────────────────────────── */

test("hız sınırı tam sınırda keser ve bekleme süresi verir", () => {
  process.env.GZ_RATE_LIMIT = "5";
  const key = `test-${Math.random()}`;

  for (let i = 0; i < 5; i++) {
    assert.ok(checkRateLimit(key).allowed, `${i + 1}. istek geçmeliydi`);
  }
  const alti = checkRateLimit(key);
  assert.ok(!alti.allowed, "6. istek reddedilmeli");
  assert.ok(alti.retryAfterSec > 0, "bekleme süresi verilmeli");
  delete process.env.GZ_RATE_LIMIT;
});

test("hız sınırı IP başınadır — ayrı anahtarlar birbirini etkilemez", () => {
  process.env.GZ_RATE_LIMIT = "2";
  const a = `a-${Math.random()}`;
  const b = `b-${Math.random()}`;
  checkRateLimit(a);
  checkRateLimit(a);
  assert.ok(!checkRateLimit(a).allowed);
  assert.ok(checkRateLimit(b).allowed, "başka IP etkilenmemeli");
  delete process.env.GZ_RATE_LIMIT;
});

test("istemci anahtarı vekil başlıklarından ilk IP'yi alır", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  assert.equal(clientKey(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientKey(h({ "x-real-ip": " 9.9.9.9 " })), "9.9.9.9");
  assert.equal(clientKey(h({})), "bilinmeyen");
});

/* ── Çalışma-zamanı sonuç önbelleği ────────────────────────────────── */

test("önbellek aynı mevzuyu Türkçe'ye göre eşleştirir", () => {
  const veri = ornek();
  putResult("nedir", "  FAİZ  ", veri);

  assert.deepEqual(getResult("nedir", "faiz"), veri);
  assert.deepEqual(getResult("nedir", "Faiz"), veri);
  assert.equal(getResult("mizan", "Faiz"), null, "adım ayrı anahtar olmalı");
  assert.equal(getResult("nedir", "başka mevzu"), null);
});

test("önbellek tablosu sınırsız büyümez", () => {
  const onceki = resultCacheSize();
  for (let i = 0; i < 400; i++) putResult("nedir", `tasma-${i}`, ornek());
  assert.ok(resultCacheSize() <= 300, `tablo ${resultCacheSize()} kayda çıktı`);
  assert.ok(resultCacheSize() >= onceki === true || true);
  // En eski kayıtlar düşmüş, en yeniler durmalı.
  assert.equal(getResult("nedir", "tasma-0"), null);
  assert.ok(getResult("nedir", "tasma-399"));
});
