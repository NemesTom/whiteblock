'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useEngineStore } from '@/store/useEngineStore';
import { useAnimRpm } from '@/lib/animClock';
import { BASE_ENGINES, ROD_LENGTH_MM, TURBO_WHEELS, effectiveGeometry, turboTrim } from '@/lib/physics';
import type { TurboId } from '@/types/engine';

const LINE = '#a1a1aa';
const FAINT = '#52525b';
const AMBER = '#fbbf24';

/**
 * Top-left viewport overlay: engineering lineart of the selected
 * head gasket (bore layout with the active bore highlighted) and
 * conrod (center-to-center length, stroke travel, ratio, piston speed).
 * Pure SVG schematic — no 3D or simulation impact.
 */
export function EngineLineart() {
  const [open, setOpen] = useState(true);
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const crankId = useEngineStore((s) => s.crankId);
  const pistonsId = useEngineStore((s) => s.pistonsId);
  const turboId = useEngineStore((s) => s.turboId);
  const rpm = useAnimRpm();

  const engine = BASE_ENGINES[engineId];
  const n = engine.cylinders;
  const geo = effectiveGeometry({ engineId, crankId, pistonsId });
  const bore = geo.boreMm;
  const stroke = geo.strokeMm;
  const rodLen = ROD_LENGTH_MM[rodsId];
  const ratio = rodLen / stroke;
  const pistonSpeed = ((2 * stroke) / 1000) * (rpm / 60);

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-zinc-900/90 p-2 text-zinc-300 shadow-lg backdrop-blur hover:bg-zinc-700"
        title={open ? 'Hide engineering lineart' : 'Show engineering lineart'}
        aria-label={open ? 'Hide lineart' : 'Show lineart'}
        aria-pressed={open}
      >
        {open ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      {open && (
        <div className="flex max-h-[72vh] flex-col gap-2 overflow-y-auto rounded-xl bg-zinc-900/90 p-3 shadow-lg backdrop-blur">
          <GasketCard n={n} bore={bore} engineLabel={engineId} />
          <RodCard rodLen={rodLen} stroke={stroke} ratio={ratio} pistonSpeed={pistonSpeed} rpm={rpm} />
          <TurboCard turboId={turboId} />
        </div>
      )}
    </div>
  );
}

