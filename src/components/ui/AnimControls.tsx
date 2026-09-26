'use client';

import { Pause, Play, Repeat } from 'lucide-react';
import { useEngineStore } from '@/store/useEngineStore';
import { useAnimRpm } from '@/lib/animClock';

/**
 * Floating playback bar for the rotating assembly: play/pause, visual
 * crank speed (slow-motion rpm so the motion stays visible), and the
 * dyno sweep mode that drives the crank and the chart cursor together.
 */
export function AnimControls() {
  const playing = useEngineStore((s) => s.animPlaying);
  const speed = useEngineStore((s) => s.animSpeed);
  const sweep = useEngineStore((s) => s.sweepEnabled);
  const failed = useEngineStore((s) => s.status) !== 'OK';
  const set = useEngineStore((s) => s.set);
  const rpm = useAnimRpm();

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full bg-zinc-900/90 py-1.5 pl-2 pr-4 text-white shadow-lg backdrop-blur">
      <button
        onClick={() => set({ animPlaying: !playing })}
        className="rounded-full bg-sky-600 p-2 hover:bg-sky-500 disabled:opacity-40"
        disabled={failed}
        title={failed ? 'Engine seized — fix the build to spin again' : playing ? 'Pause crankshaft' : 'Spin crankshaft'}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <label className="flex items-center gap-1.5 text-[11px] text-zinc-300" title="Visual crank speed (slow motion)">
        <span className="font-mono">{speed}</span>
        <input
          type="range"
          min={0}
          max={120}
          step={1}
          value={speed}
          disabled={sweep}
          onChange={(e) => set({ animSpeed: Number(e.target.value) })}
          className="w-20"
          aria-label="Crank visual speed"
        />
      </label>
      <button
        onClick={() => set({ sweepEnabled: !sweep })}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          sweep ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
        }`}
        title="Sweep the dyno: crank speed and chart cursor follow engine rpm"
      >
        <Repeat size={12} />
        Sweep
      </button>
      <span className="font-mono text-[11px] text-amber-300">{Math.round(rpm)} rpm</span>
    </div>
  );
}
