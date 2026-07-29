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

/** GitHub Pages proje sayfası alt dizinde sunar: /<depo-adı> */
const basePath = process.env.GZ_BASE_PATH ?? "/GelismisZeka";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStatic
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: `${basePath}/`,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