function GasketCard({ n, bore, engineLabel }: { n: number; bore: number; engineLabel: string }) {
  const spacing = 52;
  const margin = 16;
  const w = n * spacing + margin * 2;
  const h = 104;
  const cy = h / 2;
  const r = bore * 0.28; // true-scale bore circles
  return (
    <figure>
      <figcaption className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {engineLabel} · head gasket · <span style={{ color: AMBER }}>Ø{bore.toFixed(1)} mm</span>
      </figcaption>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${n}-cylinder head gasket with ${bore} millimetre bores`}>
        {/* gasket outline */}
        <rect x={4} y={8} width={w - 8} height={h - 16} rx={14} fill="none" stroke={LINE} strokeWidth={1.5} />
        {/* head bolt holes */}
        {Array.from({ length: n + 1 }).map((_, k) => (
          <g key={k}>
            <circle cx={k === 0 ? 12 : k === n ? w - 12 : margin + k * spacing} cy={16} r={3} fill="none" stroke={FAINT} strokeWidth={1} />
            <circle cx={k === 0 ? 12 : k === n ? w - 12 : margin + k * spacing} cy={h - 16} r={3} fill="none" stroke={FAINT} strokeWidth={1} />
          </g>
        ))}
        {/* coolant passages between bores */}
        {Array.from({ length: n - 1 }).map((_, k) => (
          <rect
            key={k}
            x={margin + (k + 1) * spacing - 3}
            y={cy - 14}
            width={6}
            height={28}
            rx={3}
            fill="none"
            stroke={FAINT}
            strokeWidth={1}
          />
        ))}
        {/* bore circles — active bore highlighted */}
        {Array.from({ length: n }).map((_, i) => (
          <g key={i}>
            <circle cx={margin + i * spacing + spacing / 2} cy={cy} r={r + 4} fill="none" stroke={AMBER} strokeWidth={1.5} opacity={0.9} />
            <circle cx={margin + i * spacing + spacing / 2} cy={cy} r={r} fill="rgba(251,191,36,0.08)" stroke={AMBER} strokeWidth={2} />
            <text
              x={margin + i * spacing + spacing / 2}
              y={cy + 3.5}
              textAnchor="middle"
              fontSize={9}
              fontFamily="monospace"
              fill={AMBER}
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function RodCard({
  rodLen,
  stroke,
  ratio,
  pistonSpeed,
  rpm,
}: {
  rodLen: number;
  stroke: number;
  ratio: number;
  pistonSpeed: number;
  rpm: number;
}) {
  const pxPerMm = 1.25;
  const rodPx = rodLen * pxPerMm;
  const strokePx = stroke * pxPerMm;
  const topY = 20;
  const pinY = topY + rodPx; // big-end centre
  const w = 150;
  const h = pinY + 60;
  const cx = 62;
  return (
    <figure>
      <figcaption className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        conrod · stroke <span style={{ color: AMBER }}>{stroke.toFixed(1)} mm</span>
      </figcaption>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Conrod, ${rodLen} millimetres center to center, stroke ${stroke} millimetres`}>
        {/* small end */}
        <circle cx={cx} cy={topY} r={13} fill="none" stroke={LINE} strokeWidth={2} />
        <circle cx={cx} cy={topY} r={6} fill="none" stroke={LINE} strokeWidth={1.5} />
        {/* tapered I-beam */}
        <polygon points={`${cx - 7},${topY + 11} ${cx + 7},${topY + 11} ${cx + 11},${pinY - 22} ${cx - 11},${pinY - 22}`} fill="none" stroke={LINE} strokeWidth={1.5} />
        <line x1={cx} y1={topY + 13} x2={cx} y2={pinY - 24} stroke={FAINT} strokeWidth={1} />
        {/* big end + cap + bolts */}
        <circle cx={cx} cy={pinY} r={24} fill="none" stroke={LINE} strokeWidth={2} />
        <circle cx={cx} cy={pinY} r={15} fill="none" stroke={LINE} strokeWidth={1.5} />
        <line x1={cx - 24} y1={pinY + 8} x2={cx + 24} y2={pinY + 8} stroke={LINE} strokeWidth={1} strokeDasharray="3 2" />
        {[-14, 14].map((dx) => (
          <rect key={dx} x={cx + dx - 3} y={pinY + 8} width={6} height={12} rx={1.5} fill="none" stroke={LINE} strokeWidth={1.2} />
        ))}
        {/* rod length dimension */}
        <Dimension x={cx + 34} y1={topY} y2={pinY} label={`${rodLen.toFixed(1)}`} />
        {/* stroke travel arrow at the crank centre */}
        <g stroke={AMBER} strokeWidth={1.5}>
          <line x1={cx - 34} y1={pinY - strokePx / 2} x2={cx - 34} y2={pinY + strokePx / 2} />
          <polygon points={`${cx - 34},${pinY - strokePx / 2} ${cx - 38},${pinY - strokePx / 2 + 7} ${cx - 30},${pinY - strokePx / 2 + 7}`} fill={AMBER} stroke="none" />
          <polygon points={`${cx - 34},${pinY + strokePx / 2} ${cx - 38},${pinY + strokePx / 2 - 7} ${cx - 30},${pinY + strokePx / 2 - 7}`} fill={AMBER} stroke="none" />
        </g>
        <text x={cx - 34} y={pinY + strokePx / 2 + 14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={AMBER}>
          {stroke.toFixed(1)}
        </text>
      </svg>
      <figcaption className="mt-1 font-mono text-[10px] text-zinc-400">
        rod/stroke {ratio.toFixed(2)} · piston speed {pistonSpeed.toFixed(1)} m/s @ {Math.round(rpm)} rpm
      </figcaption>
    </figure>
  );
}

const TURBO_SHORT: Record<TurboId, string> = {
  'td04-13g': 'TD04HL-13G',
  'td04-13t': 'TD04HL-13T',
  'td04l-14t': 'TD04L-14T',
  'td04-15g': 'TD04HL-15G',
  'td04-16t': 'TD04HL-16T',
  'td04-18t': 'TD04HL-18T',
  'td04-19t': 'TD04HL-19T',
  'td04-20t': 'TD04HL-20T',
  'td04-21h': 'TD04HL-21H',
  'td04-21tk': 'TD04HL-21TK',
  'td06sl2-20g': 'TD06SL2-20G',
  hx35: 'Holset HX35',
  gt3071r: 'Garrett GT3071R',
  efr7163: 'BW EFR 7163',
  gtx3076r: 'Garrett GTX3076R',
  pte6262: 'Precision 6262',
  k24: 'KKK K24',
};

