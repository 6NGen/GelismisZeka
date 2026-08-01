import { z } from "zod";

import { MAX_TOPIC, MIN_TOPIC, MODES, hasControlChars, type ModeKey } from "./modes";

export type { ModeKey } from "./modes";

/* ────────────────────────────────────────────────────────────
   Dal şeması — 02-VERİ-ŞEMASI §1–2

   Üç katman: KELİME → CÜMLE → PARAGRAF. Aynı biçim dört modda da geçerlidir;
   mîzân modunda yalnızca `mizan` alanı eklenir.
   ──────────────────────────────────────────────────────────── */

const MizanZ = z.object({
  /** Destekleyen delilin ağırlığı, 0–10. */
  tez: z.number().min(0).max(10),
  /** Çürüten delilin ağırlığı, 0–10. */
  karsi: z.number().min(0).max(10),
});

export const BranchZ = z.object({
  /** Dal adı — en fazla 5 kelime. */
  name: z.string().min(1).max(80),
  /** Arapça terim. Model emin değilse boş bırakır. */
  ar: z.string().max(40).optional().default(""),
  /**
   * Dalın ait olduğu ilim — yalnız konu düzeyi bağda dolar.
   *
   * Merkezde bir ilim varken dalın kendisi bir ilimdir ve `name` onu taşır;
   * bu alan boş kalır. Merkezde bir konu varken dal "başka bir ilimdeki
   * karşılık gelen konu"dur, o yüzden iki parça gerekir: hangi ilim (`ilim`)
   * ve o ilimde hangi konu (`name`).
   */
  ilim: z.string().max(60).optional().default(""),
  /** KELİME katmanı — en fazla iki kelimelik anahtar terim. */
  word: z.string().min(1).max(40),
  /** CÜMLE katmanı — tek cümle, ≤15 kelime. */
  sentence: z.string().min(1).max(200),
  /** PARAGRAF katmanı — 2–3 cümle, sınırlı <b>/<i>. */
  para: z.string().min(1).max(900),
  /** Yalnız mîzân modunda bulunur. */
  mizan: MizanZ.optional(),
});

/**
 * Merkezin mertebesi. Bağın çözünürlüğünü bu belirler:
 * ilim ortadaysa bağ ilimlere, konu ortadaysa diğer ilimlerdeki konulara kurulur.
 * Yalnız "bagli" adımında anlamlıdır.
 */
export const MertebeZ = z.enum(["ilim", "konu"]);

/* ────────────────────────────────────────────────────────────
   Görsel anlatım — harita başına en çok bir tane

   Model çizim YAPMAZ, çizim TARİFİ verir: sabit bir türler sözlüğünden
   birini seçip alanlarını doldurur. Çizimin kendisi elle yazılmış
   bileşenlerdedir. Gerekçe MizanBar ile aynı: modelin verdiği şey sayı ve
   etiket, nasıl gösterileceği uygulamanın hükmü.

   Simülasyonda fizik de modele bırakılmaz. Model yalnız hangi olayın ve
   hangi başlangıç değerlerinin gösterileceğini söyler; yörüngeyi kod hesaplar.
   Modelin hesapladığı bir yörünge yanlış olabilir, kodun hesapladığı olamaz.
   ──────────────────────────────────────────────────────────── */

const Etiket = z.string().min(1).max(60);
const KisaMetin = z.string().min(1).max(160);

