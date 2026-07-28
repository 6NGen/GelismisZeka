"use client";

import { MODES, MODE_LABELS, type ModeKey } from "@/lib/modes";

export type StepState = "idle" | "running" | "done" | "error";

/**
 * 04-TASARIM §4.7 — dört satır, her biri nokta + adım adı.
 *   bekliyor : nokta --line, metin --muted
 *   çalışıyor: nokta --gold + yanıp sönme
 *   bitti    : nokta --green, metin --ink
 */
const DOT_COLOR: Record<StepState, string> = {
  idle: "var(--line)",
  running: "var(--gold)",
  done: "var(--green)",
  error: "var(--red)",
};

const TEXT_COLOR: Record<StepState, string> = {
  idle: "var(--muted)",
  running: "var(--ink)",
  done: "var(--ink)",
  error: "var(--red)",
};

export default function ProgressSteps({ states }: { states: Record<ModeKey, StepState> }) {
  return (
    <ol className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
      {MODES.map((mode) => {
        const state = states[mode];
        return (
          <li key={mode} className="flex items-center gap-3">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${state === "running" ? "dot-running" : ""}`}
              style={{ background: DOT_COLOR[state] }}
            />
            <span className="text-[13px]" style={{ color: TEXT_COLOR[state] }}>
              {MODE_LABELS[mode]}
              {state === "error" ? " — alınamadı" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
