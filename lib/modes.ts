import type { Mizan } from "./schema";

/**
 * Mod sabitleri ve zod'a ihtiyaç duymayan yardımcılar.
 *
 * Bu dosya bilerek bağımlılıksızdır: bileşenler etiketleri ve mîzân hükmünü
 * buradan alır, böylece doğrulama kitaplığı istemci paketine girmez.
 * Tipler `schema.ts`'ten yalnızca `import type` ile gelir ve derlemede silinir.
 */

export const MODES = ["nedir", "nedegildir", "bagli", "mizan"] as const;
export type ModeKey = (typeof MODES)[number];

/** İlerleme göstergesindeki adım adları — 04-TASARIM §4.7. */
export const MODE_LABELS: Record<ModeKey, string> = {
  nedir: "Birinci soru — Bu nedir?",
  nedegildir: "İkinci soru — Bu ne değildir?",
  bagli: "Üçüncü soru — Bu neye bağlıdır?",
  mizan: "Mîzân — bağımsız yanlışlayıcı çağrı",
};

/** Merkez düğümdeki hap rozet: aktif GZ sorusu — 04-TASARIM §4.1. */
export const MODE_QUESTIONS: Record<ModeKey, string> = {
  nedir: "Bu nedir?",
  nedegildir: "Bu ne değildir?",
  bagli: "Bu neye bağlıdır?",
  mizan: "Bağımsız yanlışlayıcı çağrı",
};

/** Merkez düğümün adı; Mîzân modunda mevzunun yerine bu yazar. */
export const MIZAN_CENTER_NAME = "ASİMETRİ TESTİ";

/** Mod sekmesi etiketi. Zaten büyük harfle yazılıdır; CSS ile büyütülmez. */
export const MODE_TABS: Record<ModeKey, string> = {
  nedir: "NEDİR",
  nedegildir: "NE DEĞİLDİR",
  bagli: "NEYE BAĞLIDIR",
  mizan: "MÎZÂN",
};

/** Her modun istenen dal sayısı — promptla aynı olmalıdır. */
export const MODE_BRANCH_COUNT: Record<ModeKey, number> = {
  nedir: 4,
  nedegildir: 4,
  bagli: 5,
  mizan: 3,
};

export const MIN_TOPIC = 2;
export const MAX_TOPIC = 120;

export function isModeKey(v: unknown): v is ModeKey {
  return typeof v === "string" && (MODES as readonly string[]).includes(v);
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

/* ────────────────────────────────────────────────────────────
   Mîzân hükmü — istemcide hesaplanır, modele sorulmaz.

   Hükmü modele sordurmak, tartıyı yapanın kendi tartısını yorumlaması olurdu.
   Sayıyı model verir; ondan çıkan sonucu kod söyler.
   ──────────────────────────────────────────────────────────── */

export function verdict(m: Mizan): string {
  if (m.karsi > m.tez) return "Karşı-düğüm ağır basıyor — iddia bu hâliyle zayıf.";
  if (m.tez > m.karsi) return "Tez ağır basıyor — iddia karşı delile rağmen ayakta.";
  return "Terazi dengede — hüküm için delil yetersiz.";
}

/** Çubuk genişlikleri. Sıfıra bölmeye karşı payda `|| 1`. */
export function mizanWidths(m: Mizan): { tez: number; karsi: number } {
  const total = m.tez + m.karsi || 1;
  return { tez: (m.tez / total) * 100, karsi: (m.karsi / total) * 100 };
}
