'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useEngineStore } from '@/store/useEngineStore';
import { TURBO_WHEELS, turboTrim } from '@/lib/physics';
import type { TurboId } from '@/types/engine';

const LINE = '#a1a1aa';
const AMBER = '#fbbf24';

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
 * Standalone turbo compressor lineart overlay, bottom-right of the
 * viewport. Split out of the engine overlay so the top-left column stays
 * compact. Front view at fixed true scale (1.5 px/mm radius).
 */
export function TurboLineart() {
  const [open, setOpen] = useState(true);
  const turboId = useEngineStore((s) => s.turboId);

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
      {open && (
        <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-zinc-900/90 p-3 shadow-lg backdrop-blur">
          <TurboCard turboId={turboId} />
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-zinc-900/90 p-2 text-zinc-300 shadow-lg backdrop-blur hover:bg-zinc-700"
        title={open ? 'Hide turbo lineart' : 'Show turbo lineart'}
        aria-label={open ? 'Hide turbo lineart' : 'Show turbo lineart'}
        aria-pressed={open}
      >
        {open ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

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
