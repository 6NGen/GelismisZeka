import type { Surec } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

/**
 * Süreç zinciri — hukuk, fıkıh, biyoloji gibi sıralı işleyişler için.
 *
 * Numaralandırma anlamlıdır: bu tür anlatımlarda "hangi adım önce" bilginin
 * kendisidir. Zincirde bir halkanın atlanması meselesi (ör. denetimli kazı)
 * ancak sıra görünürse anlaşılır.
 */
export default function SurecGorsel({ veri }: { veri: Surec }) {
  return (
    <figure className="gorsel">
      <figcaption className="gorsel-baslik">{veri.baslik}</figcaption>

      <ol className="flex flex-col gap-0 pt-1">
        {veri.adimlar.map((adim, i) => {
          const renk = branchColor(i);
          const sonuncu = i === veri.adimlar.length - 1;
          return (
            <li key={i} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: renk }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                {/* Halkaları görsel olarak bağlayan dikey çizgi. */}
                {!sonuncu ? (
                  <span className="w-px flex-1" style={{ background: "var(--line)" }} />
                ) : null}
              </div>

              <div className={sonuncu ? "pb-0" : "pb-5"}>
                <p className="text-[13px] font-semibold leading-tight text-ink">{adim.ad}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">{adim.aciklama}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
