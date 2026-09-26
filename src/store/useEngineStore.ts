import { create } from 'zustand';
import type { EngineSelection, EngineStatus } from '@/types/engine';
import { animClock } from '@/lib/animClock';
import {
  BASE_ENGINES,
  ROD_LENGTH_MM,
  ROD_LIMIT_WHP,
  TURBO_MAX_SHAFT,
  displacementCc,
  dynoCurve,
  maxHorsepower,
  rodStrokeRatio,
  rpmLimit,
  shaftSpeed,
  volumetricEfficiency,
} from '@/lib/physics';

interface EngineStore extends EngineSelection {
  set: (patch: Partial<EngineSelection>) => void;
  reset: () => void;
  setEngineStatus: (s: EngineStatus) => void;
  /** Computed failure status from the "Volvospeed" rules. */
  status: EngineStatus;
  statusMessage: string;
}

const DEFAULTS: EngineSelection = {
  engineId: 'B5234T3',
  rodsId: 'stock-n',
  headId: 'stock-n',
  turboId: 'td04-15g',
  manifoldId: 'stock',
  transmissionId: 'm56',
  sleevesId: 'stock',
  tuneId: 'stock',
  clutchId: 'stock',
  transCoolerId: 'none',
  boostPsi: 14,
  cutaway: false,
  cutawayAxis: 'x',
  cutawayOffset: 0.55,
  cutawayFlip: false,
  focusedPart: null,
  animPlaying: true,
  sweepEnabled: false,
  animRpm: 800,
  cycleHighlight: false,
  slowMo: false,
};

export function evaluateFailure(sel: EngineSelection): { status: EngineStatus; message: string } {
  const engine = BASE_ENGINES[sel.engineId];
  const hp = maxHorsepower(sel);

  // Rule A — the torque spike: big-wheel HL turbo (18T/19T) + >18psi
  // + stock rods => bent rods
  if (
    (sel.turboId === 'td04-18t' || sel.turboId === 'td04-19t') &&
    sel.boostPsi > 18 &&
    (sel.rodsId === 'stock-n' || sel.rodsId === 'stock-rn')
  ) {
    return { status: 'FAILED_BENT_RODS', message: `Violent ${sel.turboId === 'td04-18t' ? '18T' : '19T'} torque spike bent the stock rods. Dyno output dropped to zero.` };
  }
  // Stock N-rods limit: 15G-class turbo pushing past 300 WHP at low rpm
  if (hp > ROD_LIMIT_WHP[sel.rodsId]) {
    if (sel.rodsId !== 'forged-h') {
      return { status: 'FAILED_BENT_RODS', message: `Power (${hp} WHP) exceeded ${sel.rodsId} rod limit (${ROD_LIMIT_WHP[sel.rodsId]} WHP). Rods failed.` };
    }
  }
  // Rule B — cracked sleeve: 83mm bore + >350 WHP + stock sleeves
  if (engine.boreMm >= 83 && hp > 350 && sel.sleevesId === 'stock') {
    return { status: 'FAILED_CRACKED_BLOCK', message: 'Thin 83mm cylinder walls cracked above 350 WHP on stock sleeves. Add shims or Darton sleeves.' };
  }
  // Rule C — T6 glass cannon
  if (sel.engineId === 'B6284T' && sel.transmissionId === 'gm-4t65e' && sel.tuneId === 'stage2') {
    return { status: 'FAILED_EXPLODED_GEARBOX', message: 'Stage 2 T6 torque exploded the stock transverse GM 4T65-E gearbox.' };
  }
  // AW55 auto limit without cooler
  if (sel.transmissionId === 'aw55' && hp > 320 && sel.transCoolerId !== 'external') {
    return { status: 'FAILED_OVERWHELMED_TRANS', message: 'AW55-50SN overheated past 320 WHP without an external trans cooler.' };
  }
  // M56 manual with stock clutch past ~400 WHP
  if (sel.transmissionId === 'm56' && hp > 400 && sel.clutchId !== 'spec-stage3') {
    return { status: 'FAILED_OVERWHELMED_TRANS', message: 'M56 survived, but the stock clutch slips past 400 WHP. Fit a Spec Stage 3 clutch.' };
  }
  // Overrev: weakest component lets go past its RPM ceiling
  const { limit, culprit } = rpmLimit(sel);
  if (sel.animRpm > limit) {
    if (culprit === 'rods') {
      return { status: 'FAILED_THROWN_ROD', message: `Revved to ${sel.animRpm} rpm — stock rod bolts stretched and threw a rod (limit ${limit}). Forged bottom end revs to 8500.` };
    }
    if (culprit === 'head') {
      return { status: 'FAILED_DROPPED_VALVE', message: `Revved to ${sel.animRpm} rpm — lifters pumped up, a valve floated and met a piston (head limit ${limit}). RN solid-lifter head revs to 7800.` };
    }
    return { status: 'FAILED_OIL_PUMP', message: `Revved to ${sel.animRpm} rpm — the stock pump cavitated and the bearings seized (pump limit ${limit}).` };
  }
  // Turbo overspeed: shaft past 100% of frame rating => compressor burst
  const shaft = shaftSpeed(sel, sel.animRpm);
  if (shaft > TURBO_MAX_SHAFT[sel.turboId]) {
    return { status: 'FAILED_TURBO_OVERSPEED', message: `Turbo shaft at ${Math.round(shaft / 1000)}k rpm blew past the ${sel.turboId} speed limit — compressor burst, engine swallowed the debris.` };
  }
  // K24 without Japanifold is choked (warning, not failure)
  if (sel.turboId === 'k24' && sel.manifoldId !== 'japanifold-s60r') {
    return { status: 'OK', message: 'K24 choked on stock manifold — fit the S60R/Japanifold to unlock full flow.' };
  }
  return { status: 'OK', message: 'Setup healthy. Send it.' };
}

