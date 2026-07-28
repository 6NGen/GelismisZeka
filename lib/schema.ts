import { z } from "zod";

import { hasControlChars, MAX_TOPIC, MIN_TOPIC, STEPS } from "./steps";

export type { Step } from "./steps";

/* ────────────────────────────────────────────────────────────
   Dal şemaları

   İlk üç adım aynı dal biçimini kullanır: kelime → cümle → paragraf.
   Mîzân farklıdır; bir iddia ve onu yıkabilecek testi taşır.
   ──────────────────────────────────────────────────────────── */

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

export const BranchSchema = z.object({
  title: nonEmpty(60),
  gloss: nonEmpty(240),
  detail: nonEmpty(1200),
});

export const MizanBranchSchema = z.object({
  /** Sınanan iddia. */
  claim: nonEmpty(240),
  /** Bu iddiayı yanlışlayacak gözlem — asimetri testinin kendisi. */
  test: nonEmpty(600),
  /** Testin sonucu: iddia ayakta mı, kısmen mi, düştü mü. */
  verdict: nonEmpty(600),
  /** İddianın testten sonra kalan ağırlığı, 0–100. */
  weight: z.number().min(0).max(100),
});

export type Branch = z.infer<typeof BranchSchema>;
export type MizanBranch = z.infer<typeof MizanBranchSchema>;

/* ────────────────────────────────────────────────────────────
   Adım çıktısı

   Dal sayıları promptta kesin verilir (4 / 4 / 5 / 3) ama doğrulama
   bilerek toleranslıdır: modelin bir dal fazla vermesi analizi çöpe
   atmayı hak etmez. Kısmi başarı tam başarısızlıktan iyidir.
   ──────────────────────────────────────────────────────────── */

export const BranchResultSchema = z.object({
  foot: nonEmpty(400),
  branches: z.array(BranchSchema).min(2).max(8),
});

export const MizanResultSchema = z.object({
  foot: nonEmpty(400),
  branches: z.array(MizanBranchSchema).min(2).max(5),
});

export type BranchResult = z.infer<typeof BranchResultSchema>;
export type MizanResult = z.infer<typeof MizanResultSchema>;
export type StepResult = BranchResult | MizanResult;

export function schemaForStep(step: (typeof STEPS)[number]) {
  return step === "mizan" ? MizanResultSchema : BranchResultSchema;
}

/* ────────────────────────────────────────────────────────────
   API sözleşmesi
   ──────────────────────────────────────────────────────────── */

export const AnalyzeRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(MIN_TOPIC, `Mevzu en az ${MIN_TOPIC} karakter olmalı.`)
    .max(MAX_TOPIC, `Mevzu en fazla ${MAX_TOPIC} karakter olabilir.`)
    .refine((s) => !hasControlChars(s), "Mevzu geçersiz karakter içeriyor."),
  step: z.enum(STEPS, { errorMap: () => ({ message: "Geçersiz analiz adımı." }) }),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export type ErrorCode = "RATE" | "PARSE" | "UPSTREAM" | "INPUT";

export type AnalyzeResponse =
  | { ok: true; data: StepResult }
  | { ok: false; error: string; code: ErrorCode };

/** Dört adımın tamamı — istemcide birleştirilen nesne. */
export type Analysis = {
  topic: string;
  nedir?: BranchResult;
  nedegildir?: BranchResult;
  bagli?: BranchResult;
  mizan?: MizanResult;
};
