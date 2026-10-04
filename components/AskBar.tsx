"use client";

import { useState } from "react";

import { EXAMPLES } from "@/lib/cache";
import { MAX_TOPIC, MIN_TOPIC, hasControlChars } from "@/lib/modes";

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
      {/* §5: ≤640px'te giriş satırı dikeye döner */}
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
          style={{ borderColor: "var(--line)", background: "#fff" }}
          className="min-w-0 flex-1 rounded-md border px-4 py-3 text-[15px] text-ink
                     placeholder:text-muted focus:border-gold focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy}
          lang="tr"
          style={{ background: "var(--gold)", color: "#fff" }}
          className="lbl shrink-0 rounded-md px-6 py-3 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Analiz ediliyor" : "Analiz et"}
        </button>
      </form>

      {hint ? (
        <p className="mt-2 text-[13px]" style={{ color: "var(--red)" }}>
          {hint}
        </p>
      ) : null}

      {/*
        Çipler kütüphaneden türetilir, dolayısıyla hepsi zaten hazırdır.
        Eskiden her çipin yanında "önbellekte var" noktası dururdu; kütüphane
        kurulduktan sonra o nokta istisnasız her çipte çıkmaya başladı ve
        ayırt edici olmaktan çıktı. Bilgi tek seferde başlıkta veriliyor.
      */}
      {EXAMPLES.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="lbl text-[9px] text-muted" lang="tr">
            Kütüphaneden
          </span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={busy}
              onClick={() => {
                setValue(example);
                submit(example);
              }}
              title="Kütüphanede hazır — model çağrısı yapılmaz"
              style={{ borderColor: "var(--line)", background: "var(--gold-bg)" }}
              className="rounded-full border px-3 py-1 text-[13px] text-ink transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
