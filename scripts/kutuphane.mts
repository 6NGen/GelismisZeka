/**
 * Kütüphane üreticisi — mevzuları önceden analiz edip depoya yazar.
 *
 *   npm run kutuphane            # eksikleri üretir
 *   npm run kutuphane -- --yenile "Faiz"   # tek mevzuu baştan üretir
 *
 * Neden ayrı bir betik:
 *
 *  · KOTA. Üretim kullanıcının önünde değil, burada bir kez yapılır. Sonrasında
 *    o mevzu sonsuza dek bedavadır — hem Vercel'de hem statik GitHub Pages'te.
 *
 *  · DOĞRULUK. Çıktı doğrudan yayına girmez; dosya olarak yazılır, İNSAN OKUR,
 *    sonra depoya işlenir. İlimler arası bağların ve Arapça terimlerin yanlış
 *    olma ihtimali ancak bu ara adımla kesilebilir.
 *
 * Uygulamanın kendi kod yolu kullanılır: aynı promptlar, aynı şema, aynı
 * temizlik, aynı tek-tekrar kuralı. Ayrı bir üretim yolu olsaydı kütüphanedeki
 * içerik canlı üretilenden sessizce farklılaşırdı.
 *
 * `lib/model.ts` "server-only" işaretli olduğu için betik `--conditions=
 * react-server` ile çalıştırılır; npm betiği bunu zaten yapar.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { MODES, type ModeKey } from "../lib/modes";
import { AnalyzeError, runStep } from "../lib/model";
import type { Analysis, ModeResult } from "../lib/schema";
import { slugify } from "../lib/turkish";

const KOK = process.cwd();
const GOVDE_DIZINI = join(KOK, "public", "kutuphane");
const DIZIN_DOSYASI = join(KOK, "data", "kutuphane-index.json");
const MEVZU_DOSYASI = join(KOK, "data", "mevzular.json");

/** Sağlayıcının dakikalık sınırına yaklaşmamak için çağrılar arası bekleme. */
const ARALIK_MS = Number(process.env.GZ_KUTUPHANE_ARALIK ?? 3000);

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Girdi = { slug: string; topic: string };

function dizinOku(): Girdi[] {
  if (!existsSync(DIZIN_DOSYASI)) return [];
  return JSON.parse(readFileSync(DIZIN_DOSYASI, "utf8")) as Girdi[];
}

function dizinYaz(girdiler: Girdi[]): void {
  // Sıralı tutmak, iki ayrı üretimin diff'te gereksiz çakışmasını önler.
  const sirali = [...girdiler].sort((a, b) => a.slug.localeCompare(b.slug, "tr"));
  writeFileSync(DIZIN_DOSYASI, JSON.stringify(sirali, null, 2) + "\n");
}

/**
 * Bir adımı çalıştırır; DAKİKALIK kotaya takılırsa bekleyip tekrar dener.
 *
 * Toplu üretimde beklemek doğru davranıştır: dakikalık sınır saniyeler içinde
 * açılır ve iş zaten arka planda çalışıyordur. Canlı akışta aynı şeyi yapmak
 * kullanıcıyı ekran başında bekletirdi — bu yüzden orada değil, burada.
 *
 * Günlük kotada beklenmez: `retryAfterSec` tanımsız gelir, hata yukarı çıkar
 * ve üretim durur.
 */
async function adimCalistir(mod: ModeKey, topic: string, kalanDeneme = 3): Promise<ModeResult> {
  try {
    return await runStep(mod, topic);
  } catch (err) {
    if (err instanceof AnalyzeError && err.retryAfterSec && kalanDeneme > 1) {
      const saniye = err.retryAfterSec + 2;
      process.stdout.write(`dakikalık kota — ${saniye}s bekleniyor… `);
      await bekle(saniye * 1000);
      return adimCalistir(mod, topic, kalanDeneme - 1);
    }
    throw err;
  }
}

async function mevzuUret(topic: string): Promise<Analysis> {
  const sonuclar: Partial<Record<ModeKey, ModeResult>> = {};

  for (const [i, mod] of MODES.entries()) {
    if (i > 0) await bekle(ARALIK_MS);
    process.stdout.write(`    ${mod}… `);
    // runStep şemayı, içerik kurallarını, temizliği ve §7 tekrarını uygular.
    // Hatalıysa fırlatır; o mevzu yarım yazılmaz.
    sonuclar[mod] = await adimCalistir(mod, topic);
    process.stdout.write("tamam\n");
  }

  return { topic, ...sonuclar } as Analysis;
}

async function main() {
  const argv = process.argv.slice(2);
  const yenileIndex = argv.indexOf("--yenile");
  const yenilenecek = yenileIndex >= 0 ? argv.slice(yenileIndex + 1) : [];

  if (!existsSync(MEVZU_DOSYASI)) {
    console.error(`Mevzu listesi yok: ${MEVZU_DOSYASI}`);
    process.exit(1);
  }

  const mevzular = JSON.parse(readFileSync(MEVZU_DOSYASI, "utf8")) as string[];
  mkdirSync(GOVDE_DIZINI, { recursive: true });

  const dizin = dizinOku();
  const dizinHarita = new Map(dizin.map((g) => [g.slug, g]));

  let uretilen = 0;
  let atlanan = 0;
  const dusenler: { topic: string; sebep: string }[] = [];

  for (const topic of mevzular) {
    const slug = slugify(topic);
    const dosya = join(GOVDE_DIZINI, `${slug}.json`);
    const zorla = yenilenecek.length > 0 && yenilenecek.includes(topic);

    // Devam edebilirlik: var olan yeniden üretilmez. Yarıda kesilen bir
    // üretim tekrar çalıştırıldığında kaldığı yerden sürer, kota yanmaz.
    if (existsSync(dosya) && !zorla) {
      dizinHarita.set(slug, { slug, topic });
      atlanan++;
      continue;
    }
    if (yenilenecek.length > 0 && !zorla) continue;

    console.log(`\n· ${topic}`);
    try {
      const analiz = await mevzuUret(topic);
      writeFileSync(dosya, JSON.stringify(analiz, null, 2) + "\n");
      dizinHarita.set(slug, { slug, topic });
      uretilen++;
    } catch (err) {
      const sebep = err instanceof Error ? err.message : String(err);
      console.log(`    DÜŞTÜ — ${sebep}`);
      dusenler.push({ topic, sebep });
      // Günlük kota bittiyse kalanları denemek yalnız aynı hatayı çoğaltır.
      // (Dakikalık kota yukarıda beklenerek geçildi; buraya ulaşmaz.)
      if (/kota|Çok fazla istek/i.test(sebep)) {
        console.log("\nKota sınırına gelindi; üretim burada durduruldu.");
        break;
      }
    }
    await bekle(ARALIK_MS);
  }

  dizinYaz([...dizinHarita.values()]);

  console.log(
    `\n${"─".repeat(52)}\nüretilen: ${uretilen}   zaten vardı: ${atlanan}   düşen: ${dusenler.length}` +
      `\nkütüphanedeki mevzu sayısı: ${dizinHarita.size}`,
  );
  if (dusenler.length > 0) {
    console.log("\nDüşenler:");
    for (const d of dusenler) console.log(`  · ${d.topic} — ${d.sebep}`);
  }
  console.log("\nYayına almadan ÖNCE üretilen dosyaları okuyun: public/kutuphane/");
}

await main();
