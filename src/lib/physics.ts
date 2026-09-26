import type {
  BaseEngineSpec,
  DynoPoint,
  EngineId,
  EngineSelection,
  HeadId,
  RodsId,
  TurboId,
  TuneId,
} from '@/types/engine';

/** Hardcoded "lore" database of Whiteblock base engines. */
export const BASE_ENGINES: Record<EngineId, BaseEngineSpec> = {
  B5234T3: {
    id: 'B5234T3',
    label: 'B5234T3 · 2.3L T5',
    displacementNote: '2.3L T5',
    cylinders: 5,
    boreMm: 81.0,
    strokeMm: 90.0,
    compressionRatio: 8.5,
    baseHpPs: 225,
    baseHpRpm: 5100,
    baseTqNm: 330,
    baseTqRpm: 2400,
    redlineRpm: 6500,
    notes: 'Thick cylinder walls — good for 500+ WHP on stock sleeves.',
  },
  B5254T4: {
    id: 'B5254T4',
    label: 'B5254T4 · 2.5L R',
    displacementNote: '2.5L R',
    cylinders: 5,
    boreMm: 83.0,
    strokeMm: 93.2,
    compressionRatio: 8.5,
    baseHpPs: 300,
    baseHpRpm: 5500,
    baseTqNm: 400,
    baseTqRpm: 1950,
    redlineRpm: 6500,
    notes: 'Thinner walls — cracks >350 WHP without shims/sleeves.',
  },
  B4194T: {
    id: 'B4194T',
    label: 'B4194T · 1.9L T4',
    displacementNote: '1.9L T4',
    cylinders: 4,
    boreMm: 81.0,
    strokeMm: 90.0,
    compressionRatio: 9.0,
    baseHpPs: 200,
    baseHpRpm: 5500,
    baseTqNm: 300,
    baseTqRpm: 2400,
    redlineRpm: 7000,
    notes: 'High-revving 4-cyl, aggressive power delivery.',
  },
  B6284T: {
    id: 'B6284T',
    label: 'B6284T · 2.8L T6 Twin-Turbo',
    displacementNote: '2.8L T6',
    cylinders: 6,
    boreMm: 81.0,
    strokeMm: 90.0,
    compressionRatio: 8.5,
    baseHpPs: 272,
    baseHpRpm: 5400,
    baseTqNm: 380,
    baseTqRpm: 2000,
    redlineRpm: 6200,
    notes: 'Twin-turbo six — famous for killing the stock GM 4T65-E.',
  },
};

export const ROD_LENGTH_MM: Record<RodsId, number> = {
  'stock-n': 139.5,
  'stock-rn': 147.0,
  'forged-h': 147.0,
};

export const ROD_LIMIT_WHP: Record<RodsId, number> = {
  'stock-n': 300,
  'stock-rn': 350,
  'forged-h': 800,
};

/** Compressor behaviour per turbo: spool, capability and top-end choke. */
export interface TurboAirSpec {
  spoolStartRpm: number;
  fullBoostRpm: number;
  maxBoostPsi: number;
  /** Boost lost between decay start and redline (turbine backpressure / choke). */
  topEndDropPsi: number;
  /** Hard airflow limit, measured at the wheels. */
  chokeWhp: number;
}

export const TURBO_AIR: Record<TurboId, TurboAirSpec> = {
  'td04-15g': { spoolStartRpm: 1300, fullBoostRpm: 2200, maxBoostPsi: 17, topEndDropPsi: 8.0, chokeWhp: 260 },
  'td04-16t': { spoolStartRpm: 1400, fullBoostRpm: 2300, maxBoostPsi: 20, topEndDropPsi: 6.5, chokeWhp: 300 },
  'td04-19t': { spoolStartRpm: 1500, fullBoostRpm: 2400, maxBoostPsi: 24, topEndDropPsi: 6.5, chokeWhp: 340 },
  k24: { spoolStartRpm: 1400, fullBoostRpm: 2300, maxBoostPsi: 24, topEndDropPsi: 4.5, chokeWhp: 350 },
};

/** Factory-fit turbo per engine — the dyno anchor baseline. */
export const ENGINE_STOCK_TURBO: Record<EngineId, TurboId> = {
  B5234T3: 'td04-15g',
  B5254T4: 'k24',
  B4194T: 'td04-15g',
  B6284T: 'td04-16t',
};

