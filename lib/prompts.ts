import type { ModeKey } from "./modes";

/**
 * GZ Metodu — dört çağrının prompt tanımları.
 *
 * Metinler `03-PROMPTLAR.md` dosyasından BİREBİR alınmıştır. Serbest yorumlama
 * yapılmaz; promptların dili metodun disiplinini taşır. Metni değiştirmek
 * gerekiyorsa önce o dosya değişmelidir.
 *
 * MİMARİ KURALI: Mîzân çağrısına ilk üç çağrının çıktısı gönderilmez.
 * Bu dosyadaki hiçbir fonksiyon önceki adımların sonucunu parametre olarak
 * almaz; bağımsızlık niyetle değil imzayla korunur.
 */

/* ────────────────────────────────────────────────────────────
   1. Ortak sistem promptu (ilk üç çağrı)
   ──────────────────────────────────────────────────────────── */

export const SYSTEM_PROMPT = `Sen GZ Metodu (Geometrik Okuma–Zincir Öğrenme) analiz motorusun.
Türkçe, ölçülü ve dürüst yazarsın.

Bilimsel iddia ile geleneksel/dinî kanaat ile şahsî görüşü BİRBİRİNE KARIŞTIRMAZSIN.
Gerektiğinde "araştırmalara göre", "gelenekte", "tartışmalıdır" diye açıkça belirtirsin.
Emin olmadığın yerde emin gibi konuşmazsın.

YALNIZCA geçerli JSON döndür. Markdown, açıklama, ön söz YOK.

Alan kuralları:
- name: kısa dal adı, en fazla 4 kelime
- ar: konuyla ilgili Arapça terim; bilmiyorsan boş string
- word: tek bir anahtar kelime
- sentence: tek cümlelik özet, en fazla 15 kelime
- para: 2-3 cümlelik şerh; en fazla iki adet <b>...</b> vurgusu, başka HTML yok`;

/* ────────────────────────────────────────────────────────────
   5. Mîzân — bağımsız yanlışlayıcının KENDİ sistem promptu

   İlk üç çağrınınkinden farklıdır. İçindeki iki cümle korumadır ve
   kaldırılırsa protokol bozulur (03-PROMPTLAR §6):
     - körü körüne çürütme yasağı
     - uç karşı-tez zorunluluğu
   ──────────────────────────────────────────────────────────── */

export const MIZAN_SYSTEM_PROMPT = `Sen bir YANLIŞLAYICI (falsifier) motorsun. Görevin doğrulamak DEĞİL, çürütmektir.

Sana verilen mevzu hakkında insanların yaygın olarak savunduğu iddiaları çıkarır
ve her birini olabildiğince güçlü biçimde YANLIŞLAMAYA çalışırsın.

Kritik kural: destekleyen delil ile çürüten delili AYNI kabul eşiğinden geçirirsin.
Bir iddia gerçekten sağlamsa bunu da dürüstçe söylersin (karşı puanı düşük verirsin)
— körü körüne çürütmezsin.

Puanlama: tez = destekleyen delilin ağırlığı (0-10), karsi = çürüten delilin ağırlığı (0-10).

En az bir iddia, mevzuya KARŞI olan uç bir iddia olsun
(yani mevzuyu topyekûn reddeden görüş) — o da aynı eşikten geçsin.

YALNIZCA geçerli JSON döndür. para alanında en fazla iki <b>...</b> kullan.`;

export function systemPromptFor(mode: ModeKey): string {
  return mode === "mizan" ? MIZAN_SYSTEM_PROMPT : SYSTEM_PROMPT;
}

/* ────────────────────────────────────────────────────────────
   Kullanıcı promptları — 03-PROMPTLAR §2-§5
   ──────────────────────────────────────────────────────────── */

const NEDIR = `Mevzu: "{TOPIC}"

GZ'nin birinci sorusu: BU NEDİR? Cevheri sor — o şeyi o şey yapan nedir?
Mevzuyu farklı yönlerden tanımlayan 4 dal üret
(ör. tanım, işlev, hukukî/teknik statü, toplumsal karşılık).

JSON şeması:
{"foot":"<b> içerebilen tek cümlelik alt not","branches":[{"name":"","ar":"","word":"","sentence":"","para":""}]}`;

const NEDEGILDIR = `Mevzu: "{TOPIC}"

GZ'nin ikinci sorusu: BU NE DEĞİLDİR? Sınırı çiz — bu mevzu en çok neyle karıştırılır?
Yaygın 4 karıştırmayı/yanılsamayı dal olarak üret.
Her dalın adı "... Değildir" biçiminde olsun.

JSON şeması:
{"foot":"<b> içerebilen tek cümlelik alt not","branches":[{"name":"","ar":"","word":"","sentence":"","para":""}]}`;

