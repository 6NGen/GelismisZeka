import type { ModeKey } from "./modes";

/**
 * GZ Metodu — dört çağrının prompt tanımları.
 *
 * Metinler `03-PROMPTLAR.md` dosyasından BİREBİR alınmıştır. Serbest yorumlama
 * yapılmaz; promptların dili metodun disiplinini taşır. Metni değiştirmek
 * gerekiyorsa önce o dosya değişmelidir.
 *
 * TEK SAPMA: §1'deki `name` sınırı 4→5, `word` sınırı "tek kelime"→"en fazla
 * 2 kelime" olarak gevşetildi (sahibinin onayıyla). Gerçek modelle ilk canlı
 * denemede iki adım tam bu iki kuraldan düştü; Türkçe'de "besin ögesi" gibi
 * terimler tek kelimeye sığmıyor. Buradaki sayılar `lib/schema.ts` içindeki
 * denetimle aynı olmalıdır — ayrılırsa model kendisine söylenmemiş bir
 * kuraldan düşer. 03-PROMPTLAR.md de aynı şekilde güncellenmelidir.
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
- name: kısa dal adı, en fazla 5 kelime
- ar: konuyla ilgili Arapça terim; bilmiyorsan boş string
- word: anahtar terim, en fazla 2 kelime
- sentence: tek cümlelik özet, en fazla 15 kelime
- para: 2-3 cümlelik şerh; en fazla iki adet <b>...</b> vurgusu, başka HTML yok

GÖRSEL ANLATIM — gorsel alanı, yalnız GEREKTİĞİNDE
Mevzu çizimle daha iyi anlaşılıyorsa harita başına BİR görsel tarifi ver.
Anlatıma bir şey katmıyorsa gorsel alanını hiç yazma; süs olsun diye ekleme.
Türler:
- "zaman-cizgisi": sıra, dönem ya da zaman kipi anlatılıyorsa. İki şerit
  verirsen iki şey karşılaştırılmış olur. konum 0-100 arası bir orandır.
- "sinir": iki şeyin ayrımı anlatılıyorsa. sol/sag ayıran nitelikler,
  ortak ise ikisinde de bulunanlardır.
- "grafik": nicel bir ilişki, eğri ya da değişim anlatılıyorsa.
  Formül YAZMA; eğriyi kendin örnekleyip x-y noktaları olarak ver.
- "surec": sıralı adımlardan oluşan bir işleyiş anlatılıyorsa.
- "simulasyon": fiziksel hareket anlatılıyorsa. Yalnız hangi olayı ve
  başlangıç değerlerini söyle; hareketi uygulama hesaplar, sen HESAPLAMA.
  atis → hiz (m/s) ve aci (derece); serbest-dusus → yukseklik (m);
  sarkac → uzunluk (m).`;

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

GZ'nin üçüncü sorusu: BU NEYE BAĞLIDIR? Zinciri kur.

Önce mevzuun MERTEBESİNİ belirle ve mertebe alanına yaz:
- "ilim": mevzu başlı başına bir ilim/disiplindir (ör. matematik, fıkıh, dilbilim).
- "konu": mevzu bir ilmin içindeki bir bölüm, konu ya da meseledir
  (ör. türev, icmâ, present perfect).

Mertebe "ilim" ise: bu ilme bağlı olan 5 BAŞKA İLİM dalı üret.
name alanı o ilmin adı olsun; ilim alanını boş bırak.

Mertebe "konu" ise: bu konunun bağlantılı olduğu, DİĞER İLİMLERDEKİ 5 KONU üret.
ilim alanı o konunun bulunduğu ilmin adı, name alanı o ilimdeki konunun adı olsun.
Her dal farklı bir ilimden olsun; mevzuun kendi ilmini tekrar etme.

Her dalda o ilmin KENDİ deliliyle ne söylediğini yaz.

JSON şeması:
{"mertebe":"ilim veya konu","foot":"<b> içerebilen tek cümlelik alt not — dalların ortak vardığı sonuç varsa onu belirt","branches":[{"name":"","ar":"","ilim":"","word":"","sentence":"","para":""}]}`;

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
   kaldırır. lib/model.ts yine de metin ayıklamayı ve §7'deki tekrarı
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

const MIZAN_PROP = {
  type: "object",
  properties: {
    tez: { type: "number" },
    karsi: { type: "number" },
  },
  required: ["tez", "karsi"],
  additionalProperties: false,
} as const;

/**
 * Bağ adımı iki alan daha ister: merkezin mertebesi ve — konu mertebesinde —
 * dalın ait olduğu ilim. `ilim` şemada zorunludur ama ilim mertebesinde boş
 * string geçilir; dolu olup olmaması kuralı zod tarafında denetlenir.
 */
