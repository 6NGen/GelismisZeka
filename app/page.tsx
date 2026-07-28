"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import AskBar from "@/components/AskBar";
import ModePicker, { MODE_ACCENT } from "@/components/ModePicker";
import ProgressSteps, { type StepState } from "@/components/ProgressSteps";
import RadialMap from "@/components/RadialMap";
import SerhPanel from "@/components/SerhPanel";
import { getCached } from "@/lib/cache";
import { MODES, type ModeKey } from "@/lib/modes";
import { safeRich } from "@/lib/sanitize";
import type { Analysis, AnalyzeResponse } from "@/lib/schema";

const IDLE_STATES: Record<ModeKey, StepState> = {
  nedir: "idle",
  nedegildir: "idle",
  bagli: "idle",
  mizan: "idle",
};

export default function Page() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [states, setStates] = useState<Record<ModeKey, StepState>>(IDLE_STATES);
  const [errors, setErrors] = useState<Partial<Record<ModeKey, string>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeKey>("nedir");
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);

  /** Art arda gönderimlerde geç gelen cevapların ekranı bozmasını engeller. */
  const runId = useRef(0);

  /**
   * `only` verildiğinde yalnız o modlar yeniden çalışır; başarılı adımların
   * sonucu korunur. Tekrar denemenin ödenmiş çağrıları yeniden ödememesi için.
   */
  const runAnalysis = useCallback(async (topic: string, only?: ModeKey[]) => {
    const id = ++runId.current;
    const targets = only ?? MODES;

    setBusy(true);
    setNotice(null);

    if (only) {
      setErrors((e) => {
        const next = { ...e };
        for (const m of only) delete next[m];
        return next;
      });
      setStates((s) => {
        const next = { ...s };
        for (const m of only) next[m] = "idle";
        return next;
      });
    } else {
      setErrors({});
      setSelected(0);
      setMode("nedir");
      setStates(IDLE_STATES);

      const cached = getCached(topic);
      if (cached) {
        setAnalysis(cached);
        setStates({ nedir: "done", nedegildir: "done", bagli: "done", mizan: "done" });
        setNotice("Bu mevzu önbellekte hazırdı — model çağrısı yapılmadı.");
        setBusy(false);
        return;
      }

      setAnalysis({ topic });
    }

    // Ayrı ve sıralı çağrılar. Mîzân çağrısına yalnızca `topic` gider;
    // önceki adımların çıktısı hiçbir şekilde iletilmez.
    for (const step of targets) {
      if (runId.current !== id) return;
      setStates((s) => ({ ...s, [step]: "running" }));

      let payload: AnalyzeResponse;
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, step }),
        });
        payload = (await res.json()) as AnalyzeResponse;
      } catch {
        payload = { ok: false, error: "Bağlantı kurulamadı.", code: "UPSTREAM" };
      }

      if (runId.current !== id) return;

      if (payload.ok) {
        setAnalysis((prev) => (prev ? { ...prev, [step]: payload.data } : prev));
        setStates((s) => ({ ...s, [step]: "done" }));
        continue;
      }

      setErrors((e) => ({ ...e, [step]: payload.error }));
      setStates((s) => ({ ...s, [step]: "error" }));

      // Hız sınırında kalan adımları denemek yalnızca beklemeyi uzatır.
      if (payload.code === "RATE") {
        setNotice(`${payload.error} Dilerseniz hazır mevzulardan biriyle devam edebilirsiniz.`);
        break;
      }
    }

    if (runId.current === id) setBusy(false);
  }, []);

  const available = useMemo<Record<ModeKey, boolean>>(
    () => ({
      nedir: Boolean(analysis?.nedir),
      nedegildir: Boolean(analysis?.nedegildir),
      bagli: Boolean(analysis?.bagli),
      mizan: Boolean(analysis?.mizan),
    }),
    [analysis],
  );

  const result = analysis?.[mode];
  const accent = MODE_ACCENT[mode];
  const index = result ? Math.min(selected, result.branches.length - 1) : 0;
  const branch = result?.branches[index];
  const anyDone = MODES.some((m) => states[m] === "done");
  const failed = MODES.filter((m) => states[m] === "error");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="text-center">
        <p className="tr-caps text-[0.7rem] text-gold-dim">GZ — Gelişmiş Zekâ</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Dinamik Analiz</h1>
        <p className="mx-auto mt-3 max-w-xl text-[0.92rem] leading-relaxed text-parchment-dim">
          Bir mevzu yazın. Geometrik Okuma ve Zincir Öğrenme'nin dört adımı sırayla
          işlesin, sonuç radyal bir ilim haritası olarak açılsın.
        </p>
      </header>

      <section className="mx-auto w-full max-w-2xl">
        <AskBar busy={busy} onSubmit={runAnalysis} />
      </section>

      {analysis ? (
        <section className="flex flex-col gap-6">
          <ProgressSteps states={states} />

          {notice ? (
            <p className="mx-auto max-w-2xl rounded-sm border border-ink-line bg-ink-soft px-4 py-3 text-center text-[0.85rem] text-parchment-dim">
              {notice}
            </p>
          ) : null}

          {anyDone ? (
            <>
              <div className="flex justify-center">
                <ModePicker
                  active={mode}
                  available={available}
                  onChange={(next) => {
                    setMode(next);
                    setSelected(0);
                  }}
                />
              </div>

              {result && branch ? (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
                  <div className="flex flex-col gap-5">
                    <RadialMap
                      center={analysis.topic}
                      branches={result.branches}
                      selected={index}
                      onSelect={setSelected}
                      accent={accent}
                    />
                    <p
                      className="mx-auto max-w-xl text-center text-[0.9rem] leading-relaxed text-parchment-dim [&_b]:text-parchment [&_i]:italic"
                      dangerouslySetInnerHTML={{ __html: safeRich(result.foot) }}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <SerhPanel branch={branch} accent={accent} />

                    {mode === "mizan" ? (
                      <p className="text-[0.78rem] leading-relaxed text-parchment-faint">
                        Bu adım, ilk üç adımın çıktısını görmeden ayrı bir çağrıyla üretildi.
                        Tezi kuran el ile onu yıkmaya çalışan el aynı değildir.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-center text-[0.9rem] text-parchment-dim">
                  {errors[mode] ?? "Bu adım henüz hazır değil."}
                </p>
              )}
            </>
          ) : null}

          {failed.length > 0 && !busy ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
              <p className="text-[0.85rem] text-step-nedegildir">
                {failed.map((m) => errors[m]).filter(Boolean).join(" ")}
              </p>
              <button
                type="button"
                onClick={() => runAnalysis(analysis.topic, failed)}
                className="tr-caps rounded-sm border border-gold-dim px-5 py-2 text-[0.72rem] text-gold transition-colors hover:bg-gold hover:text-ink"
              >
                Tekrar dene
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
