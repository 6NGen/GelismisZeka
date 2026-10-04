/**
 * İstemcinin kök yolu.
 *
 * Next, `basePath` önekini `next/link` ve `next/image` için kendiliğinden
 * ekler ama HAM `fetch` için eklemez. Uygulama bir alt dizinde sunulduğunda
 * (GitHub Pages proje sayfası, ya da 6ngen.com/gz gibi bir yol) `/api/analyze`
 * ve kütüphane dosyaları yanlış adresten istenir ve sessizce 404 döner.
 *
 * Bu yüzden önek derleme sırasında istemciye ayrıca bildirilir ve ham istek
 * kuran her yer buradan geçer. Tek kaynak olması şart: iki yer ayrı ayrı
 * okusaydı biri güncellenip diğeri unutulduğunda yalnız o yol kırılırdı.
 *
 * Boş string geçerli ve varsayılan değerdir — kökte sunulan uygulamada önek yok.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_GZ_BASE_PATH ?? "";

/** Uygulama içi mutlak yolu, sunulduğu kök yola göre tamamlar. */
export function appPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