/**
 * Görsel tarifi — ayrık birlik. `anyOf` Gemini'nin yapılandırılmış çıktısında
 * desteklenir; `tur` alanı hangi kolun geçerli olduğunu belirler.
 *
 * Model burada çizim değil TARİF üretir. Simülasyonda ise yalnız hangi olay ve
 * hangi başlangıç değerleri — hareketi kod hesaplar.
 */
const GORSEL_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        tur: { type: "string", enum: ["zaman-cizgisi"] },
        baslik: { type: "string" },
        seritler: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ad: { type: "string" },
              noktalar: {
                type: "array",
                items: {
                  type: "object",
                  properties: { etiket: { type: "string" }, konum: { type: "number" } },
                  required: ["etiket", "konum"],
                  additionalProperties: false,
                },
              },
            },
            required: ["ad", "noktalar"],
            additionalProperties: false,
          },
        },
      },
      required: ["tur", "baslik", "seritler"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        tur: { type: "string", enum: ["sinir"] },
        baslik: { type: "string" },
        sol: {
          type: "object",
          properties: { ad: { type: "string" }, ogeler: { type: "array", items: { type: "string" } } },
          required: ["ad", "ogeler"],
          additionalProperties: false,
        },
        sag: {
          type: "object",
          properties: { ad: { type: "string" }, ogeler: { type: "array", items: { type: "string" } } },
          required: ["ad", "ogeler"],
          additionalProperties: false,
        },
        ortak: { type: "array", items: { type: "string" } },
      },
      required: ["tur", "baslik", "sol", "sag", "ortak"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        tur: { type: "string", enum: ["grafik"] },
        baslik: { type: "string" },
        xEtiket: { type: "string" },
        yEtiket: { type: "string" },
        egriler: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ad: { type: "string" },
              noktalar: {
                type: "array",
                items: {
                  type: "object",
                  properties: { x: { type: "number" }, y: { type: "number" } },
                  required: ["x", "y"],
                  additionalProperties: false,
                },
              },
            },
            required: ["ad", "noktalar"],
            additionalProperties: false,
          },
        },
      },
      required: ["tur", "baslik", "xEtiket", "yEtiket", "egriler"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        tur: { type: "string", enum: ["surec"] },
        baslik: { type: "string" },
        adimlar: {
          type: "array",
          items: {
            type: "object",
            properties: { ad: { type: "string" }, aciklama: { type: "string" } },
            required: ["ad", "aciklama"],
            additionalProperties: false,
          },
        },
      },
      required: ["tur", "baslik", "adimlar"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        tur: { type: "string", enum: ["simulasyon"] },
        baslik: { type: "string" },
        model: { type: "string", enum: ["atis", "serbest-dusus", "sarkac"] },
        hiz: { type: "number" },
        aci: { type: "number" },
        yukseklik: { type: "number" },
        uzunluk: { type: "number" },
      },
      required: ["tur", "baslik", "model"],
      additionalProperties: false,
    },
  ],
} as const;

function modeResultSchema(kind: "plain" | "bagli" | "mizan") {
  const props =
    kind === "mizan"
      ? { ...BRANCH_PROPS, mizan: MIZAN_PROP }
      : kind === "bagli"
        ? { ...BRANCH_PROPS, ilim: { type: "string" } }
        : BRANCH_PROPS;

  const required =
    kind === "mizan"
      ? [...BRANCH_REQUIRED, "mizan"]
      : kind === "bagli"
        ? [...BRANCH_REQUIRED, "ilim"]
        : [...BRANCH_REQUIRED];

  return {
    type: "object",
    properties: {
      foot: { type: "string" },
      // İsteğe bağlı: `required` listesinde yok, yani model gerekmediğinde
      // hiç üretmez ve harita metinle kalır.
      gorsel: GORSEL_SCHEMA,
      ...(kind === "bagli"
        ? { mertebe: { type: "string", enum: ["ilim", "konu"] } }
        : {}),
      branches: {
        type: "array",
        items: {
          type: "object",
          properties: props,
          required,
          additionalProperties: false,
        },
      },
    },
    required: kind === "bagli" ? ["mertebe", "foot", "branches"] : ["foot", "branches"],
    additionalProperties: false,
  };
}

const BRANCH_OUTPUT_SCHEMA = modeResultSchema("plain");
const BAGLI_OUTPUT_SCHEMA = modeResultSchema("bagli");
const MIZAN_OUTPUT_SCHEMA = modeResultSchema("mizan");

export function outputSchemaForMode(mode: ModeKey) {
  if (mode === "mizan") return MIZAN_OUTPUT_SCHEMA;
  if (mode === "bagli") return BAGLI_OUTPUT_SCHEMA;
  return BRANCH_OUTPUT_SCHEMA;
}
