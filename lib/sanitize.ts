import { hasControlChars } from "./steps";

/**
 * Model çıktısı istemciye ham verilmez.
 *
 * React metni zaten kaçışlayarak basar, ama bu güvence tek katmandır ve
 * `dangerouslySetInnerHTML` bir gün eklenirse sessizce kaybolur. Buradaki
 * temizlik, çıktıyı işaretleme dili taşıyamaz hale getirir: açılı parantez
 * hiç geçmez, kontrol karakteri hiç geçmez.
 */

const ANGLE = /[<>]/g;

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

export function sanitizeText(s: string, maxLength = 2000): string {
  return stripControl(s)
    .replace(ANGLE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Bir nesnenin tüm string alanlarını derinlemesine temizler. Sayılar dokunulmaz. */
export function sanitizeDeep<T>(value: T, maxLength = 2000): T {
  if (typeof value === "string") {
    return sanitizeText(value, maxLength) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, maxLength)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeep(v, maxLength);
    }
    return out as unknown as T;
  }
  return value;
}
