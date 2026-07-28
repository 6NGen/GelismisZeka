"use client";

import { STEP_TABS, STEPS, type Step } from "@/lib/steps";

type Props = {
  active: Step;
  /** Verisi gelmemiş veya hata almış adımlar pasif gösterilir. */
  available: Record<Step, boolean>;
  onChange: (step: Step) => void;
};

const ACCENT: Record<Step, string> = {
  nedir: "var(--color-step-nedir)",
  nedegildir: "var(--color-step-nedegildir)",
  bagli: "var(--color-step-bagli)",
  mizan: "var(--color-step-mizan)",
};

export default function ModePicker({ active, available, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Analiz modu" className="flex flex-wrap gap-2">
      {STEPS.map((step) => {
        const enabled = available[step];
        const isActive = step === active;
        return (
          <button
            key={step}
            role="tab"
            aria-selected={isActive}
            disabled={!enabled}
            onClick={() => onChange(step)}
            style={isActive ? { borderColor: ACCENT[step], color: ACCENT[step] } : undefined}
            className={`tr-caps rounded-sm border px-3.5 py-2 text-[0.72rem] transition-colors
              ${
                isActive
                  ? "bg-ink-soft"
                  : enabled
                    ? "border-ink-line text-parchment-dim hover:text-parchment"
                    : "cursor-not-allowed border-ink-line/60 text-parchment-faint opacity-45"
              }`}
          >
            {STEP_TABS[step]}
          </button>
        );
      })}
    </div>
  );
}

export { ACCENT as STEP_ACCENT };