export const useEngineStore = create<EngineStore>()((set) => ({
  ...DEFAULTS,
  status: 'OK' as EngineStatus,
  statusMessage: 'Setup healthy. Send it.',
  set: (patch) =>
    set((state) => {
      const next = { ...state, ...patch };
      const { status, message } = evaluateFailure(next);
      return { ...next, status, statusMessage: message };
    }),
  setEngineStatus: (s) => set({ status: s }),
  reset: () => {
    // The live clock is the single source of truth for rpm: without this,
    // the next animation frame mirrors the stale overrev value straight
    // back into the store and re-fails the engine instantly.
    animClock.jumpTo(800);
    set({ ...DEFAULTS, status: 'OK', statusMessage: 'Setup healthy. Send it.' });
  },
}));

/** Selectors for derived telemetry. */
export function selectMetrics(sel: EngineSelection) {
  const engine = BASE_ENGINES[sel.engineId];
  const disp = Math.round(displacementCc(engine.boreMm, engine.strokeMm, engine.cylinders));
  const rsr = rodStrokeRatio(ROD_LENGTH_MM[sel.rodsId], engine.strokeMm);
  const ve = volumetricEfficiency(sel.headId);
  const maxHp = maxHorsepower(sel);
  const curve = dynoCurve(sel);
  const failed = evaluateFailure(sel).status !== 'OK';
  const peak = curve.reduce((a, b) => (b.hp > a.hp ? b : a), curve[0]);
  const peakCrank = curve.reduce((a, b) => (b.hpCrank > a.hpCrank ? b : a), curve[0]);
  return {
    displacementCc: disp,
    compressionRatio: engine.compressionRatio,
    rodStrokeRatio: Math.round(rsr * 100) / 100,
    volumetricEfficiency: ve,
    maxHp: failed ? 0 : maxHp,
    maxCrankHp: failed ? 0 : peakCrank.hpCrank,
    maxTqNm: failed ? 0 : Math.max(...curve.map((p) => p.tqNm)),
    peakHpRpm: peak.rpm,
    peakCrankHpRpm: peakCrank.rpm,
    curve: failed ? curve.map((p) => ({ ...p, hp: 0, hpCrank: 0, tqNm: 0 })) : curve,
  };
}
