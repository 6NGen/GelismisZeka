"use client";

import { useState } from "react";

import { EXAMPLES, isCached } from "@/lib/cache";
import { MAX_TOPIC, MIN_TOPIC, hasControlChars } from "@/lib/steps";

type Props = {
  busy: boolean;
  onSubmit: (topic: string) => void;
};

export default function AskBar({ busy, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function submit(raw: string) {
    const topic = raw.trim();
    if (topic.length < MIN_TOPIC) {
      setHint(`Mevzu en az ${MIN_TOPIC} karakter olmalı.`);
      return;
    }
    if (topic.length > MAX_TOPIC) {
      setHint(`Mevzu en fazla ${MAX_TOPIC} karakter olabilir.`);
      return;
    }
    if (hasControlChars(topic)) {
      setHint("Mevzu geçersiz karakter içeriyor.");
      return;
    }
    setHint(null);
    onSubmit(topic);
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="mevzu" className="sr-only">
          Analiz edilecek mevzu
        </label>
        <input
          id="mevzu"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_TOPIC}
          disabled={busy}
          autoComplete="off"
          placeholder="Bir mevzu yazın — örneğin: definecilik"
          className="min-w-0 flex-1 rounded-sm border border-ink-line bg-ink-soft px-4 py-3 text-parchment
                     placeholder:text-parchment-faint focus:border-gold-dim focus:outline-none
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy}
          className="tr-caps shrink-0 rounded-sm border border-gold-dim bg-transparent px-6 py-3 text-[0.75rem]
                     text-gold transition-colors hover:bg-gold hover:text-ink disabled:opacity-40
                     disabled:hover:bg-transparent disabled:hover:text-gold"
        >
          {busy ? "Analiz ediliyor" : "Analiz et"}
        </button>
      </form>

      {hint ? <p className="mt-2 text-[0.8rem] text-step-nedegildir">{hint}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[0.75rem] text-parchment-faint">Hazır mevzular:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={busy}
            onClick={() => {
              setValue(example);
              submit(example);
            }}
            className="rounded-full border border-ink-line px-3 py-1 text-[0.78rem] text-parchment-dim
                       transition-colors hover:border-gold-dim hover:text-parchment disabled:opacity-40"
          >
            {example}
            {isCached(example) ? (
              <span className="ml-1.5 text-gold-dim" title="Önbellekte hazır — API çağrısı yapılmaz">
                ●
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
