'use client';

import { useEngineStore } from '@/store/useEngineStore';
import { BASE_ENGINES } from '@/lib/physics';
import { Accordion, OptionButton } from './Accordion';

const FOCUS: Record<string, string> = {
  block: 'block',
  internals: 'internals',
  head: 'head',
  turbo: 'turbo',
  transmission: 'transmission',
  ecu: 'head',
};

export function Sidebar() {
  const s = useEngineStore();

  const pick = (patch: Parameters<typeof s.set>[0], focusKey: string) => {
    s.set({ ...patch, focusedPart: FOCUS[focusKey] ?? null });
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-zinc-950 text-zinc-100 lg:w-80 lg:min-w-80">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h1 className="text-base font-bold tracking-tight">Whiteblock Visualizer</h1>
        <p className="text-xs text-zinc-400">Tuning Configurator · Volvo 5/4/6-cyl</p>
        <button
          onClick={() => s.reset()}
          className="mt-2 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
        >
          Reset build
        </button>
      </div>

      <Accordion title="Engine Block" defaultOpen>
        {(Object.keys(BASE_ENGINES) as (keyof typeof BASE_ENGINES)[]).map((id) => (
          <OptionButton
            key={id}
            active={s.engineId === id}
            label={BASE_ENGINES[id].label}
            sub={`${BASE_ENGINES[id].boreMm}×${BASE_ENGINES[id].strokeMm}mm · ${BASE_ENGINES[id].compressionRatio}:1 · ${BASE_ENGINES[id].notes}`}
            onClick={() =>
              pick(
                {
                  engineId: id,
                  transmissionId: id === 'B6284T' ? 'gm-4t65e' : s.transmissionId === 'gm-4t65e' ? 'm56' : s.transmissionId,
                },
                'block',
              )
            }
          />
        ))}
        <div className="mt-2 text-xs font-semibold text-zinc-300">Cylinder Sleeves</div>
        {(
          [
            ['stock', 'Stock sleeves'],
            ['shimmed', 'Block shims'],
            ['darton', 'Darton sleeves'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.sleevesId === id} label={label} onClick={() => pick({ sleevesId: id }, 'block')} />
        ))}
      </Accordion>

      <Accordion title="Internals (Bottom End)">
        {(
          [
            ['stock-n', 'Stock N-Rods 139.5mm · limit 300 WHP'],
            ['stock-rn', 'Stock RN-Rods 147.0mm · ratio 1.63 · limit 350 WHP'],
            ['forged-h', 'Forged H-Beams · 800+ WHP · required >18psi'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.rodsId === id} label={label} onClick={() => pick({ rodsId: id }, 'internals')} />
        ))}
      </Accordion>

      <Accordion title="Top End (Cylinder Head)">
        <OptionButton active={s.headId === 'stock-n'} label="Stock N-Head · VE 85%" sub="Hydraulic lifters" onClick={() => pick({ headId: 'stock-n' }, 'head')} />
        <OptionButton active={s.headId === 'rn-swap'} label="RN-Head Swap · VE 95%" sub="Solid lifters · powerband +500 RPM" onClick={() => pick({ headId: 'rn-swap' }, 'head')} />
      </Accordion>

      <Accordion title="Turbocharger & Exhaust" defaultOpen>
        {(
          [
            ['td04-15g', 'TD04HL-15G · stock · fast spool · max 260 WHP'],
            ['td04-16t', 'TD04HL-16T · linear · max 300 WHP'],
            ['td04-19t', 'TD04HL-19T · violent spike · bends stock rods'],
            ['k24', 'KKK K24 (S60R) · max 350 WHP · needs Japanifold'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.turboId === id} label={label} onClick={() => pick({ turboId: id }, 'turbo')} />
        ))}
        <div className="mt-2 text-xs font-semibold text-zinc-300">Exhaust Manifold</div>
        <OptionButton active={s.manifoldId === 'stock'} label="Stock manifold" onClick={() => pick({ manifoldId: 'stock' }, 'turbo')} />
        <OptionButton active={s.manifoldId === 'japanifold-s60r'} label="S60R / Japanifold" sub="Unlocks K24 full flow" onClick={() => pick({ manifoldId: 'japanifold-s60r' }, 'turbo')} />
        <label className="mt-3 block text-xs text-zinc-300">
          Boost: <span className="font-bold text-sky-300">{s.boostPsi} psi</span>
          <input
            type="range"
            min={8}
            max={26}
            step={1}
            value={s.boostPsi}
            onChange={(e) => s.set({ boostPsi: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </label>
      </Accordion>

      <Accordion title="Transmission">
        <OptionButton active={s.transmissionId === 'm56'} label="M56 5-spd manual · bulletproof" sub="Limit 500 WHP w/ Spec Stage 3" onClick={() => pick({ transmissionId: 'm56' }, 'transmission')} />
        <OptionButton active={s.transmissionId === 'aw55'} label="AW55-50SN 5-spd auto" sub="Fails >320 WHP w/o cooler" onClick={() => pick({ transmissionId: 'aw55' }, 'transmission')} />
        <OptionButton active={s.transmissionId === 'gm-4t65e'} label="GM 4T65-E (T6 stock)" sub="Glass cannon on Stage 2" onClick={() => pick({ transmissionId: 'gm-4t65e' }, 'transmission')} />
        <div className="mt-2 text-xs font-semibold text-zinc-300">Clutch / Cooler</div>
        <OptionButton active={s.clutchId === 'stock'} label="Stock clutch" onClick={() => s.set({ clutchId: 'stock' })} />
        <OptionButton active={s.clutchId === 'spec-stage3'} label="Spec Stage 3 clutch" onClick={() => s.set({ clutchId: 'spec-stage3' })} />
        <OptionButton active={s.transCoolerId === 'none'} label="No trans cooler" onClick={() => s.set({ transCoolerId: 'none' })} />
        <OptionButton active={s.transCoolerId === 'external'} label="External trans cooler" onClick={() => s.set({ transCoolerId: 'external' })} />
      </Accordion>

      <Accordion title="ECU & Tune">
        <OptionButton active={s.tuneId === 'stock'} label="Stock tune · fuel mod 0.85" onClick={() => pick({ tuneId: 'stock' }, 'ecu')} />
        <OptionButton active={s.tuneId === 'stage1'} label="Stage 1 · fuel mod 1.0" onClick={() => pick({ tuneId: 'stage1' }, 'ecu')} />
        <OptionButton active={s.tuneId === 'stage2'} label="Stage 2 · fuel mod 1.08" onClick={() => pick({ tuneId: 'stage2' }, 'ecu')} />
      </Accordion>
    </aside>
  );
}
