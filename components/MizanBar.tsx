"use client";

import { mizanWidths, verdict } from "@/lib/modes";
import type { Mizan } from "@/lib/schema";
import { MIZAN_KARSI_COLOR, MIZAN_TEZ_COLOR } from "@/lib/theme";

/**
 * 04-TASARIM §4.6 — Mîzân çubuğu.
 *
 * Renk tek ayırt edici değildir: altındaki DM Mono satırı "TEZ n" ve
 * "KARŞI-DÜĞÜM n" yazar (§6). Hüküm cümlesi modelden gelmez, koddan hesaplanır.
 */
export default function MizanBar({ mizan }: { mizan: Mizan }) {
  const width = mizanWidths(mizan);

  return (
    <div>
      <div
        className="mizan-bar flex w-full"
        role="img"
        aria-label={`Tez ${mizan.tez}, karşı-düğüm ${mizan.karsi}.`}
      >
        <div style={{ width: `${width.tez}%`, background: MIZAN_TEZ_COLOR }} />
        <div style={{ width: `${width.karsi}%`, background: MIZAN_KARSI_COLOR }} />
      </div>

      <div className="mt-1.5 flex justify-between">
        <span className="lbl text-[9px]" lang="tr" style={{ color: MIZAN_TEZ_COLOR }}>
          Tez {mizan.tez}
        </span>
        <span className="lbl text-[9px]" lang="tr" style={{ color: MIZAN_KARSI_COLOR }}>
          Karşı-düğüm {mizan.karsi}
        </span>
      </div>

      <p className="mt-2.5 text-[12.5px] italic leading-relaxed text-ink">{verdict(mizan)}</p>
    </div>
  );
}
