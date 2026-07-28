import { z } from "zod";

import { MAX_TOPIC, MIN_TOPIC, MODES, hasControlChars } from "./modes";

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
  /** Dal adı — en fazla 4 kelime. */
  name: z.string().min(1).max(80),
  /** Arapça terim. Model emin değilse boş bırakır. */
  ar: z.string().max(40).optional().default(""),
  /** KELİME katmanı — tek anahtar kelime. */
  word: z.string().min(1).max(40),
  /** CÜMLE katmanı — tek cümle, ≤15 kelime. */
  sentence: z.string().min(1).max(200),
  /** PARAGRAF katmanı — 2–3 cümle, sınırlı <b>/<i>. */
  para: z.string().min(1).max(900),
  /** Yalnız mîzân modunda bulunur. */
  mizan: MizanZ.optional(),
});

export const ModeResultZ = z.object({
  foot: z.string().max(300),
  /** İstenen sayı 4/4/5/3'tür; model sapabilir, arayüz 3–6 arasını çizer. */
  branches: z.array(BranchZ).min(3).max(6),
});

export type Mizan = z.infer<typeof MizanZ>;
export type Branch = z.infer<typeof BranchZ>;
export type ModeResult = z.infer<typeof ModeResultZ>;

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
