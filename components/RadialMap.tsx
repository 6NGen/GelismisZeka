"use client";

export type MapNode = {
  key: string;
  /** Dal başlığı — kelime katmanı. */
  label: string;
  /** Mîzân modunda ağırlık rozeti gibi kısa ek bilgi. */
  badge?: string;
};

type Props = {
  center: string;
  nodes: MapNode[];
  selected: number;
  onSelect: (index: number) => void;
  /** Etkin adımın rengi (CSS renk değeri). */
  accent: string;
};

const RADIUS = 36;

function position(index: number, count: number): { x: number; y: number } {
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180);
  return {
    x: 50 + RADIUS * Math.cos(angle),
    y: 50 + RADIUS * Math.sin(angle),
  };
}

export default function RadialMap({ center, nodes, selected, onSelect, accent }: Props) {
  const points = nodes.map((_, i) => position(i, nodes.length));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      {/* Bağ çizgileri — düğümlerin altında kalır. */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        focusable="false"
      >
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={accent}
          strokeOpacity="0.14"
          strokeWidth="0.3"
        />
        {points.map((p, i) => (
          <line
            key={nodes[i].key}
            x1="50"
            y1="50"
            x2={p.x}
            y2={p.y}
            stroke={accent}
            strokeOpacity={i === selected ? 0.85 : 0.28}
            strokeWidth={i === selected ? 0.6 : 0.35}
          />
        ))}
      </svg>

      {/* Merkez — mevzunun kendisi. */}
      <div className="absolute left-1/2 top-1/2 w-[30%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="flex aspect-square items-center justify-center rounded-full border bg-ink-soft p-3 text-center"
          style={{ borderColor: accent }}
        >
          <span className="text-[0.9rem] leading-tight text-parchment">{center}</span>
        </div>
      </div>

      {/* Dallar. */}
      {nodes.map((node, i) => {
        const p = points[i];
        const isActive = i === selected;
        return (
          <button
            key={node.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(i)}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              borderColor: isActive ? accent : undefined,
            }}
            className={`absolute w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-sm border px-2.5 py-2
              text-center text-[0.8rem] leading-snug transition-colors
              ${
                isActive
                  ? "bg-ink-soft text-parchment"
                  : "border-ink-line bg-ink text-parchment-dim hover:border-gold-dim hover:text-parchment"
              }`}
          >
            {node.label}
            {node.badge ? (
              <span className="mt-1 block text-[0.7rem]" style={{ color: accent }}>
                {node.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
