import type { MizanResult, StepResult } from "./schema";

/**
 * Adım sabitleri ve zod'a ihtiyaç duymayan yardımcılar.
 *
 * Bu dosya bilerek bağımlılıksızdır: bileşenler adım etiketlerini buradan alır,
 * böylece doğrulama kitaplığı istemci paketine girmez. Tipler `schema.ts`'ten
 * yalnızca `import type` ile gelir ve derlemede silinir.
 */

export const STEPS = ["nedir", "nedegildir", "bagli", "mizan"] as const;
export type Step = (typeof STEPS)[number];

/** Adımın sorduğu soru — ilerleme göstergesinde kullanılır. */
export const STEP_LABELS: Record<Step, string> = {
  nedir: "Bu nedir?",
  nedegildir: "Bu ne değildir?",
  bagli: "Bu neye bağlıdır?",
  mizan: "Mîzân",
};

/** Mod sekmesi etiketi. Zaten büyük harfle yazılıdır; CSS ile büyütülmez. */
export const STEP_TABS: Record<Step, string> = {
  nedir: "NEDİR",
  nedegildir: "NE DEĞİLDİR",
  bagli: "NEYE BAĞLIDIR",
  mizan: "MÎZÂN",
};

/** Her adımın istenen dal sayısı — promptla aynı olmalıdır. */
export const STEP_BRANCH_COUNT: Record<Step, number> = {
  nedir: 4,
  nedegildir: 4,
  bagli: 5,
  mizan: 3,
};

export const MIN_TOPIC = 2;
export const MAX_TOPIC = 120;

export function isStep(v: unknown): v is Step {
  return typeof v === "string" && (STEPS as readonly string[]).includes(v);
}

/**
 * Kontrol karakteri taraması. Regex yerine kod noktası döngüsü kullanılır ki
 * kaynak dosyaya gerçek kontrol karakteri gömülmesin.
 */
export function hasControlChars(s: string): boolean {
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function isMizanResult(r: StepResult): r is MizanResult {
  return r.branches.length > 0 && "claim" in r.branches[0];
}
