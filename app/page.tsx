"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import AltBilgi from "@/components/AltBilgi";
import AskBar from "@/components/AskBar";
import ModePicker from "@/components/ModePicker";
import ProgressSteps, { type StepState } from "@/components/ProgressSteps";
import RadialMap from "@/components/RadialMap";
import SerhPanel from "@/components/SerhPanel";
import { getCached } from "@/lib/cache";
import { MODES, type ModeKey } from "@/lib/modes";
import { safeRich } from "@/lib/sanitize";
import type { Analysis, AnalyzeResponse } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

/**
 * Statik tanıtım derlemesinde sunucu yoktur: `/api/analyze` mevcut değildir.
 * Bu kipte canlı analiz denenmez; kullanıcıya neden çalışmadığı açıkça söylenir.
 */
const IS_STATIC = process.env.NEXT_PUBLIC_GZ_STATIC === "1";

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Art arda gönderimlerde geç gelen cevapların ekranı bozmasını engeller. */
  const runId = useRef(0);
  /** Panel kapanınca odak buraya döner (04-TASARIM §6). */
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /**
   * `only` verildiğinde yalnız o modlar yeniden çalışır; başarılı adımların
   * sonucu korunur. Tekrar denemenin ödenmiş çağrıları yeniden ödememesi için.
   */
  const runAnalysis = useCallback(async (topic: string, only?: ModeKey[]) => {
    const id = ++runId.current;
    const targets = only ?? MODES;

    setBusy(true);
    setNotice(null);
    setPanelOpen(false);

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

      if (IS_STATIC) {
        setAnalysis(null);
        setNotice(
          "Bu tanıtım sürümü sunucusuz çalışır — canlı analiz kapalıdır. " +
            "Hazır mevzulardan birini seçerseniz haritası önbellekten açılır.",
        );
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

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    triggerRef.current?.focus();
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
  const index = result ? Math.min(selected, result.branches.length - 1) : 0;
  const branch = result?.branches[index] ?? null;
  const anyDone = MODES.some((m) => states[m] === "done");
  const failed = MODES.filter((m) => states[m] === "error");

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="text-center">
        <p className="lbl text-[9px]" style={{ color: "var(--gold)" }} lang="tr">
          GZ · Gelişmiş Zekâ
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Dinamik Analiz</h1>
        {/* 06-İLKELER §6: "cevap" değil harita, "sonuç" değil başlangıç. */}
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
          Bir mevzu yazın. Geometrik Okuma ve Zincir Öğrenme'nin dört adımı sırayla
          işlesin, radyal bir ilim haritası olarak açılsın — yürünecek bir başlangıç.
        </p>
      </header>

      <section className="mx-auto w-full max-w-2xl">
        <AskBar busy={busy} onSubmit={runAnalysis} />
      </section>

      {/* Bilgi notu analiz açılmasa da görünmeli: statik kipte analiz hiç başlamaz. */}
      {notice ? (
        <p
          className="mx-auto max-w-2xl rounded-md border px-4 py-3 text-center text-[13px] text-muted"
          style={{ borderColor: "var(--line)", background: "var(--gold-bg)" }}
        >
          {notice}
        </p>
      ) : null}

      {analysis ? (
        <section className="flex flex-col gap-8">
          <ProgressSteps states={states} />

          {anyDone ? (
            <>
              <ModePicker
                active={mode}
                available={available}
                onChange={(next) => {
                  setMode(next);
                  setSelected(0);
                  setPanelOpen(false);
                }}
              />

              {result ? (
                <div className="flex flex-col gap-6">
                  <RadialMap
                    topic={analysis.topic}
                    mode={mode}
                    branches={result.branches}
                    selected={index}
                    onSelect={(i, trigger) => {
                      triggerRef.current = trigger;
                      setSelected(i);
                      setPanelOpen(true);
                    }}
                  />
                  <p
                    className="mx-auto max-w-2xl text-center text-[13.5px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-ink"
                    dangerouslySetInnerHTML={{ __html: safeRich(result.foot) }}
                  />
                </div>
              ) : (
                <p className="text-center text-[13px] text-muted">
                  {errors[mode] ?? "Bu adım henüz hazır değil."}
                </p>
              )}
            </>
          ) : null}

          {failed.length > 0 && !busy ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
              {/* Dört adım aynı sebeple düşerse mesaj dört kez tekrarlanmasın. */}
              <p className="text-[13px]" style={{ color: "var(--red)" }}>
                {[...new Set(failed.map((m) => errors[m]).filter(Boolean))].join(" ")}
              </p>
              <p className="text-[13px] text-muted">
                Dilerseniz yukarıdaki hazır mevzulardan biriyle devam edebilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => runAnalysis(analysis.topic, failed)}
                lang="tr"
                style={{ background: "var(--gold)", color: "#fff" }}
                className="lbl rounded-md px-5 py-2 transition-opacity hover:opacity-90"
              >
                Tekrar dene
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 06-İLKELER §5: harita altında kalıcı — kaldırılamaz. */}
      <AltBilgi />

      <SerhPanel
        branch={branch}
        color={branchColor(index)}
        open={panelOpen}
        onClose={closePanel}
      />
    </main>
  );
}
