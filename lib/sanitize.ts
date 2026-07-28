import type { Branch, ModeResult } from "./schema";
import { hasControlChars } from "./modes";

/**
 * HTML güvenliği — 02-VERİ-ŞEMASI §7.
 *
 * `para` ve `foot` alanlarında YALNIZ <b> ve <i> serbesttir.
 * `name`, `word`, `sentence`, `ar` tam kaçışlı basılır — zengin metin yok.
 *
 * İki katman vardır ve ikisi de gereklidir:
 *   1. Sunucu (`sanitizeModeResult`): izinsiz etiketleri model çıktısından siler.
 *   2. İstemci (`safeRich`): basmadan önce kalan her şeyi kaçışlar.
 * Birinci katman atlanırsa ikincisi hâlâ tutar; ikincisi son kapıdır.
 */

/** Kontrol karakterlerini kaldırır; satır sonu ve sekmeyi boşluğa çevirir. */
function stripControl(s: string): string {
  if (!hasControlChars(s)) return s;
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code === 0x09 || code === 0x0a || code === 0x0d) {
      out += " ";
      continue;
    }
    if (code < 0x20 || code === 0x7f) continue;
    out += ch;
  }
  return out;
}

/** Düz alanlar: hiçbir işaretleme geçmez. */
export function sanitizePlain(s: string): string {
  return stripControl(s).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Zengin alanlar: <b> ve <i> korunur, başka her etiket silinir.
 * Önce izinli etiketler küçük harfe indirgenir (<B> → <b>), sonra kalan
 * bütün etiketler atılır — böylece <b class=x> veya <script> geçemez.
 */
export function sanitizeRichSource(s: string): string {
  return stripControl(s)
    .replace(/<\s*(\/?)\s*([bi])\s*>/gi, (_m, slash: string, tag: string) => `<${slash}${tag.toLowerCase()}>`)
    .replace(/<(?!\/?[bi]>)[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Model çıktısının tamamını alan bazında temizler. */
export function sanitizeModeResult(result: ModeResult): ModeResult {
  return {
    foot: sanitizeRichSource(result.foot),
    branches: result.branches.map(
      (b): Branch => ({
        name: sanitizePlain(b.name),
        ar: sanitizePlain(b.ar ?? ""),
        word: sanitizePlain(b.word),
        sentence: sanitizePlain(b.sentence),
        para: sanitizeRichSource(b.para),
        ...(b.mizan ? { mizan: b.mizan } : {}),
      }),
    ),
  };
}

/**
 * Basmadan önceki son kapı. Her şeyi kaçışlar, ardından yalnızca
 * <b>/<i> çiftlerini geri açar. Çıktısı `dangerouslySetInnerHTML` ile
 * kullanılmak üzeredir; bu fonksiyondan geçmeyen metin oraya verilmemelidir.
 */
export function safeRich(input: string): string {
  const esc = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return esc
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>");
}
