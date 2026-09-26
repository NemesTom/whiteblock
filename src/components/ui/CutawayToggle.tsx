'use client';

import { Scissors } from 'lucide-react';
import { useEngineStore } from '@/store/useEngineStore';

export function CutawayToggle() {
  const cutaway = useEngineStore((x) => x.cutaway);
  const set = useEngineStore((x) => x.set);
  return (
    <button
      onClick={() => set({ cutaway: !cutaway })}
      className={`absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition-colors ${
        cutaway ? 'bg-amber-400 text-black' : 'bg-zinc-900/90 text-white hover:bg-zinc-700'
      }`}
      aria-pressed={cutaway}
    >
      <Scissors size={16} />
      {cutaway ? 'Cutaway: ON' : 'Cutaway: OFF'}
    </button>
  );
}
