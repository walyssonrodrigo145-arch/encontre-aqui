import type { ReactNode } from "react";

/**
 * Gráficos SVG puros (sem dependências) — server-safe.
 * Paleta alinhada ao tema violeta.
 */

const LINE_COLOR = "#5b4fe9";
const BAR_COLOR = "#a5b4fc";
const GRID_COLOR = "#eeedf7";

export function LineChart({
  data,
  labels,
  height = 160,
  className,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  className?: string;
}) {
  const w = 560;
  const h = height;
  const pad = { t: 12, r: 8, b: labels ? 22 : 8, l: 8 };
  const max = Math.max(...data, 1);
  const min = 0;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = data.map((v, i) => {
    const x = pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = pad.t + innerH - ((v - min) / (max - min || 1)) * innerH;
    return { x, y, v };
  });
  const path = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1]!;
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");
  const area = `${path} L ${pts[pts.length - 1]!.x} ${pad.t + innerH} L ${pts[0]!.x} ${pad.t + innerH} Z`;
  const gid = "ea-line-gradient";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label="Gráfico de linha">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.22" />
          <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * f} y2={pad.t + innerH * f} stroke={GRID_COLOR} strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={LINE_COLOR} strokeWidth="2.5" />
          {labels?.[i] && (
            <text x={p.x} y={h - 6} textAnchor="middle" fontSize="10" fill="#9a97ad">
              {labels[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function BarChart({
  data,
  labels,
  height = 140,
  className,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  className?: string;
}) {
  const w = 560;
  const h = height;
  const padB = labels ? 22 : 6;
  const max = Math.max(...data, 1);
  const innerH = h - padB - 8;
  const slot = w / data.length;
  const bw = Math.min(slot * 0.5, 26);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label="Gráfico de barras">
      {data.map((v, i) => {
        const bh = Math.max((v / max) * innerH, 3);
        const x = i * slot + (slot - bw) / 2;
        const y = 8 + innerH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx={bw / 3} fill={BAR_COLOR} />
            <rect x={x} y={Math.max(y, 8 + innerH - bh)} width={bw} height={Math.min(bh, 5)} rx={2.5} fill={LINE_COLOR} opacity="0.85" />
            {labels?.[i] && (
              <text x={x + bw / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="#9a97ad">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({
  segments,
  size = 148,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dasharrays = segments.map((s) => (s.value / total) * c);
  const offsets = dasharrays.map((_, i) =>
    dasharrays.slice(0, i).reduce((a, b) => a + b, 0),
  );

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico de rosca">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={GRID_COLOR} strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = dasharrays[i]!;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offsets[i]!}
                strokeLinecap="butt"
              />
            );
            return el;
          })}
        </g>
        {centerValue && (
          <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#14121f" fontFamily="var(--font-outfit)">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize="10" fill="#9a97ad">
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="font-medium text-slate-700">{s.label}</span>
            <span className="text-slate-400">
              {s.value} ({Math.round((s.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
