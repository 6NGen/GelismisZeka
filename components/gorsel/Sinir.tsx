import type { Sinir } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

/**
 * Sınır çizimi — "bu ne değildir" sorusunun doğal görsel biçimi.
 *
 * Soru zaten sınır hakkında olduğu için çizim cevabın süsü değil, kendisidir:
 * neyin hangi tarafta kaldığı tek bakışta görünür. Ortak alan varsa ortada
 * durur — karıştırmanın neden olduğu da böylece görünür olur.
 */
export default function SinirGorsel({ veri }: { veri: Sinir }) {
  const solRenk = branchColor(0);
  const sagRenk = branchColor(1);

  return (
    <figure className="gorsel">
      <figcaption className="gorsel-baslik">{veri.baslik}</figcaption>

      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        {[
          { yan: veri.sol, renk: solRenk },
          { yan: veri.sag, renk: sagRenk },
        ].map(({ yan, renk }, i) => (
          <div
            key={i}
            className="rounded-lg border p-4"
            style={{ borderColor: renk, background: "var(--parch)" }}
          >
            <p className="lbl mb-2.5 text-[9px]" style={{ color: renk }} lang="tr">
              {yan.ad}
            </p>
            <ul className="flex flex-col gap-1.5">
              {yan.ogeler.map((o, oi) => (
                <li key={oi} className="text-[12.5px] leading-snug text-ink">
                  {o}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {veri.ortak.length > 0 ? (
        <div
          className="mt-3 rounded-lg border border-dashed p-3 text-center"
          style={{ borderColor: "var(--line)" }}
        >
          <p className="lbl mb-1.5 text-[9px] text-muted" lang="tr">
            Karıştırılmasının sebebi — ikisinde de var
          </p>
          <p className="text-[12.5px] leading-snug text-ink">{veri.ortak.join(" · ")}</p>
        </div>
      ) : null}
    </figure>
  );
}