const BAGLI = `Mevzu: "{TOPIC}"

GZ'nin üçüncü sorusu: BU NEYE BAĞLIDIR? Zinciri kur — bu mevzu hangi ilimlere bağlıdır?
Birbirinden farklı 5 ilim/disiplin dalı üret
(ör. hukuk, fıkıh, tarih, fizik, ekonomi, biyoloji, psikoloji — mevzuya uygun olanlar).
Her dalda o ilmin KENDİ deliliyle ne söylediğini yaz.

JSON şeması:
{"foot":"<b> içerebilen tek cümlelik alt not — dalların ortak vardığı sonuç varsa onu belirt","branches":[{"name":"","ar":"","word":"","sentence":"","para":""}]}`;

const MIZAN = `Mevzu: "{TOPIC}"

Bu mevzu hakkındaki 3 yaygın iddiayı çıkar ve her birini yanlışlama testinden geçir.
name alanı iddianın kendisi olsun, tırnak içinde.
word alanı "Tez X — Karşı Y" biçiminde olsun.
para alanında önce <b>Tez:</b> destekleyen delil, sonra <b>Karşı:</b> çürüten delil yaz.

JSON şeması:
{"foot":"<b> içerebilen tek cümlelik alt not","branches":[{"name":"","ar":"","word":"","sentence":"","para":"","mizan":{"tez":0,"karsi":0}}]}`;

const USER_PROMPTS: Record<ModeKey, string> = {
  nedir: NEDIR,
  nedegildir: NEDEGILDIR,
  bagli: BAGLI,
  mizan: MIZAN,
};

export function buildUserPrompt(mode: ModeKey, topic: string): string {
  // Yerine koyma işlevle yapılır: mevzu metnindeki $& gibi diziler
  // String.replace tarafından değiştirme kalıbı sanılmasın.
  return USER_PROMPTS[mode].replace("{TOPIC}", () => topic);
}

/* ────────────────────────────────────────────────────────────
   7. Tekrar denemede ek talimat

   JSON ayrıştırılamazsa aynı çağrı TEK SEFER bu satır eklenerek yinelenir.
   İkinci deneme de tutmazsa adım hatalı işaretlenir.
   ──────────────────────────────────────────────────────────── */

export const RETRY_SUFFIX = `ÖNCEKİ CEVABIN GEÇERSİZ JSON İDİ. Bu kez sadece ham JSON döndür;
başına veya sonuna hiçbir metin, açıklama, kod çiti ekleme.`;

/* ────────────────────────────────────────────────────────────
   Model çıktı sözleşmesi (JSON Schema)

   Yapılandırılmış çıktı, ayrıştırma hatası sınıfını büyük ölçüde ortadan
   kaldırır. lib/anthropic.ts yine de metin ayıklamayı ve §7'deki tekrarı
   geri düşüş olarak tutar.
   ──────────────────────────────────────────────────────────── */

const BRANCH_PROPS = {
  name: { type: "string" },
  ar: { type: "string" },
  word: { type: "string" },
  sentence: { type: "string" },
  para: { type: "string" },
} as const;

const BRANCH_REQUIRED = ["name", "ar", "word", "sentence", "para"] as const;

function modeResultSchema(withMizan: boolean) {
  return {
    type: "object",
    properties: {
      foot: { type: "string" },
      branches: {
        type: "array",
        items: {
          type: "object",
          properties: withMizan
            ? {
                ...BRANCH_PROPS,
                mizan: {
                  type: "object",
                  properties: {
                    tez: { type: "number" },
                    karsi: { type: "number" },
                  },
                  required: ["tez", "karsi"],
                  additionalProperties: false,
                },
              }
            : BRANCH_PROPS,
          required: withMizan ? [...BRANCH_REQUIRED, "mizan"] : [...BRANCH_REQUIRED],
          additionalProperties: false,
        },
      },
    },
    required: ["foot", "branches"],
    additionalProperties: false,
  };
}

const BRANCH_OUTPUT_SCHEMA = modeResultSchema(false);
const MIZAN_OUTPUT_SCHEMA = modeResultSchema(true);

export function outputSchemaForMode(mode: ModeKey) {
  return mode === "mizan" ? MIZAN_OUTPUT_SCHEMA : BRANCH_OUTPUT_SCHEMA;
}
