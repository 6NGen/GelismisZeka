"use client";

import { MODES, MODE_TABS, type ModeKey } from "@/lib/modes";

type Props = {
  active: ModeKey;
  /** Verisi gelmemiş veya hata almış modlar pasif gösterilir. */
  available: Record<ModeKey, boolean>;
  onChange: (mode: ModeKey) => void;
};

export default function ModePicker({ active, available, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Analiz modu" className="flex flex-wrap justify-center gap-2">
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
            lang="tr"
            style={{
              background: isActive ? "var(--gold)" : "var(--gold-bg)",
              color: isActive ? "#fff" : enabled ? "var(--ink)" : "var(--muted)",
              borderColor: "var(--line)",
            }}
            className={`lbl rounded-md border px-3 py-2 transition-colors ${
              enabled ? "" : "cursor-not-allowed opacity-45"
            }`}
          >
            {MODE_TABS[mode]}
          </button>
        );
      })}
    </div>
  );
}
