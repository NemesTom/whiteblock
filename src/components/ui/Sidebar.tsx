'use client';

import { useState } from 'react';
import { useEngineStore, selectMetrics } from '@/store/useEngineStore';
import { BASE_ENGINES, ENGINE_STOCK_BOOST_PSI, displacementCc } from '@/lib/physics';
import { firingOrderLabel } from '@/components/canvas/parts/engineGeometry';
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
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  const pick = (patch: Parameters<typeof s.set>[0], focusKey: string) => {
    s.set({ ...patch, focusedPart: FOCUS[focusKey] ?? null });
  };

  /** Serialize the full build (selection + status + peaks) for bug reports. */
  const buildJsonText = () => {
    const st = useEngineStore.getState();
    const m = selectMetrics(st);
    return JSON.stringify(
      {
        selection: {
          engineId: st.engineId,
          rodsId: st.rodsId,
          headId: st.headId,
          turboId: st.turboId,
          manifoldId: st.manifoldId,
          transmissionId: st.transmissionId,
          sleevesId: st.sleevesId,
          tuneId: st.tuneId,
          clutchId: st.clutchId,
          transCoolerId: st.transCoolerId,
          converterId: st.converterId,
          injectorId: st.injectorId,
          fuelPumpId: st.fuelPumpId,
          intercoolerId: st.intercoolerId,
          downpipeId: st.downpipeId,
          studsId: st.studsId,
          valveSpringsId: st.valveSpringsId,
          boostPsi: st.boostPsi,
          animRpm: st.animRpm,
        },
        result: {
          status: st.status,
          statusMessage: st.statusMessage,
          maxHp: m.maxHp,
          maxCrankHp: m.maxCrankHp,
          peakHpRpm: m.peakHpRpm,
          maxTqNm: m.maxTqNm,
        },
      },
      null,
      2,
    );
  };

  /** Synchronous legacy copy — must run inside the click gesture. */
  const legacyCopy = (text: string): boolean => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const copyBuildJson = async () => {
    const text = buildJsonText();
    // 1. Legacy sync path first: valid only inside the user gesture.
    if (legacyCopy(text)) {
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
      return;
    }
    // 2. Async Clipboard API (needs secure context + permission).
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
      return;
    } catch (err) {
      console.error('[whiteblock] clipboard copy failed:', err);
    }
    // 3. Last resort: modal with selectable text for manual copy.
    setFallbackText(text);
    setCopyState('error');
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-zinc-950 text-zinc-100 lg:w-80 lg:min-w-80">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h1 className="text-base font-bold tracking-tight">Whiteblock Visualizer</h1>
        <p className="text-xs text-zinc-400">Tuning Configurator · Volvo 5/4/6-cyl</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => s.reset()}
            className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
          >
            Reset build
          </button>
          <button
            onClick={copyBuildJson}
            className={`rounded px-2 py-1 text-xs hover:bg-zinc-700 ${copyState === 'error' ? 'bg-red-800' : 'bg-zinc-800'}`}
            title="Copy the full build (all components + status + peaks) as JSON for bug reports"
          >
            {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed — see below' : 'Copy build JSON'}
          </button>
        </div>
        {fallbackText !== null && (
          <div className="mt-2 rounded border border-red-700 bg-zinc-900 p-2">
            <p className="mb-1 text-[11px] text-zinc-300">Automatic copy failed — select all and copy manually:</p>
            <textarea
              readOnly
              value={fallbackText}
              rows={8}
              className="w-full rounded bg-black p-1 font-mono text-[10px] text-zinc-200"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => {
                setFallbackText(null);
                setCopyState('idle');
              }}
              className="mt-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        )}
      </div>

      <Accordion title="Engine Block" defaultOpen>
        {(
          Object.keys(BASE_ENGINES) as (keyof typeof BASE_ENGINES)[]
        )
          .slice()
          .sort((a, b) => displacementCc(BASE_ENGINES[a].boreMm, BASE_ENGINES[a].strokeMm, BASE_ENGINES[a].cylinders) - displacementCc(BASE_ENGINES[b].boreMm, BASE_ENGINES[b].strokeMm, BASE_ENGINES[b].cylinders))
          .map((id) => (
          <OptionButton
            key={id}
            active={s.engineId === id}
            label={BASE_ENGINES[id].label}
            sub={`${BASE_ENGINES[id].boreMm}×${BASE_ENGINES[id].strokeMm}mm · ${BASE_ENGINES[id].compressionRatio}:1 · ${BASE_ENGINES[id].notes}`}
            onClick={() =>
              pick(
                {
                  engineId: id,
                  transmissionId:
                    id === 'B6284T' || id === 'B6294T'
                      ? 'gm-4t65e'
                      : s.transmissionId === 'gm-4t65e'
                        ? 'm56'
                        : s.transmissionId,
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
        <div className="mb-2 font-mono text-[11px] text-zinc-500">
          Firing order: {firingOrderLabel(BASE_ENGINES[s.engineId].cylinders)}
        </div>
        {(
          [
            ['stock-n', 'Stock N-Rods 139.5mm · limit 300 WHP · revs to 7000'],
            ['stock-rn', 'Stock RN-Rods 147.0mm · ratio 1.63 · limit 350 WHP · revs to 7200'],
            ['forged-h', 'Forged H-Beams · 800+ WHP · required >18psi · revs to 8500'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.rodsId === id} label={label} onClick={() => pick({ rodsId: id }, 'internals')} />
        ))}
      </Accordion>

      <Accordion title="Top End (Cylinder Head)">
        <OptionButton active={s.headId === 'stock-n'} label="Stock N-Head · VE 85% · revs to 7000" sub="Hydraulic lifters" onClick={() => pick({ headId: 'stock-n' }, 'head')} />
        <OptionButton active={s.headId === 'rn-swap'} label="RN-Head Swap · VE 95% · revs to 7800" sub="Solid lifters · powerband +500 RPM" onClick={() => pick({ headId: 'rn-swap' }, 'head')} />
        <div className="mb-1 mt-2 text-xs font-semibold text-zinc-300">Head studs</div>
        <OptionButton active={s.studsId === 'stock-bolts'} label="Stock TTY bolts" sub="Lift past 24 psi" onClick={() => pick({ studsId: 'stock-bolts' }, 'head')} />
        <OptionButton active={s.studsId === 'arp-studs'} label="ARP head studs" sub="Holds 35+ psi" onClick={() => pick({ studsId: 'arp-studs' }, 'head')} />
        <div className="mb-1 mt-2 text-xs font-semibold text-zinc-300">Valve springs</div>
        <OptionButton active={s.valveSpringsId === 'stock-springs'} label="Stock springs" onClick={() => pick({ valveSpringsId: 'stock-springs' }, 'head')} />
        <OptionButton active={s.valveSpringsId === 'supertech'} label="Supertech springs + retainers" sub="+400 rpm head room" onClick={() => pick({ valveSpringsId: 'supertech' }, 'head')} />
      </Accordion>

      <Accordion title="Turbocharger & Exhaust" defaultOpen>
        {(
          [
            ['td04-13g', 'TD04HL-13G · early 850 T5 / 2.5T · max 230 WHP'],
            ['td04-13t', 'TD04HL-13T · LPT S60/S80/V70 · max 250 WHP'],
            ['td04l-14t', 'TD04L-14T · 2.4T/2.5T LPT · max 255 WHP'],
            ['td04-15g', 'TD04HL-15G · stock · fast spool · max 260 WHP'],
            ['td04-16t', 'TD04HL-16T · linear · max 300 WHP'],
            ['td04-18t', 'TD04HL-18T · V70R 98–99 · violent spike · bends stock rods'],
            ['td04-19t', 'TD04HL-19T · 2000 R / T5 upgrade · violent spike · bends stock rods'],
            ['td04-20t', 'TD04HL-20T · max stock-frame · 330 WHP · needs forged + fuel'],
            ['td04-21h', 'Kinugawa TD04HL-21H · 330–400 HP crank · biggest bolt-on'],
            ['td06sl2-20g', 'Kinugawa TD06SL2-20G · documented B5234T build · ~380 WHP · T3 + pack'],
            ['hx35', 'Holset HX35 · budget legend · 450 WHP · needs T3 manifold + pack'],
            ['gt3071r', 'Garrett GT3071R · ball bearing · 420 WHP · needs T3 + pack'],
            ['efr7163', 'BorgWarner EFR 7163 · fast spool · 500 WHP · needs T3 + pack'],
            ['gtx3076r', 'Garrett GTX3076R · 550 WHP · needs T3 + full pack'],
            ['pte6262', 'Precision 6262 · drag class · 600 WHP · needs everything'],
            ['k24', 'KKK K24 (S60R) · max 350 WHP · needs Japanifold'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.turboId === id} label={label} onClick={() => pick({ turboId: id }, 'turbo')} />
        ))}
        <div className="mt-2 text-xs font-semibold text-zinc-300">Exhaust Manifold</div>
        <OptionButton active={s.manifoldId === 'stock'} label="Stock manifold" sub="TD04 flange" onClick={() => pick({ manifoldId: 'stock' }, 'turbo')} />
        <OptionButton active={s.manifoldId === 'japanifold-s60r'} label="S60R / Japanifold" sub="Unlocks K24 full flow · TD04 flange" onClick={() => pick({ manifoldId: 'japanifold-s60r' }, 'turbo')} />
        <OptionButton active={s.manifoldId === 'tubular-t3'} label="Tubular T3 manifold" sub="Required for HX35 / Garrett / EFR / Precision" onClick={() => pick({ manifoldId: 'tubular-t3' }, 'turbo')} />
        <label className="mt-3 block text-xs text-zinc-300">
          Boost:{' '}
          <span className="font-bold text-sky-300">
            {s.tuneId === 'stock'
              ? `factory ${ENGINE_STOCK_BOOST_PSI[s.engineId]} psi (locked on stock tune)`
              : `${s.boostPsi} psi`}
          </span>
          <input
            type="range"
            min={8}
            max={s.tuneId === 'stage3' ? 35 : 26}
            step={1}
            value={Math.min(s.boostPsi, s.tuneId === 'stage3' ? 35 : 26)}
            onChange={(e) => s.set({ boostPsi: Number(e.target.value) })}
            className="mt-1 w-full"
            title="Takes effect on Stage 1 / Stage 2"
          />
        </label>
      </Accordion>

      <Accordion title="Transmission">
        <OptionButton active={s.transmissionId === 'm56'} label="M56 5-spd manual · bulletproof · eats ~12%" sub="Limit 500 WHP w/ Spec Stage 3" onClick={() => pick({ transmissionId: 'm56' }, 'transmission')} />
        <OptionButton active={s.transmissionId === 'm66'} label="M66 6-spd swap · eats ~13%" sub="Limit 700 WHP w/ Spec Stage 3" onClick={() => pick({ transmissionId: 'm66' }, 'transmission')} />
        <OptionButton active={s.transmissionId === 'aw55'} label="AW55-50SN 5-spd auto · eats ~15%" sub="Fails >320 WHP w/o cooler" onClick={() => pick({ transmissionId: 'aw55' }, 'transmission')} />
        <OptionButton active={s.transmissionId === 'gm-4t65e'} label="GM 4T65-E (T6 stock) · eats ~17%" sub="Glass cannon on Stage 2" onClick={() => pick({ transmissionId: 'gm-4t65e' }, 'transmission')} />
        <div className="mt-2 text-xs font-semibold text-zinc-300">Clutch / Cooler</div>
        <OptionButton active={s.clutchId === 'stock'} label="Stock clutch" onClick={() => s.set({ clutchId: 'stock' })} />
        <OptionButton active={s.clutchId === 'spec-stage3'} label="Spec Stage 3 clutch" onClick={() => s.set({ clutchId: 'spec-stage3' })} />
        <OptionButton active={s.transCoolerId === 'none'} label="No trans cooler" onClick={() => s.set({ transCoolerId: 'none' })} />
        <OptionButton active={s.transCoolerId === 'external'} label="External trans cooler" onClick={() => s.set({ transCoolerId: 'external' })} />
        <div className="mt-2 text-xs font-semibold text-zinc-300">Torque converter (autos)</div>
        <OptionButton active={s.converterId === 'stock-converter'} label="Stock converter" onClick={() => s.set({ converterId: 'stock-converter' })} />
        <OptionButton active={s.converterId === 'high-stall'} label="High-stall converter" sub="Holds the AW55 to 420 WHP" onClick={() => s.set({ converterId: 'high-stall' })} />
      </Accordion>

      <Accordion title="Fuel System">
        <div className="mb-1 text-xs font-semibold text-zinc-300">Injectors</div>
        {(
          [
            ['stock-350', 'Stock injectors · ~280 hp fuel'],
            ['green-440', 'Green giants 440cc · ~350 hp'],
            ['deka-630', 'Siemens Deka 630cc · ~500 hp'],
            ['ev14-1000', 'Bosch EV14 1000cc · ~800 hp'],
            ['ev14-1700', 'Bosch EV14 1700cc · ~1350 hp'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.injectorId === id} label={label} onClick={() => pick({ injectorId: id }, 'ecu')} />
        ))}
        <div className="mb-1 mt-2 text-xs font-semibold text-zinc-300">Fuel pump</div>
        {(
          [
            ['stock-pump', 'Stock pump · ~330 hp'],
            ['walbro-255', 'Walbro 255 lph · ~550 hp'],
            ['walbro-450', 'Walbro 450 lph · ~800 hp'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.fuelPumpId === id} label={label} onClick={() => pick({ fuelPumpId: id }, 'ecu')} />
        ))}
      </Accordion>

      <Accordion title="Breathing">
        <div className="mb-1 text-xs font-semibold text-zinc-300">Intercooler</div>
        {(
          [
            ['stock-smic', 'Stock SMIC · heat-soaks past 300 WHP'],
            ['do88-fmic', 'do88 FMIC · holds to 350 WHP'],
            ['race-fmic', 'Race FMIC · no heat soak'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.intercoolerId === id} label={label} onClick={() => pick({ intercoolerId: id }, 'turbo')} />
        ))}
        <div className="mb-1 mt-2 text-xs font-semibold text-zinc-300">Downpipe / exhaust</div>
        {(
          [
            ['stock-25', 'Stock 2.5" exhaust'],
            ['dp-3', '3" downpipe · +3% · spools ~100 rpm sooner'],
            ['full-3', 'Full 3" exhaust · +5% · spools ~200 rpm sooner'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.downpipeId === id} label={label} onClick={() => pick({ downpipeId: id }, 'turbo')} />
        ))}
      </Accordion>

      <Accordion title="ECU & Tune">
        <OptionButton active={s.tuneId === 'stock'} label="Stock tune · factory boost" onClick={() => pick({ tuneId: 'stock' }, 'ecu')} />
        <OptionButton active={s.tuneId === 'stage1'} label="Stage 1 · +6% timing" onClick={() => pick({ tuneId: 'stage1' }, 'ecu')} />
        <OptionButton active={s.tuneId === 'stage2'} label="Stage 2 · +12% · limiter 8000" onClick={() => pick({ tuneId: 'stage2' }, 'ecu')} />
        <OptionButton active={s.tuneId === 'stage3'} label="Stage 3 MaxxECU standalone" sub="+18% · 35 psi · limiter 8500 · needs EV14-1000+ & 450 pump" onClick={() => pick({ tuneId: 'stage3' }, 'ecu')} />
      </Accordion>
    </aside>
  );
}
