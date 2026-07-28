"use client";

import { STEP_LABELS, STEPS, type Step } from "@/lib/steps";

export type StepState = "idle" | "running" | "done" | "error";

const DOT: Record<StepState, string> = {
  idle: "border-ink-line bg-transparent",
  running: "border-gold bg-gold animate-pulse",
  done: "border-gold bg-gold",
  error: "border-step-nedegildir bg-step-nedegildir",
};

const TEXT: Record<StepState, string> = {
  idle: "text-parchment-faint",
  running: "text-parchment",
  done: "text-parchment-dim",
  error: "text-step-nedegildir",
};

export default function ProgressSteps({ states }: { states: Record<Step, StepState> }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
      {STEPS.map((step, i) => {
        const state = states[step];
        return (
          <li key={step} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full border transition-colors ${DOT[state]}`}
            />
            <span className={`text-[0.8rem] transition-colors ${TEXT[state]}`}>
              <span className="text-parchment-faint">{i + 1}.</span> {STEP_LABELS[step]}
              {state === "error" ? " — alınamadı" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
