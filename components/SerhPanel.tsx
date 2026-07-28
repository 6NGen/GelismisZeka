"use client";

import { safeRich } from "@/lib/sanitize";
import type { Branch } from "@/lib/schema";

import MizanBar from "./MizanBar";

/**
 * Şerh paneli — üç katman: KELİME → CÜMLE → PARAGRAF.
 *
 * `name`, `ar`, `word`, `sentence` React'in kendi kaçışlamasıyla düz metin
 * olarak basılır. Yalnız `para` zengin metindir ve `safeRich`'ten geçer;
 * o fonksiyondan geçmeyen hiçbir metin buraya HTML olarak verilmemelidir.
 */
export default function SerhPanel({ branch, accent }: { branch: Branch; accent: string }) {
  return (
    <article className="rounded-sm border border-ink-line bg-ink-soft/60 p-5 sm:p-6">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[1.1rem] leading-tight" style={{ color: accent }}>
          {branch.name}
        </h3>
        {branch.ar ? (
          <span lang="ar" dir="rtl" className="shrink-0 text-[0.95rem] text-parchment-faint">
            {branch.ar}
          </span>
        ) : null}
      </header>

      <p className="tr-caps mt-4 text-[0.7rem] text-parchment-faint">Kelime</p>
      <p className="mt-1 text-[1rem] text-parchment">{branch.word}</p>

      <p className="tr-caps mt-4 text-[0.7rem] text-parchment-faint">Cümle</p>
      <p className="mt-1 border-l-2 pl-3 text-[0.95rem] leading-relaxed text-parchment" style={{ borderColor: accent }}>
        {branch.sentence}
      </p>

      {branch.mizan ? (
        <div className="mt-5">
          <MizanBar mizan={branch.mizan} accent={accent} />
        </div>
      ) : null}

      <p className="tr-caps mt-5 text-[0.7rem] text-parchment-faint">Paragraf</p>
      <p
        className="mt-1 text-[0.92rem] leading-relaxed text-parchment-dim [&_b]:text-parchment [&_b]:font-semibold [&_i]:italic"
        dangerouslySetInnerHTML={{ __html: safeRich(branch.para) }}
      />
    </article>
  );
}
