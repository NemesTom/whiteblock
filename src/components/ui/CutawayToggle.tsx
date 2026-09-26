'use client';

import { ArrowLeftRight, Scissors } from 'lucide-react';
import { useEngineStore } from '@/store/useEngineStore';
import { CUT_RANGES } from '@/components/canvas/parts/materials';
import type { CutawayAxis } from '@/types/engine';

export function CutawayToggle() {
  const cutaway = useEngineStore((x) => x.cutaway);
  const set = useEngineStore((x) => x.set);
  return (
    <button
      onClick={() => set({ cutaway: !cutaway })}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition-colors ${
        cutaway ? 'bg-amber-400 text-black' : 'bg-zinc-900/90 text-white hover:bg-zinc-700'
      }`}
      aria-pressed={cutaway}
    >
      <Scissors size={16} />
      {cutaway ? 'Cutaway: ON' : 'Cutaway: OFF'}
    </button>
  );
}

/**
 * Configurable cutaway: pick the clip axis (X = front/back along the
 * crank, Y = deck height, Z = intake/exhaust side), slide the plane
 * along it, and optionally flip which half is kept.
 */
export function CutawayPanel() {
  const cutaway = useEngineStore((s) => s.cutaway);
  const axis = useEngineStore((s) => s.cutawayAxis);
  const offset = useEngineStore((s) => s.cutawayOffset);
  const flip = useEngineStore((s) => s.cutawayFlip);
  const set = useEngineStore((s) => s.set);

  if (!cutaway) return null;
  const range = CUT_RANGES[axis];

  const pickAxis = (a: CutawayAxis) => set({ cutawayAxis: a, cutawayOffset: CUT_RANGES[a].def });

  return (
    <div className="w-60 rounded-xl bg-zinc-900/90 p-3 text-white shadow-lg backdrop-blur">
      <div className="mb-2 flex gap-1" role="group" aria-label="Cutaway axis">
        {(['x', 'y', 'z'] as CutawayAxis[]).map((a) => (
          <button
            key={a}
            onClick={() => pickAxis(a)}
            className={`flex-1 rounded-md px-2 py-1 font-mono text-xs font-bold uppercase ${
              axis === a ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
            title={a === 'x' ? 'Clip along the crank (front/back)' : a === 'y' ? 'Clip by deck height' : 'Clip intake/exhaust side'}
          >
            {a}
          </button>
        ))}
        <button
          onClick={() => set({ cutawayFlip: !flip })}
          className={`rounded-md px-2 py-1 text-xs ${flip ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          title="Flip which half is kept"
          aria-pressed={flip}
        >
          <ArrowLeftRight size={14} />
        </button>
      </div>
      <label className="block text-[11px] text-zinc-300">
        <span className="flex justify-between">
          <span>Plane position</span>
          <span className="font-mono text-amber-300">{offset.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={offset}
          onChange={(e) => set({ cutawayOffset: Number(e.target.value) })}
          className="mt-1 w-full"
          aria-label="Cutaway plane position"
        />
      </label>
    </div>
  );
}