/** Zaman çizgisi — dil, tarih. İki şerit karşılaştırmayı mümkün kılar. */
const ZamanCizgisiZ = z.object({
  tur: z.literal("zaman-cizgisi"),
  baslik: Etiket,
  seritler: z
    .array(
      z.object({
        ad: Etiket,
        noktalar: z
          .array(z.object({ etiket: Etiket, konum: z.number().min(0).max(100) }))
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(2),
});

/** Sınır çizimi — "bu ne değildir" sorusunun doğal biçimi. */
const SinirZ = z.object({
  tur: z.literal("sinir"),
  baslik: Etiket,
  sol: z.object({ ad: Etiket, ogeler: z.array(Etiket).min(1).max(6) }),
  sag: z.object({ ad: Etiket, ogeler: z.array(Etiket).min(1).max(6) }),
  ortak: z.array(Etiket).max(4).optional().default([]),
});

/**
 * Eğri/grafik — matematik, fizik, ekonomi.
 * Model formül değil ÖRNEKLENMİŞ NOKTA verir; formül değerlendirmesi yok,
 * dolayısıyla kod çalıştırma yüzeyi de yok.
 */
const GrafikZ = z.object({
  tur: z.literal("grafik"),
  baslik: Etiket,
  xEtiket: Etiket,
  yEtiket: Etiket,
  egriler: z
    .array(
      z.object({
        ad: Etiket,
        noktalar: z
          .array(z.object({ x: z.number().finite(), y: z.number().finite() }))
          .min(2)
          .max(40),
      }),
    )
    .min(1)
    .max(3),
});

/** Süreç zinciri — hukuk, fıkıh, biyoloji. */
const SurecZ = z.object({
  tur: z.literal("surec"),
  baslik: Etiket,
  adimlar: z.array(z.object({ ad: Etiket, aciklama: KisaMetin })).min(2).max(6),
});

/**
 * Simülasyon — hareketi kod üretir.
 * `model` hangi olayın gösterileceğini seçer; parametreler başlangıç
 * değerleridir. Desteklenmeyen bir model adı şemadan geçemez.
 */
const SimulasyonZ = z.object({
  tur: z.literal("simulasyon"),
  baslik: Etiket,
  model: z.enum(["atis", "serbest-dusus", "sarkac"]),
  hiz: z.number().min(0).max(200).optional(),
  aci: z.number().min(0).max(90).optional(),
  yukseklik: z.number().min(0).max(500).optional(),
  uzunluk: z.number().min(0.1).max(20).optional(),
});

export const GorselZ = z.discriminatedUnion("tur", [
  ZamanCizgisiZ,
  SinirZ,
  GrafikZ,
  SurecZ,
  SimulasyonZ,
]);

export type Gorsel = z.infer<typeof GorselZ>;
export type ZamanCizgisi = z.infer<typeof ZamanCizgisiZ>;
export type Sinir = z.infer<typeof SinirZ>;
export type Grafik = z.infer<typeof GrafikZ>;
export type Surec = z.infer<typeof SurecZ>;
export type Simulasyon = z.infer<typeof SimulasyonZ>;

export const ModeResultZ = z.object({
  foot: z.string().max(300),
  mertebe: MertebeZ.optional(),
  /** Görsel anlatım — yalnız gerektiğinde. Yoksa harita metinle kalır. */
  gorsel: GorselZ.optional(),
  /** İstenen sayı 4/4/5/3'tür; model sapabilir, arayüz 3–6 arasını çizer. */
  branches: z.array(BranchZ).min(3).max(6),
});

export type Mertebe = z.infer<typeof MertebeZ>;
export type Mizan = z.infer<typeof MizanZ>;
export type Branch = z.infer<typeof BranchZ>;
export type ModeResult = z.infer<typeof ModeResultZ>;

/* ────────────────────────────────────────────────────────────
   İçerik kuralları — sunucuda ayrıca doğrulanır

   Yapılandırılmış çıktı yalnız BİÇİMİ garanti eder: alanın var olduğunu ve
   tipini. "En fazla 15 kelime" ya da "2-3 cümle" gibi kurallar şemayla
   söylenemez, bu yüzden burada elle sayılır. Model bu kuralları promptta
   görür; buradaki denetim onun tuttuğunun kanıtıdır.
   ──────────────────────────────────────────────────────────── */

/** Etiketleri atıp kelime sayar. */
export function wordCount(s: string): number {
  const t = s.replace(/<[^>]*>/g, " ").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Cümle sayar. Nokta/ünlem/soru işaretinin ardından boşluk ya da metin sonu
 * aranır; böylece "3.5" gibi ondalıklar cümle sonu sayılmaz.
 */
export function sentenceCount(s: string): number {
  const t = s.replace(/<[^>]*>/g, " ");
  const hits = t.match(/[.!?…]+(?=\s|$)/g);
  if (hits) return hits.length;
  return t.trim() ? 1 : 0;
}

/** Açılan <b> etiketi sayısı. */
export function boldCount(s: string): number {
  return (s.match(/<b>/gi) ?? []).length;
}

const MAX_SENTENCE_WORDS = 15;
const PARA_SENTENCES = { min: 2, max: 3 };
const MAX_BOLD = 2;

/**
 * `name` ve `word` sınırları 4 ve 1'den gevşetildi.
 *
 * Gerçek modelle ilk canlı denemede iki adım tam bu iki kuraldan düştü.
 * Sebep Türkçe: "besin ögesi", "enerji dengesi", "hukukî statü" gibi terimler
 * tek kelimeye sığmaz; tek kelimeye zorlanınca model ya terimi bozar ya kuralı
 * çiğner. İki kelime KELİME katmanının "tek çıpa" fikrini korur, terimi bozmaz.
 *
 * Bu sayılar 02-VERİ-ŞEMASI ve 03-PROMPTLAR §1 ile birlikte değişmelidir;
 * promptta yazan sınır ile burada denetlenen sınır ayrılırsa model kendisine
 * söylenmemiş bir kuraldan düşer.
 */
const MAX_NAME_WORDS = 5;
const MAX_WORD_WORDS = 2;

/**
 * Moda göre içerik kuralları uygulayan şema.
 *
 * `name` ve `word` kısıtları yalnız ilk üç moda uygulanır: bu kurallar ortak
 * sistem promptunda tanımlıdır (03-PROMPTLAR §1) ve Mîzân'ın kendi sistem
 * promptunda yer almaz. Mîzân'da `name` iddianın tırnak içindeki kendisidir,
 * `word` ise sunucuda sayılardan türetilir — ikisi de kelime sayısıyla
 * sınırlanamaz.
 */
export function modeResultSchema(mode: ModeKey) {
  const isMizan = mode === "mizan";
  const isBagli = mode === "bagli";

  return ModeResultZ.superRefine((result, ctx) => {
    // Bağ adımında mertebe zorunludur: bağın ilimlere mi konulara mı
    // kurulacağını o belirler, dolayısıyla eksikse dal sayısı doğru olsa bile
    // sonuç yorumlanamaz.
    if (isBagli && !result.mertebe) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mertebe"],
        message: "Bağ adımında mertebe (ilim | konu) belirtilmeli.",
      });
    }

    result.branches.forEach((b, i) => {
      // Konu düzeyi bağda dal "başka bir ilimdeki konu"dur; hangi ilim olduğu
      // söylenmezse bağ yarım kalır — kullanıcı konuyu bir yere oturtamaz.
      if (isBagli && result.mertebe === "konu" && !b.ilim.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["branches", i, "ilim"],
          message: "Konu mertebesinde her dal hangi ilme ait olduğunu belirtmeli.",
        });
      }

      const at = (field: string) => ["branches", i, field];

      if (!isMizan) {
        if (wordCount(b.name) > MAX_NAME_WORDS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: at("name"),
            message: `name en fazla ${MAX_NAME_WORDS} kelime olmalı (${wordCount(b.name)}).`,
          });
        }
        if (wordCount(b.word) > MAX_WORD_WORDS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: at("word"),
            message: `word en fazla ${MAX_WORD_WORDS} kelime olmalı (${wordCount(b.word)}).`,
          });
        }
      }

      if (wordCount(b.sentence) > MAX_SENTENCE_WORDS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: at("sentence"),
          message: `sentence en fazla ${MAX_SENTENCE_WORDS} kelime olmalı (${wordCount(b.sentence)}).`,
        });
      }

      const sentences = sentenceCount(b.para);
      if (sentences < PARA_SENTENCES.min || sentences > PARA_SENTENCES.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: at("para"),
          message: `para ${PARA_SENTENCES.min}-${PARA_SENTENCES.max} cümle olmalı (${sentences}).`,
        });
      }

      if (boldCount(b.para) > MAX_BOLD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: at("para"),
          message: `para en fazla ${MAX_BOLD} adet <b> vurgusu taşıyabilir (${boldCount(b.para)}).`,
        });
      }

      if (isMizan && !b.mizan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: at("mizan"),
          message: "Mîzân modunda her dal tez/karsi taşımalı.",
        });
      }
    });
  });
}

/* ────────────────────────────────────────────────────────────
   API sözleşmesi — 01-MİMARİ §3
   ──────────────────────────────────────────────────────────── */

export const AnalyzeRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(MIN_TOPIC, `Mevzu en az ${MIN_TOPIC} karakter olmalı.`)
    .max(MAX_TOPIC, `Mevzu en fazla ${MAX_TOPIC} karakter olabilir.`)
    .refine((s) => !hasControlChars(s), "Mevzu geçersiz karakter içeriyor."),
  step: z.enum(MODES, { errorMap: () => ({ message: "Geçersiz analiz adımı." }) }),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export type ErrorCode = "RATE" | "PARSE" | "UPSTREAM" | "INPUT";

export type AnalyzeResponse =
  | { ok: true; data: ModeResult }
  | { ok: false; error: string; code: ErrorCode };

/** Dört adımın tamamı — istemcide birleştirilen nesne. */
export interface Analysis {
  topic: string;
  nedir?: ModeResult;
  nedegildir?: ModeResult;
  bagli?: ModeResult;
  mizan?: ModeResult;
}
