'use client';

import { useEffect, useRef, useState } from 'react';
import { useEngineStore, selectMetrics } from '@/store/useEngineStore';
import { animClock } from '@/lib/animClock';
import { BASE_ENGINES, ENGINE_STOCK_BOOST_PSI, STROKER_MM, TURBO_WHEELS, displacementCc } from '@/lib/physics';
import { deckHeightMm, firingOrderLabel, tdcPinHeightMm } from '@/components/canvas/parts/engineGeometry';
import type { EngineId, EngineSelection } from '@/types/engine';
import {
  decodeShareSelection,
  deleteBuild,
  encodeShareSelection,
  loadSavedBuilds,
  parseBuildJson,
  saveBuild,
  snapshotSelection,
  type SavedBuild,
} from '@/lib/configIO';
import { Accordion, OptionButton } from './Accordion';

const FOCUS: Record<string, string> = {
  block: 'block',
  internals: 'internals',
  head: 'head',
  turbo: 'turbo',
  transmission: 'transmission',
  ecu: 'head',
};

/** Stroker sublabel: resulting throw and displacement. */
function strokerLabel(engineId: EngineId): string {
  const e = BASE_ENGINES[engineId];
  const sw = STROKER_MM[e.strokeMm] ?? e.strokeMm + 3.2;
  const disp = Math.round(displacementCc(e.boreMm, sw, e.cylinders));
  return `${sw.toFixed(1)}mm throw · ≈${disp}cc`;
}

function deckMm(s: EngineSelection): string {
  return deckHeightMm(s).toFixed(1);
}

function pinMm(s: EngineSelection): string {
  return tdcPinHeightMm(s).toFixed(1);
}

