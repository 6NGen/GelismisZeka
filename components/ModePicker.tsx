"use client";

import { MODES, MODE_TABS, type ModeKey } from "@/lib/modes";

type Props = {
  active: ModeKey;
  /** Verisi gelmemiş veya hata almış modlar pasif gösterilir. */
  available: Record<ModeKey, boolean>;
  onChange: (mode: ModeKey) => void;
};

const ACCENT: Record<ModeKey, string> = {
  nedir: "var(--color-step-nedir)",
  nedegildir: "var(--color-step-nedegildir)",
  bagli: "var(--color-step-bagli)",
  mizan: "var(--color-step-mizan)",
};

export default function ModePicker({ active, available, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Analiz modu" className="flex flex-wrap gap-2">
      {MODES.map((mode) => {
        const enabled = available[mode];
        const isActive = mode === active;
        return (
          <button
            key={mode}
            role="tab"
            aria-selected={isActive}
            disabled={!enabled}
            onClick={() => onChange(mode)}
            style={isActive ? { borderColor: ACCENT[mode], color: ACCENT[mode] } : undefined}
            className={`tr-caps rounded-sm border px-3.5 py-2 text-[0.72rem] transition-colors
              ${
                isActive
                  ? "bg-ink-soft"
                  : enabled
                    ? "border-ink-line text-parchment-dim hover:text-parchment"
                    : "cursor-not-allowed border-ink-line/60 text-parchment-faint opacity-45"
              }`}
          >
            {MODE_TABS[mode]}
          </button>
        );
      })}
    </div>
  );
}

export { ACCENT as MODE_ACCENT };
