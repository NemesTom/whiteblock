'use client';

import { Flame, Pause, Play, Repeat, Turtle } from 'lucide-react';
import { useEngineStore } from '@/store/useEngineStore';
import { animClock, useAnimRpm } from '@/lib/animClock';
import { maxRpm, rpmLimit } from '@/lib/physics';
import { STROKE_COLORS } from '@/components/canvas/parts/engineGeometry';

const STROKE_LABELS = ['Suck', 'Squeeze', 'Bang', 'Blow'] as const;

/**
 * Floating playback bar: play/pause, engine-RPM slider (100 rpm steps,
 * clamped by the tune's rev limiter), cycle-highlight toggle, and the
 * dyno sweep mode that drives rpm + chart cursor together.
 */
export function AnimControls() {
  const playing = useEngineStore((s) => s.animPlaying);
  const sweep = useEngineStore((s) => s.sweepEnabled);
  const cycle = useEngineStore((s) => s.cycleHighlight);
  const slowMo = useEngineStore((s) => s.slowMo);
  const failed = useEngineStore((s) => s.status) !== 'OK';
  const tuneId = useEngineStore((s) => s.tuneId);
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const headId = useEngineStore((s) => s.headId);
  const valveSpringsId = useEngineStore((s) => s.valveSpringsId);
  const set = useEngineStore((s) => s.set);
  const rpm = useAnimRpm();

  const cap = maxRpm({ tuneId, engineId });
  const { limit } = rpmLimit({ rodsId, headId, valveSpringsId });
  const limited = cap < 8500;

  const setRpm = (v: number) => {
    const clamped = Math.min(cap, Math.max(800, Math.round(v / 100) * 100));
    animClock.jumpTo(clamped);
    set({ animRpm: clamped });
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-full bg-zinc-900/90 py-1.5 pl-2 pr-4 text-white shadow-lg backdrop-blur">
        <button
          onClick={() => set({ animPlaying: !playing })}
          className="rounded-full bg-sky-600 p-2 hover:bg-sky-500 disabled:opacity-40"
          disabled={failed}
          title={failed ? 'Engine seized — lower the rpm and fix the build to spin again' : playing ? 'Pause crankshaft' : 'Spin crankshaft'}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <label className="flex items-center gap-1.5 text-[11px] text-zinc-300" title="Engine speed — drives crank, turbo, valves and dyno cursor">
          <span className="font-mono text-amber-300">{Math.round(rpm)}</span>
          <input
            type="range"
            min={800}
            max={cap}
            step={100}
            value={Math.min(Math.round(rpm / 100) * 100, cap)}
            disabled={sweep || failed}
            onChange={(e) => setRpm(Number(e.target.value))}
            className="w-36"
            aria-label="Engine RPM"
          />
          <span className="font-mono text-zinc-500">{limited ? `LIMIT ${cap}` : `${cap}`}</span>
        </label>
        <button
          onClick={() => set({ sweepEnabled: !sweep })}
          disabled={failed}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 ${
            sweep ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
          }`}
          title="Sweep the dyno: rpm climbs to the limiter and loops"
        >
          <Repeat size={12} />
          Sweep
        </button>
        <button
          onClick={() => set({ cycleHighlight: !cycle })}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            cycle ? 'bg-orange-500 text-black' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
          }`}
          title="Highlight the 4-stroke cycle on piston crowns"
          aria-pressed={cycle}
        >
          <Flame size={12} />
          Cycle
        </button>
        <button
          onClick={() => set({ slowMo: !slowMo })}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            slowMo ? 'bg-teal-400 text-black' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
          }`}
          title="Slow-motion inspect: render the crank at a visible fraction of true revs"
          aria-pressed={slowMo}
        >
          <Turtle size={12} />
          Slow
        </button>
      </div>
      {cycle && (
        <div className="flex items-center gap-2 self-start rounded-full bg-zinc-900/90 px-3 py-1 text-[10px] text-zinc-300 shadow-lg backdrop-blur">
          {STROKE_LABELS.map((label, i) => (
            <span key={label} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: STROKE_COLORS[i as 0 | 1 | 2 | 3] }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="self-start rounded-full bg-zinc-900/90 px-3 py-1 font-mono text-[10px] text-zinc-400 shadow-lg backdrop-blur">
        weakest link revs to {limit} rpm
      </div>
    </div>
  );
}