/** Factory boost targets (psi) per engine on the stock tune. */
export const ENGINE_STOCK_BOOST_PSI: Record<EngineId, number> = {
  B5234T3: 9.5,
  B5254T4: 13,
  B4194T: 11,
  B6284T: 9,
};

/** Combustion efficiency gain from timing/fuelling per tune stage. */
export const TUNE_TIMING_GAIN: Record<TuneId, number> = {
  stock: 1.0,
  stage1: 1.06,
  stage2: 1.12,
};

/** FWD drivetrain loss applied to crank figures to get wheel figures. */
export const DRIVETRAIN_EFF = 0.88;
export const ATM_PSI = 14.7;
export const PS_TO_HP = 0.98632;

export function volumetricEfficiency(headId: HeadId): number {
  return headId === 'rn-swap' ? 95 : 85;
}

/**
 * Displacement in cc.
 * V = π/4 · bore² · stroke · cylinders / 1000
 */
export function displacementCc(boreMm: number, strokeMm: number, cylinders: number): number {
  return (Math.PI / 4) * boreMm * boreMm * strokeMm * cylinders / 1000;
}

/** Rod/stroke ratio = rodLength / stroke. */
export function rodStrokeRatio(rodLengthMm: number, strokeMm: number): number {
  return rodLengthMm / strokeMm;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

/**
 * Breathing efficiency shape, relative to the torque peak (= 1.0 there).
 * Rises out of idle (cam overlap), falls past the peak as the head runs
 * out of flow. The RN head breathes better up top and carries the peak
 * 500 rpm further right.
 */
export function veShape(rpm: number, torquePeakRpm: number, isRN: boolean): number {
  if (rpm <= torquePeakRpm) {
    return 0.88 + 0.12 * smoothstep((rpm - 800) / Math.max(1, torquePeakRpm - 800));
  }
  // Torque plateaus past the peak (VVT + tuned intake hold VE flat), then
  // breathing collapses as piston speed outruns the ports near redline —
  // this is what puts the power peak left of the redline.
  const flat = isRN ? 1.8 : 1.5; // plateau width in krpm past peak
  const dx = Math.max(0, (rpm - torquePeakRpm) / 1000 - flat);
  const fall = isRN ? 0.034 : 0.04;
  return Math.max(0.6, 1 - fall * dx - 0.004 * dx * dx);
}

/**
 * Absolute VE (%) at an rpm point.
 */
export function veAtRpm(rpm: number, headId: HeadId, baseTqRpm: number): number {
  const isRN = headId === 'rn-swap';
  const peak = baseTqRpm + (isRN ? 500 : 0);
  return volumetricEfficiency(headId) * veShape(rpm, peak, isRN);
}

/**
 * Turbo boost curve (psi, gauge).
 * Pre-spool trickle → smooth spool ramp → flat target → top-end decay
 * as the compressor chokes and turbine backpressure rises. Small turbos
 * spool violently early (the 19T torque spike emerges here naturally)
 * and fall off harder up top; the K24 spools later but holds.
 */
export function boostAtRpm(rpm: number, targetPsi: number, spec: TurboAirSpec, redlineRpm: number): number {
  if (rpm <= spec.spoolStartRpm) {
    return 1 + smoothstep((rpm - 800) / Math.max(1, spec.spoolStartRpm - 800));
  }
  if (rpm <= spec.fullBoostRpm) {
    return 2 + (targetPsi - 2) * smoothstep((rpm - spec.spoolStartRpm) / Math.max(1, spec.fullBoostRpm - spec.spoolStartRpm));
  }
  const decayStart = spec.fullBoostRpm + 0.65 * (redlineRpm - spec.fullBoostRpm);
  if (rpm <= decayStart) return targetPsi;
  return Math.max(0, targetPsi - spec.topEndDropPsi * smoothstep((rpm - decayStart) / Math.max(1, redlineRpm - decayStart)));
}

/** Absolute pressure ratio from gauge boost. PR = (P_atm + P_boost) / P_atm. */
export function pressureRatio(boostPsi: number): number {
  return (ATM_PSI + boostPsi) / ATM_PSI;
}

/**
 * Effective boost target: the stock tune locks factory boost (the boost
 * slider only takes effect on Stage 1/2), capped by compressor capability.
 */
export function effectiveBoostTarget(sel: EngineSelection): number {
  const spec = TURBO_AIR[sel.turboId];
  const target = sel.tuneId === 'stock' ? ENGINE_STOCK_BOOST_PSI[sel.engineId] : sel.boostPsi;
  return Math.min(target, spec.maxBoostPsi);
}

/**
 * Torque calibration constant k per engine, such that stock tune +
 * factory turbo reproduces the lore ratings. k is the mean of the
 * torque-anchor and power-anchor solutions:
 *   kT:  TQ_rated = k · disp_L · VE · PR  at the rated torque rpm
 *   kH:  HP_rated = k · … · rpm/5252      at the rated power rpm
 * Averaging lands both rated points within ~5%.
 */
const calibrationCache = new Map<EngineId, number>();

export function calibrationK(engine: BaseEngineSpec): number {
  const hit = calibrationCache.get(engine.id);
  if (hit !== undefined) return hit;
  const dispL = displacementCc(engine.boreMm, engine.strokeMm, engine.cylinders) / 1000;
  const stockTurbo = ENGINE_STOCK_TURBO[engine.id];
  const spec = TURBO_AIR[stockTurbo];
  const stockBoost = ENGINE_STOCK_BOOST_PSI[engine.id];

  const boostT = boostAtRpm(engine.baseTqRpm, stockBoost, spec, engine.redlineRpm);
  const kT = engine.baseTqNm / (dispL * (veAtRpm(engine.baseTqRpm, 'stock-n', engine.baseTqRpm) / 100) * pressureRatio(boostT));

  const hpTarget = engine.baseHpPs * PS_TO_HP;
  // hp·5252/rpm gives crank lb-ft; ×1.3558 converts to crank Nm
  const tqNeededNm = ((hpTarget * 5252) / engine.baseHpRpm) * 1.35581795;
  const boostH = boostAtRpm(engine.baseHpRpm, stockBoost, spec, engine.redlineRpm);
  const kH = tqNeededNm / (dispL * (veAtRpm(engine.baseHpRpm, 'stock-n', engine.baseTqRpm) / 100) * pressureRatio(boostH));

  const k = (kT + kH) / 2;
  calibrationCache.set(engine.id, k);
  return k;
}

/**
 * Crank torque (Nm) at an rpm point — the core of the model.
 *   TQ = k · disp_L · (VE/100) · PR(boost) · timingGain
 * Torque comes from cylinder pressure; power is derived from it.
 */
export function torqueCrankNm(sel: EngineSelection, rpm: number): number {
  const engine = BASE_ENGINES[sel.engineId];
  const k = calibrationK(engine);
  const dispL = displacementCc(engine.boreMm, engine.strokeMm, engine.cylinders) / 1000;
  const ve = veAtRpm(rpm, sel.headId, engine.baseTqRpm) / 100;
  const boost = boostAtRpm(rpm, effectiveBoostTarget(sel), TURBO_AIR[sel.turboId], engine.redlineRpm);
  return k * dispL * ve * pressureRatio(boost) * TUNE_TIMING_GAIN[sel.tuneId];
}

/** Turbo flow choke (WHP). The K24 stays choked without the Japanifold. */
export function chokeWhp(sel: EngineSelection): number {
  if (sel.turboId === 'k24' && sel.manifoldId !== 'japanifold-s60r') return 300;
  return TURBO_AIR[sel.turboId].chokeWhp;
}

/**
 * Full dyno sweep, idle → redline.
 * Wheel torque = crank torque × drivetrain efficiency;
 * WHP = TQ(lb-ft) · rpm / 5252, clamped by the compressor choke.
 */
export function dynoCurve(sel: EngineSelection): DynoPoint[] {
  const engine = BASE_ENGINES[sel.engineId];
  const choke = chokeWhp(sel);
  const pts: DynoPoint[] = [];
  for (let rpm = 800; rpm <= engine.redlineRpm; rpm += 200) {
    const tqCrank = torqueCrankNm(sel, rpm);
    const tqWheel = tqCrank * DRIVETRAIN_EFF;
    const boost = boostAtRpm(rpm, effectiveBoostTarget(sel), TURBO_AIR[sel.turboId], engine.redlineRpm);
    const hp = Math.min(choke, ((tqWheel / 1.35581795) * rpm) / 5252);
    pts.push({ rpm, hp: Math.round(Math.max(0, hp)), tqNm: Math.round(Math.max(0, tqWheel)), boostPsi: Math.round(boost * 10) / 10 });
  }
  return pts;
}

/** Peak wheel horsepower of the sweep. */
export function maxHorsepower(sel: EngineSelection): number {
  return dynoCurve(sel).reduce((a, b) => (b.hp > a.hp ? b : a), { hp: 0 } as DynoPoint).hp;
}
