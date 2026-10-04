import type { NextConfig } from "next";

/**
 * İki derleme kipi vardır.
 *
 *  · Varsayılan: tam uygulama. `/api/analyze` çalışır, canlı analiz yapılır.
 *  · GZ_STATIC=1: GitHub Pages için statik tanıtım çıktısı. Sunucu yoktur,
 *    dolayısıyla API route derlemeye hiç girmez (bkz. scripts/build-static.mjs)
 *    ve yalnız önbellekli örnekler açılır.
 *
 * Statik kip normal davranışa dokunmaz; tek yaptığı, sunucusuz bir ortamda
 * neyin çalışıp neyin çalışmadığını dürüstçe göstermektir.
 */
const isStatic = process.env.GZ_STATIC === "1";

/**
 * Alt dizin desteği — artık her iki kipte de geçerli.
 *
 * Uygulama üç ayrı yerde sunulabiliyor ve üçünün kök yolu farklı:
 *   · kendi alanında          → kök (önek yok)
 *   · GitHub Pages proje sayfası → /<depo-adı>
 *   · başka bir sitenin altında  → /gz gibi bir yol
 *
 * `GZ_BASE_PATH` verilmezse statik kip Pages'i varsayar, sunucu kipi kökü.
 * Boş string geçerli bir değerdir ve "önek yok" demektir; bu yüzden `??`
 * kullanılıyor, `||` değil — `||` boş string'i yok sayıp Pages'e düşerdi.
 */
const basePath = process.env.GZ_BASE_PATH ?? (isStatic ? "/GelismisZeka" : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Aynı önek istemciye de bildirilir (bkz. lib/base-path.ts). Buradan
   * türetilmesi şart: iki ayrı ortam değişkeni elle tutulsaydı biri
   * güncellenip diğeri unutulduğunda uygulama açılır ama API ve kütüphane
   * istekleri sessizce 404 dönerdi — fark edilmesi en zor hata türü.
   */
  env: { NEXT_PUBLIC_GZ_BASE_PATH: basePath },
  /**
   * Kütüphane gövdeleri `public/` altında durur ve API route onları dosya
   * yolundan okur. Yol çalışma zamanında kurulduğu için izleyici bu dosyaları
   * kendiliğinden bulamaz; sunucusuz pakete açıkça dâhil edilmeleri gerekir.
   */
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/kutuphane/**"],
  },
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  ...(isStatic
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
