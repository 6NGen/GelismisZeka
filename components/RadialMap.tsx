"use client";

import { useEffect, useRef, useState } from "react";

import { MIZAN_CENTER_NAME, MODE_QUESTIONS, type ModeKey } from "@/lib/modes";
import type { Branch } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

type Props = {
  topic: string;
  mode: ModeKey;
  branches: Branch[];
  selected: number;
  onSelect: (index: number, trigger: HTMLButtonElement) => void;
};

/** 04-TASARIM §4.4 — radyal yerleşim. Tepeden başlar, hafif basık elips. */
function layout(index: number, count: number, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.4;
  const a = (2 * Math.PI * index) / count - Math.PI / 2;
  return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.92, cx, cy };
}

export default function RadialMap({ topic, mode, branches, selected, onSelect }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Yerleşim formülü piksel ister; sahne ölçüsü değiştikçe yeniden hesaplanır.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ w: box.width, h: box.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = branches.map((_, i) => layout(i, branches.length, size.w, size.h));
  const ready = size.w > 0 && size.h > 0;

  return (
    <div ref={sceneRef} className="scene relative mx-auto w-full max-w-[38rem]">
      {/* §4.3 — bağlantı çizgileri; zincir halkası orta noktada */}
      {ready ? (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.w} ${size.h}`}
          aria-hidden
          focusable="false"
        >
          {points.map((p, i) => {
            const color = branchColor(i);
            return (
              <g key={i} opacity={0.55}>
                <line
                  x1={p.cx}
                  y1={p.cy}
                  x2={p.x}
                  y2={p.y}
                  stroke={color}
                  strokeWidth={1.6}
                  strokeDasharray="5 4"
                />
                <circle cx={(p.cx + p.x) / 2} cy={(p.cy + p.y) / 2} r={4} fill={color} />
              </g>
            );
          })}
        </svg>
      ) : null}

      {/* §4.1 — merkez düğüm */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="center-node flex flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="cn-label" lang="tr">
            Sorulan Mevzu
          </span>
          <span className="cn-name">{mode === "mizan" ? MIZAN_CENTER_NAME : topic}</span>
          <span className="cn-q">{MODE_QUESTIONS[mode]}</span>
        </div>
      </div>

      {/* §4.2 — dal düğümleri */}
      {ready
        ? branches.map((branch, i) => {
            const p = points[i];
            const color = branchColor(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={i === selected}
                onClick={(e) => onSelect(i, e.currentTarget)}
                style={
                  {
                    left: `${p.x}px`,
                    top: `${p.y}px`,
                    "--branch-color": color,
                    "--branch-delay": `${i * 0.08}s`,
                  } as React.CSSProperties
                }
                className="branch-node text-center"
              >
                <span className="branch-name block text-[11.5px] font-semibold leading-tight text-ink">
                  {branch.name}
                </span>
                {branch.ar ? (
                  <span className="ar mt-0.5 block text-[12px] text-muted">{branch.ar}</span>
                ) : null}
                <span className="branch-hint mt-1 block text-[9px] text-muted">▸ şerhi aç</span>
              </button>
            );
          })
        : null}
    </div>
  );
}
