'use client';

import { useEngineStore } from '@/store/useEngineStore';

const COLORS: Record<string, string> = {
  OK: 'bg-emerald-600',
  SETUP_INCOMPATIBLE: 'bg-amber-600',
  FAILED_BENT_RODS: 'bg-red-600',
  FAILED_THROWN_ROD: 'bg-red-600',
  FAILED_DROPPED_VALVE: 'bg-red-600',
  FAILED_OIL_PUMP: 'bg-red-600',
  FAILED_TURBO_OVERSPEED: 'bg-red-600',
  FAILED_LEAN: 'bg-red-600',
  FAILED_LIFTED_HEAD: 'bg-red-600',
  FAILED_CRACKED_BLOCK: 'bg-red-600',
  FAILED_EXPLODED_GEARBOX: 'bg-red-600',
  FAILED_OVERWHELMED_TRANS: 'bg-orange-500',
};

export function StatusBanner() {
  const status = useEngineStore((x) => x.status);
  const msg = useEngineStore((x) => x.statusMessage);
  return (
    <div className={`w-full px-4 py-2 text-sm font-semibold text-white ${COLORS[status] ?? 'bg-zinc-700'}`} role="alert">
      <span className="mr-2 rounded bg-black/30 px-2 py-0.5 font-mono text-xs">{status}</span>
      {msg}
    </div>
  );
}
