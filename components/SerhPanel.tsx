"use client";

import MizanBar from "./MizanBar";

export type SerhSection = { label?: string; text: string };

type Props = {
  /** Kelime katmanı — dalın adı. */
  word: string;
  /** Cümle katmanı — tek cümlelik şerh. */
  sentence: string;
  /** Paragraf katmanı — bir veya birkaç bölüm. */
  sections: SerhSection[];
  accent: string;
  /** Yalnız Mîzân modunda verilir. */
  weight?: number;
};

export default function SerhPanel({ word, sentence, sections, accent, weight }: Props) {
  return (
    <article className="rounded-sm border border-ink-line bg-ink-soft/60 p-5 sm:p-6">
      <h3 className="text-[1.15rem] leading-tight" style={{ color: accent }}>
        {word}
      </h3>

      <p className="mt-3 border-l-2 pl-3 text-[0.95rem] leading-relaxed text-parchment" style={{ borderColor: accent }}>
        {sentence}
      </p>

      {typeof weight === "number" ? (
        <div className="mt-5">
          <MizanBar weight={weight} accent={accent} />
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label ? (
              <h4 className="tr-caps mb-1.5 text-[0.7rem] text-parchment-faint">{section.label}</h4>
            ) : null}
            <p className="text-[0.92rem] leading-relaxed text-parchment-dim">{section.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
