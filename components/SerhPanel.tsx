"use client";

import { useEffect, useRef, useState } from "react";

import { safeRich } from "@/lib/sanitize";
import type { Branch } from "@/lib/schema";
import { badgeBackground } from "@/lib/theme";

import MizanBar from "./MizanBar";

type Props = {
  branch: Branch | null;
  color: string;
  open: boolean;
  onClose: () => void;
};

const LAYERS = ["Kelime", "Cümle", "Paragraf · Şerh"] as const;

/**
 * 04-TASARIM §4.5 — sağdan kayan şerh paneli.
 *
 * Üç katman akordiyondur ve açılışta YALNIZ birincisi açıktır: metodun
 * kademeli açılım ilkesi. Kullanıcı derinleştikçe iner.
 *
 * `word`, `sentence`, `name`, `ar` düz metin olarak basılır; yalnız `para`
 * zengin metindir ve `safeRich`'ten geçer.
 */
export default function SerhPanel({ branch, color, open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [openLayers, setOpenLayers] = useState<boolean[]>([true, false, false]);

  // Yeni bir dal seçildiğinde akordiyon başa döner.
  useEffect(() => {
    setOpenLayers([true, false, false]);
  }, [branch]);

  // Panel açıldığında odak panele taşınır (§6).
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (i: number) =>
    setOpenLayers((prev) => prev.map((v, j) => (j === i ? !v : v)));

  const bodies = branch
    ? [
        <p key="word" className="text-[15px] font-semibold text-ink">
          {branch.word}
        </p>,
        <p key="sentence" className="text-[13.5px] italic leading-relaxed text-ink">
          {branch.sentence}
        </p>,
        <p
          key="para"
          className="text-[13px] text-ink [&_b]:font-semibold"
          style={{ lineHeight: 1.85 }}
          dangerouslySetInnerHTML={{ __html: safeRich(branch.para) }}
        />,
      ]
    : [];

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Şerh"
      // Kapalıyken panel klavyeyle de erişilemez olmalı; yalnız aria-hidden
      // sekme sırasından çıkarmaz.
      inert={!open}
      data-open={open}
      className="serh-panel fixed right-0 top-0 z-30 h-full overflow-y-auto border-l bg-parch p-6 shadow-2xl outline-none"
      style={{ borderColor: "var(--line)" }}
    >
      {branch ? (
        <>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold leading-tight" style={{ color }}>
                {branch.name}
              </h2>
              {branch.ar ? <p className="ar mt-1 text-[15px] text-muted">{branch.ar}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Şerhi kapat"
              className="lbl shrink-0 rounded-full border px-2.5 py-1 text-muted transition-colors hover:text-ink"
              style={{ borderColor: "var(--line)" }}
              lang="tr"
            >
              Kapat
            </button>
          </header>

          {/* Tartı, akordiyonun dışında ve her zaman görünür. */}
          {branch.mizan ? (
            <div className="mt-5">
              <MizanBar mizan={branch.mizan} />
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {LAYERS.map((label, i) => (
              <div key={label}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={openLayers[i]}
                  aria-controls={`serh-layer-${i}`}
                  className="lbl flex w-full items-center justify-between rounded-md px-2.5 py-1.5"
                  style={{ background: badgeBackground(color), color }}
                  lang="tr"
                >
                  <span>{label}</span>
                  <span aria-hidden>{openLayers[i] ? "−" : "+"}</span>
                </button>
                {openLayers[i] ? (
                  <div id={`serh-layer-${i}`} className="px-1 pt-3">
                    {bodies[i]}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
