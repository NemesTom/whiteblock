import { create } from 'zustand';
import type { EngineSelection, EngineStatus } from '@/types/engine';
import { animClock } from '@/lib/animClock';
import {
  BASE_ENGINES,
  BIG_FRAME_MIN,
  FUEL_PUMP_CAP_HP,
  ROD_LENGTH_MM,
  ROD_LIMIT_WHP,
  TRANS_EFF,
  TURBO_MAX_SHAFT,
  displacementCc,
  dynoCurve,
  effectiveBoostTarget,
  fuelDemandHp,
  injectorCapHp,
  injectorDuty,
  isBigFrame,
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
  converterId: 'stock-converter',
  injectorId: 'stock-350',
  fuelPumpId: 'stock-pump',
  intercoolerId: 'stock-smic',
  downpipeId: 'stock-25',
  studsId: 'stock-bolts',
  valveSpringsId: 'stock-springs',
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

  // Fitment gate: T3 big-frame turbos physically need a tubular T3 manifold.
  if (isBigFrame(sel.turboId) && sel.manifoldId !== 'tubular-t3') {
    return { status: 'SETUP_INCOMPATIBLE', message: `The ${sel.turboId} is a T3-flange turbo — it will not bolt to a TD04 manifold. Fit the tubular T3 manifold.` };
  }
  // Big frames also demand breathing: FMIC + 3" exhaust minimum.
  if (isBigFrame(sel.turboId) && (sel.intercoolerId !== 'race-fmic' && sel.intercoolerId !== BIG_FRAME_MIN.intercooler || sel.downpipeId === 'stock-25')) {
    return { status: 'SETUP_INCOMPATIBLE', message: `A ${sel.turboId} on a stock intercooler/exhaust is a heat-soaked time bomb. Fit at least a do88 FMIC and a 3" downpipe.` };
  }
  // Stage 3 (standalone) demands big fuel: EV14-1000+ and a 450 pump.
  if (sel.tuneId === 'stage3' && (sel.injectorId !== 'ev14-1000' && sel.injectorId !== 'ev14-1700' || sel.fuelPumpId !== 'walbro-450')) {
    return { status: 'SETUP_INCOMPATIBLE', message: 'Stage 3 standalone needs EV14-1000cc+ injectors and a Walbro 450 pump. The stock ECU fuel model cannot feed this.' };
  }

  // Rule A — the torque spike: big-wheel HL turbo (18T/19T/21H) + >18psi
  // of EFFECTIVE boost + stock rods => bent rods. Uses the locked target,
  // so a parked slider on the stock tune can't bend rods at 9.5 psi.
  if (
    (sel.turboId === 'td04-18t' || sel.turboId === 'td04-19t' || sel.turboId === 'td04-21h') &&
    effectiveBoostTarget(sel) > 18 &&
    (sel.rodsId === 'stock-n' || sel.rodsId === 'stock-rn')
  ) {
    const name = sel.turboId === 'td04-18t' ? '18T' : sel.turboId === 'td04-21h' ? '21H' : '19T';
    return { status: 'FAILED_BENT_RODS', message: `Violent ${name} torque spike bent the stock rods. Dyno output dropped to zero.` };
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
  // Rule C — T6 glass cannon (both 2.8 and 2.9 twin-turbo sixes)
  if ((sel.engineId === 'B6284T' || sel.engineId === 'B6294T') && sel.transmissionId === 'gm-4t65e' && sel.tuneId === 'stage2') {
    return { status: 'FAILED_EXPLODED_GEARBOX', message: 'Stage 2 T6 torque exploded the stock transverse GM 4T65-E gearbox.' };
  }
  // AW55 auto ladder: 320 stock, 380 with cooler, 420 with cooler + high-stall
  if (sel.transmissionId === 'aw55' && hp > 320 && sel.transCoolerId !== 'external') {
    return { status: 'FAILED_OVERWHELMED_TRANS', message: 'AW55-50SN overheated past 320 WHP without an external trans cooler.' };
  }
  if (sel.transmissionId === 'aw55' && hp > 380 && sel.converterId !== 'high-stall') {
    return { status: 'FAILED_OVERWHELMED_TRANS', message: `AW55 clutch packs gave up at ${hp} WHP. A high-stall converter holds this box to 420.` };
  }
  if (sel.transmissionId === 'aw55' && hp > 420) {
    return { status: 'FAILED_OVERWHELMED_TRANS', message: `AW55 held to 420 WHP with cooler and high-stall — past that the case is done. This needs a manual swap.` };
  }
  // M56/M66 manual with stock clutch past ~400 WHP
  if ((sel.transmissionId === 'm56' || sel.transmissionId === 'm66') && hp > 400 && sel.clutchId !== 'spec-stage3') {
    return { status: 'FAILED_OVERWHELMED_TRANS', message: `${sel.transmissionId === 'm66' ? 'M66' : 'M56'} survived, but the stock clutch slips past 400 WHP. Fit a Spec Stage 3 clutch.` };
  }
  // M66 6-speed gives up past 700 WHP even with the Spec clutch
  if (sel.transmissionId === 'm66' && hp > 700) {
    return { status: 'FAILED_EXPLODED_GEARBOX', message: `M66 held to 700 WHP — past that the case flexed and third gear exited. This is driveline-exotic territory.` };
  }
  // Lean-out: fuel demand past injector or pump capacity melts a piston
  const fuelCap = Math.min(injectorCapHp(sel), FUEL_PUMP_CAP_HP[sel.fuelPumpId]);
  const demand = fuelDemandHp(sel);
  if (demand > fuelCap) {
    return { status: 'FAILED_LEAN', message: `Fuel demand (${Math.round(demand)} crank hp) exceeded the ${demand > injectorCapHp(sel) ? 'injectors' : 'fuel pump'} (${Math.round(fuelCap)} hp). It went lean and melted a piston.` };
  }
  // Head lift: stock bolts stretch past 24 psi, the gasket lets go
  if (effectiveBoostTarget(sel) > 24 && sel.studsId !== 'arp-studs') {
    return { status: 'FAILED_LIFTED_HEAD', message: `Boost past 24 psi on stock head bolts lifted the head and blew the gasket. Fit ARP studs.` };
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
  const lossPct = Math.round((1 - TRANS_EFF[sel.transmissionId]) * 100);
  const duty = injectorDuty(sel);
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
    drivetrainLossPct: lossPct,
    drivetrainLossHp: failed ? 0 : peakCrank.hpCrank - peak.hp,
    injectorDutyPct: Math.round(duty * 100),
    curve: failed ? curve.map((p) => ({ ...p, hp: 0, hpCrank: 0, tqNm: 0 })) : curve,
  };
}
