"use client";

/**
 * Terazi çubuğu: bir iddianın yanlışlama testinden sonra elinde kalan ağırlık.
 *
 * Sol taraf ayakta kalan, sağ taraf düşen kısımdır. Ölçek bilerek çıplaktır —
 * sayı iyimser görünsün diye yumuşatılmaz.
 */
export default function MizanBar({ weight, accent }: { weight: number; accent: string }) {
  const kept = Math.max(0, Math.min(100, Math.round(weight)));
  const fallen = 100 - kept;

  const label = kept >= 70 ? "Ayakta" : kept >= 35 ? "Sarsıldı" : "Düştü";

  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.72rem]">
        <span className="tr-caps text-parchment-faint">Tartı</span>
        <span style={{ color: accent }}>
          {label} — {kept}/100
        </span>
      </div>

      <div
        className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-ink-soft"
        role="img"
        aria-label={`İddianın kalan ağırlığı yüzde ${kept}, düşen kısım yüzde ${fallen}.`}
      >
        <div style={{ width: `${kept}%`, background: accent }} />
        <div className="bg-ink-line" style={{ width: `${fallen}%` }} />
      </div>
    </div>
  );
}
