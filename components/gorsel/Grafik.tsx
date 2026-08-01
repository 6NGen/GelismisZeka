import type { Grafik } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

/**
 * Eğri/grafik — matematik, fizik, ekonomi.
 *
 * Model formül vermez, örneklenmiş x-y noktaları verir; burada formül
 * değerlendirilmediği için kod çalıştırma yüzeyi yoktur.
 *
 * Ölçekleme gelen veriye göre yapılır. Tek noktalı ya da düz bir eğride
 * aralık sıfır olabilir; payda o durumda 1'e sabitlenir, aksi halde bölme
 * NaN üretir ve grafik hiç çizilmez.
 */
const W = 640;
const H = 300;
const PAD = { sol: 44, sag: 16, ust: 16, alt: 34 };

export default function GrafikGorsel({ veri }: { veri: Grafik }) {
  const hepsi = veri.egriler.flatMap((e) => e.noktalar);
  const xs = hepsi.map((p) => p.x);
  const ys = hepsi.map((p) => p.y);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys);

  const xAralik = xMax - xMin || 1;
  const yAralik = yMax - yMin || 1;

  const px = (x: number) => PAD.sol + ((x - xMin) / xAralik) * (W - PAD.sol - PAD.sag);
  const py = (y: number) => H - PAD.alt - ((y - yMin) / yAralik) * (H - PAD.ust - PAD.alt);

  const cokEgri = veri.egriler.length > 1;

  return (
    <figure className="gorsel">
      <figcaption className="gorsel-baslik">{veri.baslik}</figcaption>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[320px]"
          role="img"
          aria-label={`${veri.baslik}. Yatay eksen ${veri.xEtiket}, dikey eksen ${veri.yEtiket}.`}
        >
          <line
            x1={PAD.sol}
            y1={H - PAD.alt}
            x2={W - PAD.sag}
            y2={H - PAD.alt}
            stroke="var(--line)"
          />
          <line x1={PAD.sol} y1={PAD.ust} x2={PAD.sol} y2={H - PAD.alt} stroke="var(--line)" />

          {veri.egriler.map((egri, ei) => {
            const renk = branchColor(ei);
            const d = egri.noktalar
              .map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`)
              .join(" ");
            return (
              <g key={ei}>
                <path d={d} fill="none" stroke={renk} strokeWidth={2} strokeLinejoin="round" />
                {/* Az noktalı eğrilerde nokta işaretleri veriyi okunur kılar. */}
                {egri.noktalar.length <= 12
                  ? egri.noktalar.map((p, pi) => (
                      <circle key={pi} cx={px(p.x)} cy={py(p.y)} r={2.5} fill={renk} />
                    ))
                  : null}
              </g>
            );
          })}

          <text
            x={(W + PAD.sol) / 2}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted)"
          >
            {veri.xEtiket}
          </text>
          <text
            x={-(H - PAD.alt + PAD.ust) / 2}
            y={13}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted)"
          >
            {veri.yEtiket}
          </text>
        </svg>
      </div>

      {/* Renk tek ayırt edici olmasın (04-TASARIM §6): eğri adları yazılı. */}
      {cokEgri ? (
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {veri.egriler.map((egri, ei) => (
            <span key={ei} className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <span
                className="inline-block h-0.5 w-4"
                style={{ background: branchColor(ei) }}
                aria-hidden
              />
              {egri.ad}
            </span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