/**
 * Compressor wheel, front view, at fixed true scale (1.5 px/mm radius)
 * so a 13G reads tiny next to a 6262. Amber exducer ring, inducer circle,
 * blades, hub — plus trim and turbine data.
 */
function TurboCard({ turboId }: { turboId: TurboId }) {
  const spec = TURBO_WHEELS[turboId];
  const S = 1.5; // px per mm of radius — constant across turbos
  const rEx = (spec.exMm / 2) * S;
  const rIn = (spec.inMm / 2) * S;
  const size = 170;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const trim = turboTrim(spec);
  const blades = Array.from({ length: spec.blades });
  return (
    <figure>
      <figcaption className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {TURBO_SHORT[turboId]} wheel{' '}
        <span style={{ color: AMBER }}>
          Ø{spec.inMm.toFixed(1)}/{spec.exMm.toFixed(1)}
        </span>
        {spec.est && (
          <span className="ml-1 rounded bg-zinc-700 px-1 text-[9px] text-zinc-300" title="Interpolated or soft-sourced figure, not catalog-verified">
            ~
          </span>
        )}
      </figcaption>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${TURBO_SHORT[turboId]} compressor wheel, inducer ${spec.inMm} millimetres, exducer ${spec.exMm} millimetres`}>
        {/* exducer ring (highlighted) */}
        <circle cx={cx} cy={cy} r={rEx} fill="rgba(251,191,36,0.06)" stroke={AMBER} strokeWidth={2} />
        {/* blades */}
        {blades.map((_, b) => (
          <g key={b} transform={`rotate(${(b * 360) / spec.blades} ${cx} ${cy})`}>
            <rect
              x={cx - 1.6}
              y={cy - rEx + 3}
              width={3.2}
              height={Math.max(4, rEx - rIn * 0.45 - 3)}
              rx={1.6}
              fill="none"
              stroke={LINE}
              strokeWidth={1.1}
              transform={`rotate(18 ${cx - 1.6} ${cy - rEx + 3})`}
            />
          </g>
        ))}
        {/* inducer circle + hub + nut */}
        <circle cx={cx} cy={cy} r={rIn} fill="none" stroke={LINE} strokeWidth={1.5} strokeDasharray="4 2" />
        <circle cx={cx} cy={cy} r={7} fill="none" stroke={LINE} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={2.6} fill={LINE} />
        {/* dimension labels */}
        <text x={cx + rEx + 4} y={cy - rEx + 10} fontSize={9} fontFamily="monospace" fill={AMBER}>
          Ø{spec.exMm.toFixed(1)}
        </text>
        <text x={cx + rIn + 4} y={cy + rIn - 2} fontSize={9} fontFamily="monospace" fill={LINE}>
          Ø{spec.inMm.toFixed(1)}
        </text>
      </svg>
      <figcaption className="mt-1 font-mono text-[10px] text-zinc-400">
        trim {trim}%{spec.turbInMm !== undefined && spec.turbExMm !== undefined ? ` · turb Ø${spec.turbInMm.toFixed(1)}/${spec.turbExMm.toFixed(1)}` : ' · turb —'}
      </figcaption>
    </figure>
  );
}

function Dimension({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {  return (
    <g stroke={LINE} strokeWidth={1}>
      <line x1={x - 5} y1={y1} x2={x + 5} y2={y1} />
      <line x1={x - 5} y1={y2} x2={x + 5} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <polygon points={`${x},${y1} ${x - 3.5},${y1 + 6} ${x + 3.5},${y1 + 6}`} fill={LINE} stroke="none" />
      <polygon points={`${x},${y2} ${x - 3.5},${y2 - 6} ${x + 3.5},${y2 - 6}`} fill={LINE} stroke="none" />
      <text x={x + 7} y={(y1 + y2) / 2 + 3} fontSize={9} fontFamily="monospace" fill={LINE} stroke="none">
        {label}
      </text>
    </g>
  );
}
