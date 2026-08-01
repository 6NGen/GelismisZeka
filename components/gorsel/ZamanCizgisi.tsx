import type { ZamanCizgisi } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

/**
 * Zaman çizgisi — sıra, dönem ve zaman kipi anlatımları için.
 *
 * İki şerit verildiğinde karşılaştırma olur: "Present Perfect ile Past Simple
 * aynı eksende nerede duruyor" sorusu bir paragraftan daha iyi cevaplanır.
 *
 * Konum modelden 0-100 oranı olarak gelir; piksel hesabı burada yapılır.
 */
export default function ZamanCizgisiGorsel({ veri }: { veri: ZamanCizgisi }) {
  return (
    <figure className="gorsel">
      <figcaption className="gorsel-baslik">{veri.baslik}</figcaption>

      <div className="flex flex-col gap-7 pt-2">
        {veri.seritler.map((serit, si) => {
          const renk = branchColor(si);
          return (
            <div key={si}>
              <p className="lbl mb-3 text-[9px]" style={{ color: renk }} lang="tr">
                {serit.ad}
              </p>

              <div className="relative h-px w-full" style={{ background: "var(--line)" }}>
                {serit.noktalar.map((n, ni) => (
                  <div
                    key={ni}
                    className="absolute top-0 -translate-x-1/2"
                    style={{ left: `${n.konum}%` }}
                  >
                    <span
                      className="block h-2 w-2 -translate-y-1/2 rounded-full"
                      style={{ background: renk }}
                    />
                    {/*
                      Etiketler dönüşümlü olarak alta ve üste yazılır; yan yana
                      gelen iki nokta birbirinin yazısını örtmesin.
                    */}
                    <span
                      className={`absolute left-1/2 w-24 -translate-x-1/2 text-center text-[11px] leading-tight text-muted ${
                        ni % 2 === 0 ? "top-2.5" : "bottom-2.5"
                      }`}
                    >
                      {n.etiket}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