export function Sidebar() {
  const s = useEngineStore();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [saveName, setSaveName] = useState('');
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>(() => loadSavedBuilds());
  const [uploadError, setUploadError] = useState<string[] | null>(null);

  const pick = (patch: Parameters<typeof s.set>[0], focusKey: string) => {
    s.set({ ...patch, focusedPart: FOCUS[focusKey] ?? null });
  };

  /** Serialize the full build (selection + status + peaks) for bug reports. */
  const buildJsonText = () => {
    const st = useEngineStore.getState();
    const m = selectMetrics(st);
    return JSON.stringify(
      {
        selection: snapshotSelection(st),
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

  /** Apply a validated selection (import or saved build). */
  const applySelection = (sel: ReturnType<typeof snapshotSelection>) => {
    animClock.jumpTo(sel.animRpm);
    s.set({ ...sel, focusedPart: null });
  };

  const applyImport = () => {
    const parsed = parseBuildJson(importText);
    if (!parsed.ok) {
      setImportErrors(parsed.errors);
      return;
    }
    applySelection(parsed.selection);
    setImportOpen(false);
    setImportText('');
    setImportErrors([]);
  };

  const handleSave = () => {
    setSavedBuilds(saveBuild(saveName, snapshotSelection(useEngineStore.getState())));
    setSaveName('');
  };

  /** Download a build selection as a .whiteblock.json file. */
  const downloadBuildFile = (name: string, selection: ReturnType<typeof snapshotSelection>) => {
    const blob = new Blob([JSON.stringify({ selection }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'whiteblock-build'}.whiteblock.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCurrentBuild = () => {
    downloadBuildFile(`whiteblock-${useEngineStore.getState().engineId}`, snapshotSelection(useEngineStore.getState()));
  };

  /** Upload path shares the strict import validator — no duplicate logic. */
  const uploadBuildFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBuildJson(typeof reader.result === 'string' ? reader.result : '');
      if (!parsed.ok) {
        setUploadError(parsed.errors);
        return;
      }
      setUploadError(null);
      applySelection(parsed.selection);
    };
    reader.onerror = () => setUploadError(['Could not read that file.']);
    reader.readAsText(file);
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

  /** Shared 3-tier copy: sync gesture path, async Clipboard API, else false. */
  const attemptCopy = async (text: string): Promise<boolean> => {
    if (legacyCopy(text)) return true;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('[whiteblock] clipboard copy failed:', err);
      return false;
    }
  };

  const flashCopied = () => {
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 2000);
  };

  const copyBuildJson = async () => {
    const text = buildJsonText();
    if (await attemptCopy(text)) {
      flashCopied();
      return;
    }
    // Last resort: modal with selectable text for manual copy.
    setFallbackText(text);
    setCopyState('error');
  };

  const copyShareLink = async () => {
    const code = encodeShareSelection(snapshotSelection(useEngineStore.getState()));
    const url = `${window.location.origin}${window.location.pathname}#b=${code}`;
    if (await attemptCopy(url)) {
      flashCopied();
      return;
    }
    setFallbackText(url);
    setCopyState('error');
  };

  // Startup: apply a shared build from the location hash once, then strip it.
  const hashApplied = useRef(false);
  useEffect(() => {
    if (hashApplied.current) return;
    hashApplied.current = true;
    const match = window.location.hash.match(/#b=([A-Za-z0-9\-_]+)/);
    if (!match) return;
    const parsed = decodeShareSelection(match[1]);
    if (!parsed.ok) {
      console.warn('[whiteblock] ignoring invalid share link:', parsed.errors);
      return;
    }
    animClock.jumpTo(parsed.selection.animRpm);
    useEngineStore.getState().set({ ...parsed.selection, focusedPart: null });
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

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
          <button
            onClick={copyShareLink}
            className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            title="Copy a shareable link that opens this exact build"
          >
            Share link
          </button>
          <button
            onClick={() => {
              setImportText('');
              setImportErrors([]);
              setImportOpen(true);
            }}
            className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            title="Paste a build JSON to load it"
          >
            Import
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
            ['stock', 'Stock sleeves · cracks past 350 WHP (83mm)'],
            ['shimmed', 'Block shims · holds to 450 WHP'],
            ['billet-guard', 'DeeWorks billet block guard · 4/5/6-pot · holds to 600 WHP'],
            ['darton', 'Darton sleeves · unlimited'],
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
        <div className="mb-1 mt-2 text-xs font-semibold text-zinc-300">Crankshaft</div>
        <OptionButton
          active={s.crankId === 'stock-crank'}
          label={`Stock crank · ${BASE_ENGINES[s.engineId].strokeMm.toFixed(1)}mm throw`}
          onClick={() => pick({ crankId: 'stock-crank' }, 'internals')}
        />
        <OptionButton
          active={s.crankId === 'stroker'}
          label={`Stroker crank · ${strokerLabel(s.engineId)}`}
          sub="Real displacement change via stroke"
          onClick={() => pick({ crankId: 'stroker' }, 'internals')}
        />
        <div className="mb-1 mt-2 text-xs font-semibold text-zinc-300">Pistons</div>
        {(
          [
            ['std-bore', 'STD bore pistons'],
            ['plus-05', '+0.5mm overbore pistons'],
            ['plus-10', '+1.0mm overbore pistons'],
          ] as const
        ).map(([id, label]) => (
          <OptionButton key={id} active={s.pistonsId === id} label={label} onClick={() => pick({ pistonsId: id }, 'internals')} />
        ))}
        <div className="mt-2 font-mono text-[11px] text-zinc-500">
          Deck {deckMm(s)}mm · TDC pin {pinMm(s)}mm — rods set deck height, never displacement
        </div>
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
            ['td04-21tk', 'Mamba TD04HL-21TK · 49.6/61 · violent spike · bends stock rods'],
            ['td06sl2-20g', 'Kinugawa TD06SL2-20G · documented B5234T build · ~380 WHP · T3 + pack'],
            ['hx35', 'Holset HX35 · budget legend · 450 WHP · needs T3 manifold + pack'],
            ['gt3071r', 'Garrett GT3071R · ball bearing · 420 WHP · needs T3 + pack'],
            ['efr7163', 'BorgWarner EFR 7163 · fast spool · 500 WHP · needs T3 + pack'],
            ['gtx3076r', 'Garrett GTX3076R · 550 WHP · needs T3 + full pack'],
            ['pte6262', 'Precision 6262 · drag class · 600 WHP · needs everything'],
            ['k24', 'KKK K24 (S60R) · max 350 WHP · needs Japanifold'],
          ] as const
        ).map(([id, label]) => {
          const w = TURBO_WHEELS[id];
          const tag = ` · ${w.inMm}/${w.exMm}mm${w.est ? ' ~' : ''}`;
          return <OptionButton key={id} active={s.turboId === id} label={label + tag} onClick={() => pick({ turboId: id }, 'turbo')} />;
        })}
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
        <OptionButton active={s.tuneId === 'stage3'} label="Stage 3 MaxxECU standalone" sub="Unlocks 35 psi · 8500 limiter — feed it or melt it" onClick={() => pick({ tuneId: 'stage3' }, 'ecu')} />
      </Accordion>

      <Accordion title="Saved builds">
        <div className="mb-2 flex gap-1.5">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="Build name…"
            maxLength={40}
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500"
            aria-label="Build name"
          />
          <button onClick={handleSave} className="rounded bg-sky-700 px-2 py-1 text-xs font-semibold hover:bg-sky-600">
            Save
          </button>
        </div>
        <div className="mb-2 flex gap-1.5">
          <button
            onClick={downloadCurrentBuild}
            className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            title="Download the current build as a .whiteblock.json file"
          >
            Download .json
          </button>
          <label
            className="flex-1 cursor-pointer rounded bg-zinc-800 px-2 py-1 text-center text-xs hover:bg-zinc-700"
            title="Load a build from a .whiteblock.json file"
          >
            Upload .json
            <input type="file" accept=".json,.whiteblock.json,application/json" className="hidden" onChange={uploadBuildFile} />
          </label>
        </div>
        {uploadError !== null && (
          <ul className="mb-2 max-h-32 overflow-y-auto rounded border border-red-700 bg-red-950/40 p-2 text-[11px] text-red-300">
            {uploadError.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}
        {savedBuilds.length === 0 && <p className="text-[11px] text-zinc-500">No saved builds yet — name the current setup and hit Save.</p>}
        {savedBuilds.map((b) => (
          <div key={b.name} className="mb-1.5 flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-100">{b.name}</div>
              <div className="truncate font-mono text-[10px] text-zinc-500">
                {b.selection.engineId} · {b.selection.turboId} · {b.selection.tuneId}
              </div>
            </div>
            <button
              onClick={() => {
                // Re-validate on load: migrates old saves missing newer fields.
                const parsed = parseBuildJson(JSON.stringify({ selection: b.selection }));
                if (parsed.ok) applySelection(parsed.selection);
              }}
              className="rounded bg-zinc-700 px-2 py-0.5 text-[11px] hover:bg-zinc-600"
            >
              Load
            </button>
            <button
              onClick={() => downloadBuildFile(b.name, b.selection)}
              className="rounded bg-zinc-700 px-2 py-0.5 text-[11px] hover:bg-zinc-600"
              title={`Download ${b.name} as a file`}
            >
              ↓
            </button>
            <button
              onClick={() => setSavedBuilds(deleteBuild(b.name))}
              className="rounded bg-zinc-700 px-2 py-0.5 text-[11px] text-red-300 hover:bg-zinc-600"
              aria-label={`Delete ${b.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </Accordion>

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Import build JSON">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <h2 className="mb-2 text-sm font-bold text-zinc-100">Import build JSON</h2>
            <p className="mb-2 text-[11px] text-zinc-400">Paste the output of “Copy build JSON”. Unknown values are rejected, rpm/boost are clamped.</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder='{"selection": {...}}'
              className="w-full rounded border border-zinc-700 bg-black p-2 font-mono text-[10px] text-zinc-200"
            />
            {importErrors.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-y-auto rounded border border-red-700 bg-red-950/40 p-2 text-[11px] text-red-300">
                {importErrors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setImportOpen(false)} className="rounded bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600">
                Cancel
              </button>
              <button onClick={applyImport} className="rounded bg-sky-700 px-3 py-1 text-xs font-semibold hover:bg-sky-600">
                Apply build
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
