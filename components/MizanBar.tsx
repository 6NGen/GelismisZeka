"use client";

import { mizanWidths, verdict } from "@/lib/modes";
import type { Mizan } from "@/lib/schema";

/**
 * Terazi çubuğu — tez ve karşı delilin ağırlıkları.
 *
 * Hüküm cümlesi modelden gelmez; sayıdan burada hesaplanır. Ölçek bilerek
 * çıplaktır: iddia zayıfsa çubuk bunu yumuşatmadan gösterir.
 */
export default function MizanBar({ mizan, accent }: { mizan: Mizan; accent: string }) {
  const width = mizanWidths(mizan);

  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.72rem]">
        <span className="tr-caps text-parchment-faint">Mîzân</span>
        <span className="text-parchment-dim">
          Tez {mizan.tez} — Karşı {mizan.karsi}
        </span>
      </div>

      <div
        className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-ink"
        role="img"
        aria-label={`Tez ağırlığı ${mizan.tez}, karşı ağırlığı ${mizan.karsi}.`}
      >
        <div style={{ width: `${width.tez}%`, background: accent }} />
        <div className="bg-step-nedegildir" style={{ width: `${width.karsi}%` }} />
      </div>

      <div className="mt-1.5 flex justify-between text-[0.68rem] text-parchment-faint">
        <span>Tez</span>
        <span>Karşı</span>
      </div>

      <p className="mt-3 text-[0.85rem] leading-relaxed text-parchment">{verdict(mizan)}</p>
    </div>
  );
}
