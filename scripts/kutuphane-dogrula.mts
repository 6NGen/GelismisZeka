/**
 * Kütüphanedeki her dosyayı şemadan geçirir.
 *
 * Üretim sırasında `runStep` zaten doğruluyor; buradaki ikinci bakış, elle
 * düzeltilmiş dosyaları da kapsar. Kütüphanenin bütün mesele ettiği şey insan
 * müdahalesi olduğuna göre, o müdahalenin bir alanı bozma ihtimali de vardır.
 *
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/kutuphane-dogrula.mts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { MODE_BRANCH_COUNT, MODES } from "../lib/modes";
import { modeResultSchema } from "../lib/schema";

const DIZIN = join(process.cwd(), "public", "kutuphane");

let sorun = 0;
let uyari = 0;
let dosyaSayisi = 0;

for (const dosya of readdirSync(DIZIN).filter((f) => f.endsWith(".json"))) {
  dosyaSayisi++;
  let analiz: Record<string, unknown>;

  try {
    analiz = JSON.parse(readFileSync(join(DIZIN, dosya), "utf8")) as Record<string, unknown>;
  } catch (err) {
    console.log(`✗ ${dosya} — okunamadı: ${err instanceof Error ? err.message : String(err)}`);
    sorun++;
    continue;
  }

  if (typeof analiz.topic !== "string" || !analiz.topic.trim()) {
    console.log(`✗ ${dosya} — topic alanı yok`);
    sorun++;
  }

  for (const mod of MODES) {
    const bolum = analiz[mod];
    if (!bolum) {
      console.log(`✗ ${dosya} — ${mod} adımı eksik`);
      sorun++;
      continue;
    }
    const sonuc = modeResultSchema(mod).safeParse(bolum);
    if (!sonuc.success) {
      console.log(`✗ ${dosya} — ${mod}: ${sonuc.error.issues[0]?.message}`);
      sorun++;
      continue;
    }

    // Dal sayısı sapması hata değil, uyarıdır: şema 3-6 arasını kabul eder ve
    // sapma yüzünden adımın düşmesi istenmez. Ama kütüphaneye kalıcı olarak
    // giren içerikte, metodun istediği sayıdan sapma gözden kaçmamalı.
    const istenen = MODE_BRANCH_COUNT[mod];
    const gelen = sonuc.data.branches.length;
    if (gelen !== istenen) {
      console.log(`! ${dosya} — ${mod}: ${istenen} dal beklenirken ${gelen} dal var`);
      uyari++;
    }
  }
}

console.log(
  sorun === 0
    ? `${dosyaSayisi} dosyanın tamamı şemadan geçti${uyari > 0 ? ` (${uyari} dal sayısı uyarısı)` : ""}.`
    : `${dosyaSayisi} dosyada ${sorun} sorun bulundu.`,
);

// Uyarı çıkışı düşürmez: dal sayısı metodun tercihi, şemanın şartı değil.
if (sorun > 0) process.exit(1);
