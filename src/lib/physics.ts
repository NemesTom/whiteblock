import type {
  BaseEngineSpec,
  DownpipeId,
  DynoPoint,
  EngineId,
  EngineSelection,
  FuelPumpId,
  HeadId,
  InjectorId,
  IntercoolerId,
  RodsId,
  TransmissionId,
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
  B5244T3: {
    id: 'B5244T3',
    label: 'B5244T3 · 2.4T LPT',
    displacementNote: '2.4L LPT',
    cylinders: 5,
    boreMm: 83.0,
    strokeMm: 90.0,
    compressionRatio: 9.0,
    baseHpPs: 200,
    baseHpRpm: 6000,
    baseTqNm: 285,
    baseTqRpm: 1800,
    redlineRpm: 6000,
    notes: 'Relaxed LPT — 13T spools early, runs out of breath up top.',
  },
  B5244T5: {
    id: 'B5244T5',
    label: 'B5244T5 · 2.4 T5',
    displacementNote: '2.4L T5',
    cylinders: 5,
    boreMm: 81.0,
    strokeMm: 93.2,
    compressionRatio: 8.5,
    baseHpPs: 260,
    baseHpRpm: 5500,
    baseTqNm: 350,
    baseTqRpm: 2100,
    redlineRpm: 6500,
    notes: 'Long-stroke P2 T5 with K24 and dual VVT.',
  },
  B5254T2: {
    id: 'B5254T2',
    label: 'B5254T2 · 2.5T LPT',
    displacementNote: '2.5L LPT',
    cylinders: 5,
    boreMm: 83.0,
    strokeMm: 93.2,
    compressionRatio: 9.0,
    baseHpPs: 210,
    baseHpRpm: 5000,
    baseTqNm: 320,
    baseTqRpm: 1800,
    redlineRpm: 6000,
    notes: 'Torquey XC90/S60 LPT — 14T gives instant shove, then signs off.',
  },
  B4194T: {
    id: 'B4194T',
    label: 'B4194T · 1.9L T4',
    displacementNote: '1.9L T4',
    cylinders: 4,
    boreMm: 81.0,
    strokeMm: 90.0,
    compressionRatio: 8.5,
    baseHpPs: 200,
    baseHpRpm: 5500,
    baseTqNm: 300,
    baseTqRpm: 2400,
    redlineRpm: 7000,
    notes: 'High-revving, aggressive power delivery.',
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
  B6294T: {
    id: 'B6294T',
    label: 'B6294T · 2.9L T6 Twin-Turbo',
    displacementNote: '2.9L T6',
    cylinders: 6,
    boreMm: 83.0,
    strokeMm: 90.0,
    compressionRatio: 8.5,
    baseHpPs: 272,
    baseHpRpm: 5200,
    baseTqNm: 380,
    baseTqRpm: 1800,
    redlineRpm: 6000,
    notes: 'Updated T6 with dual VVT — thin 83mm walls, same glass gearbox.',
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
  'td04-13g': { spoolStartRpm: 1200, fullBoostRpm: 2000, maxBoostPsi: 15, topEndDropPsi: 8.0, chokeWhp: 230 },
  'td04-13t': { spoolStartRpm: 1250, fullBoostRpm: 2100, maxBoostPsi: 16, topEndDropPsi: 4.5, chokeWhp: 250 },
  'td04l-14t': { spoolStartRpm: 1300, fullBoostRpm: 2150, maxBoostPsi: 16, topEndDropPsi: 7.0, chokeWhp: 255 },
  'td04-15g': { spoolStartRpm: 1300, fullBoostRpm: 2200, maxBoostPsi: 17, topEndDropPsi: 8.0, chokeWhp: 260 },
  'td04-16t': { spoolStartRpm: 1400, fullBoostRpm: 2300, maxBoostPsi: 20, topEndDropPsi: 6.5, chokeWhp: 300 },
  'td04-18t': { spoolStartRpm: 1450, fullBoostRpm: 2350, maxBoostPsi: 22, topEndDropPsi: 5.5, chokeWhp: 320 },
  'td04-19t': { spoolStartRpm: 1500, fullBoostRpm: 2400, maxBoostPsi: 24, topEndDropPsi: 6.5, chokeWhp: 340 },
  'td04-20t': { spoolStartRpm: 1600, fullBoostRpm: 2500, maxBoostPsi: 26, topEndDropPsi: 6.0, chokeWhp: 330 },
  /** Kinugawa 21H (21HR3, 51.6/65mm): verified bolt-on, 330–400 HP crank. */
  'td04-21h': { spoolStartRpm: 1700, fullBoostRpm: 2600, maxBoostPsi: 27, topEndDropPsi: 5.5, chokeWhp: 350 },
  /** Kinugawa TD06SL2-20G: documented B5234T build; spool/choke estimated. */
  'td06sl2-20g': { spoolStartRpm: 2700, fullBoostRpm: 4300, maxBoostPsi: 30, topEndDropPsi: 3.0, chokeWhp: 380 },
  hx35: { spoolStartRpm: 2600, fullBoostRpm: 3500, maxBoostPsi: 32, topEndDropPsi: 3.0, chokeWhp: 450 },
  gt3071r: { spoolStartRpm: 2400, fullBoostRpm: 3600, maxBoostPsi: 30, topEndDropPsi: 2.5, chokeWhp: 420 },
  efr7163: { spoolStartRpm: 2200, fullBoostRpm: 3400, maxBoostPsi: 32, topEndDropPsi: 2.0, chokeWhp: 500 },
  gtx3076r: { spoolStartRpm: 2600, fullBoostRpm: 4000, maxBoostPsi: 34, topEndDropPsi: 2.0, chokeWhp: 550 },
  pte6262: { spoolStartRpm: 2800, fullBoostRpm: 4200, maxBoostPsi: 35, topEndDropPsi: 2.0, chokeWhp: 600 },
  k24: { spoolStartRpm: 1400, fullBoostRpm: 2300, maxBoostPsi: 24, topEndDropPsi: 4.5, chokeWhp: 350 },
};

/** Exhaust flange family: big frames need a tubular T3 manifold. */
export const TURBO_FLANGE: Record<TurboId, 'td04' | 't3'> = {
  'td04-13g': 'td04',
  'td04-13t': 'td04',
  'td04l-14t': 'td04',
  'td04-15g': 'td04',
  'td04-16t': 'td04',
  'td04-18t': 'td04',
  'td04-19t': 'td04',
  'td04-20t': 'td04',
  'td04-21h': 'td04',
  'td06sl2-20g': 't3',
  hx35: 't3',
  gt3071r: 't3',
  efr7163: 't3',
  gtx3076r: 't3',
  pte6262: 't3',
  k24: 'td04',
};

/** Visual frame size (geometry identical, scaled). */
export const TURBO_SCALE: Record<TurboId, number> = {
  'td04-13g': 0.9,
  'td04-13t': 0.9,
  'td04l-14t': 0.9,
  'td04-15g': 1.0,
  'td04-16t': 1.0,
  'td04-18t': 1.1,
  'td04-19t': 1.1,
  'td04-20t': 1.12,
  'td04-21h': 1.15,
  'td06sl2-20g': 1.4,
  hx35: 1.35,
  gt3071r: 1.3,
  efr7163: 1.32,
  gtx3076r: 1.38,
  pte6262: 1.45,
  k24: 1.15,
};

/** Factory-fit turbo per engine — the dyno anchor baseline. */
export const ENGINE_STOCK_TURBO: Record<EngineId, TurboId> = {
  B5234T3: 'td04-15g',
  B5244T3: 'td04-13t',
  B5244T5: 'k24',
  B5254T2: 'td04l-14t',
  B5254T4: 'k24',
  B4194T: 'td04l-14t',
  B6284T: 'td04-16t',
  B6294T: 'td04-16t',
};

/** Factory boost targets (psi) per engine on the stock tune. */
export const ENGINE_STOCK_BOOST_PSI: Record<EngineId, number> = {
  B5234T3: 9.5,
  B5244T3: 8,
  B5244T5: 12,
  B5254T2: 9,
  B5254T4: 13,
  B4194T: 11,
  B6284T: 9,
  B6294T: 9,
};

/** Combustion efficiency gain from timing/fuelling per tune stage. */
export const TUNE_TIMING_GAIN: Record<TuneId, number> = {
  stock: 1.0,
  stage1: 1.06,
  stage2: 1.12,
  stage3: 1.18,
};

/** Injector flow (cc/min). Crank-hp capacity at 80% duty, BSFC 0.60. */
export const INJECTOR_CC: Record<InjectorId, number> = {
  'stock-350': 350,
  'green-440': 440,
  'deka-630': 630,
  'ev14-1000': 1000,
  'ev14-1700': 1700,
};

/** Factory injector size: R/T6/T5 cars left the line with bigger injectors. */
export const ENGINE_STOCK_INJECTOR_CC: Record<EngineId, number> = {
  B5234T3: 350,
  B5244T3: 350,
  B5244T5: 440,
  B5254T2: 350,
  B5254T4: 465,
  B4194T: 350,
  B6284T: 440,
  B6294T: 440,
};

/** Crank-hp capacity of the injector set. */
export function injectorCapHp(sel: Pick<EngineSelection, 'injectorId' | 'engineId'>): number {
  const cyl = BASE_ENGINES[sel.engineId].cylinders;
  const cc = sel.injectorId === 'stock-350' ? ENGINE_STOCK_INJECTOR_CC[sel.engineId] : INJECTOR_CC[sel.injectorId];
  return ((cc * 0.8) / 5.0) * cyl;
}

/** Fuel pump crank-hp capacity (pump gas). */
export const FUEL_PUMP_CAP_HP: Record<FuelPumpId, number> = {
  'stock-pump': 330,
  'walbro-255': 550,
  'walbro-450': 800,
};

/** Intercooler heat-soak: power lost past the threshold. */
export const INTERCOOLER: Record<IntercoolerId, { thresholdWhp: number; lossFrac: number }> = {
  'stock-smic': { thresholdWhp: 300, lossFrac: 0.06 },
  'do88-fmic': { thresholdWhp: 350, lossFrac: 0.02 },
  'race-fmic': { thresholdWhp: 1e9, lossFrac: 0 },
};

/** Exhaust backpressure relief: power gain + earlier spool. */
export const DOWNPIPE: Record<DownpipeId, { powerMult: number; spoolDeltaRpm: number }> = {
  'stock-25': { powerMult: 1.0, spoolDeltaRpm: 0 },
  'dp-3': { powerMult: 1.03, spoolDeltaRpm: -100 },
  'full-3': { powerMult: 1.05, spoolDeltaRpm: -200 },
};

/** Big T3 frames demand a minimum support pack. */
export const BIG_FRAME_MIN = {
  intercooler: 'do88-fmic' as IntercoolerId,
  downpipe: 'dp-3' as DownpipeId,
};

export function isBigFrame(turboId: TurboId): boolean {
  return TURBO_FLANGE[turboId] === 't3';
}

/** Turbo air spec with the downpipe spool improvement applied. */
export function adjustedSpec(sel: EngineSelection): TurboAirSpec {
  const spec = TURBO_AIR[sel.turboId];
  const d = DOWNPIPE[sel.downpipeId].spoolDeltaRpm;
  return { ...spec, spoolStartRpm: spec.spoolStartRpm + d, fullBoostRpm: spec.fullBoostRpm + d };
}

/** FWD drivetrain efficiency per gearbox (manual ~12%, slushbox ~15-17%). */
export const TRANS_EFF: Record<TransmissionId, number> = {
  m56: 0.88,
  m66: 0.87,
  aw55: 0.85,
  'gm-4t65e': 0.83,
};
/** Backwards-compatible default (M56 — anchors validated on it). */
export const DRIVETRAIN_EFF = TRANS_EFF.m56;
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
  const base = Math.max(0.6, 1 - fall * dx - 0.004 * dx * dx);
  // High-rpm cliff past 6500: pumping losses explode and small turbos fall
  // off the map, so power dives instead of climbing to 8000.
  if (rpm <= 6500) return base;
  const cliff = isRN ? 0.18 : 0.3;
  return Math.max(0.35, base * (1 - cliff * ((rpm - 6500) / 1000)));
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
export function effectiveBoostTarget(sel: Pick<EngineSelection, 'turboId' | 'tuneId' | 'engineId' | 'boostPsi'>): number {
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
 *   TQ = k · disp_L · (VE/100) · PR(boost) · timingGain · exhaustMult
 * Torque comes from cylinder pressure; power is derived from it.
 * The downpipe spool improvement is baked into the air spec.
 */
export function torqueCrankNm(sel: EngineSelection, rpm: number): number {
  const engine = BASE_ENGINES[sel.engineId];
  const k = calibrationK(engine);
  const dispL = displacementCc(engine.boreMm, engine.strokeMm, engine.cylinders) / 1000;
  const ve = veAtRpm(rpm, sel.headId, engine.baseTqRpm) / 100;
  const spec = adjustedSpec(sel);
  const boost = boostAtRpm(rpm, effectiveBoostTarget(sel), spec, engine.redlineRpm);
  return k * dispL * ve * pressureRatio(boost) * TUNE_TIMING_GAIN[sel.tuneId] * DOWNPIPE[sel.downpipeId].powerMult;
}

/** Turbo flow choke (WHP). The K24 stays choked without the Japanifold. */
export function chokeWhp(sel: EngineSelection): number {
  if (sel.turboId === 'k24' && sel.manifoldId !== 'japanifold-s60r') return 300;
  return TURBO_AIR[sel.turboId].chokeWhp;
}

/**
 * Component RPM ceilings — community/engineering-grounded lore (no factory
 * publishes these): rod-bolt stress rises with rpm², hydraulic lifters
 * pump up, gear pumps cavitate. Forged bottom ends imply ARP hardware +
 * billet pump gears.
 */
export const ROD_RPM_LIMIT: Record<RodsId, number> = { 'stock-n': 7000, 'stock-rn': 7200, 'forged-h': 8500 };
export const HEAD_RPM_LIMIT: Record<HeadId, number> = { 'stock-n': 7000, 'rn-swap': 7800 };
export const OIL_PUMP_RPM_LIMIT = 7600;
export const OIL_PUMP_RPM_LIMIT_FORGED = 8600;

/** Frame-size-corrected max turbo shaft speed (rpm). Big wheels turn slower. */
export const TURBO_MAX_SHAFT: Record<TurboId, number> = {
  'td04-13g': 200000,
  'td04-13t': 200000,
  'td04l-14t': 195000,
  'td04-15g': 190000,
  'td04-16t': 185000,
  'td04-18t': 180000,
  'td04-19t': 180000,
  'td04-20t': 175000,
  'td04-21h': 170000,
  'td06sl2-20g': 135000,
  hx35: 150000,
  gt3071r: 160000,
  efr7163: 140000,
  gtx3076r: 135000,
  pte6262: 125000,
  k24: 170000,
};

export interface RpmLimit {
  limit: number;
  culprit: 'rods' | 'head' | 'pump';
}

/** Weakest link of the rotating assembly / valvetrain / oiling. */
export function rpmLimit(sel: Pick<EngineSelection, 'rodsId' | 'headId' | 'valveSpringsId'>): RpmLimit {
  const springBonus = sel.valveSpringsId === 'supertech' ? 400 : 0;
  const candidates: RpmLimit[] = [
    { limit: ROD_RPM_LIMIT[sel.rodsId], culprit: 'rods' },
    { limit: HEAD_RPM_LIMIT[sel.headId] + springBonus, culprit: 'head' },
    { limit: sel.rodsId === 'forged-h' ? OIL_PUMP_RPM_LIMIT_FORGED : OIL_PUMP_RPM_LIMIT, culprit: 'pump' },
  ];
  return candidates.reduce((a, b) => (b.limit < a.limit ? b : a));
}

/**
 * Rev limiter: factory redline on stock/Stage 1, 8000 on Stage 2,
 * 8500 on Stage 3 (standalone).
 */
export function maxRpm(sel: Pick<EngineSelection, 'tuneId' | 'engineId'>): number {
  if (sel.tuneId === 'stage3') return 8500;
  return sel.tuneId === 'stage2' ? 8000 : BASE_ENGINES[sel.engineId].redlineRpm;
}

/**
 * Turbo shaft load as a fraction of frame rating — demand-driven: boost
 * target normalized by compressor capability, squared, times rpm energy
 * squared. Stock-ish operation cruises ≈ 0.5–0.8; only maxed-out turbos
 * near 8000 rpm blow past 1.0 (burst). Per-turbo maxBoost normalization
 * already encodes frame capability, so no separate size factor is needed.
 */
export function shaftSpeed(sel: EngineSelection, rpm: number): number {
  const spec = TURBO_AIR[sel.turboId];
  const demand = effectiveBoostTarget(sel) / spec.maxBoostPsi; // 0..1
  const flow = Math.pow(Math.max(0, rpm) / 8000, 2);
  return TURBO_MAX_SHAFT[sel.turboId] * (0.5 + 0.6 * demand * demand * flow);
}

/**
 * Full dyno sweep, idle → 8500 rpm (past the factory redline so overrev
 * fall-off is visible; the rev limiter is enforced by the UI, not the curve).
 * Wheel torque = crank torque × drivetrain efficiency;
 * WHP = TQ(lb-ft) · rpm / 5252, clamped by the compressor choke, then
 * heat-soaked by the intercooler past its threshold.
 * Crank HP is the same figure before drivetrain loss (display only).
 */
export function dynoCurve(sel: EngineSelection): DynoPoint[] {
  const engine = BASE_ENGINES[sel.engineId];
  const eff = TRANS_EFF[sel.transmissionId];
  const choke = chokeWhp(sel);
  const ic = INTERCOOLER[sel.intercoolerId];
  const spec = adjustedSpec(sel);
  const pts: DynoPoint[] = [];
  for (let rpm = 800; rpm <= 8500; rpm += 200) {
    const tqCrank = torqueCrankNm(sel, rpm);
    const tqWheel = tqCrank * eff;
    const boost = boostAtRpm(rpm, effectiveBoostTarget(sel), spec, engine.redlineRpm);
    const rawHp = Math.min(choke, ((tqWheel / 1.35581795) * rpm) / 5252);
    const rawCrank = Math.min(choke / eff, ((tqCrank / 1.35581795) * rpm) / 5252);
    const icMult = rawHp > ic.thresholdWhp ? 1 - ic.lossFrac : 1;
    pts.push({
      rpm,
      hp: Math.round(Math.max(0, rawHp * icMult)),
      hpCrank: Math.round(Math.max(0, rawCrank * icMult)),
      tqNm: Math.round(Math.max(0, tqWheel * icMult)),
      boostPsi: Math.round(boost * 10) / 10,
    });
  }
  return pts;
}

/** Peak crank-hp fuel demand (what the injectors + pump must feed). */
export function fuelDemandHp(sel: EngineSelection): number {
  return dynoCurve(sel).reduce((a, b) => (b.hpCrank > a.hpCrank ? b : a), { hpCrank: 0 } as DynoPoint).hpCrank;
}

/** Injector duty (fraction) at peak demand vs. the weaker fuel link. */
export function injectorDuty(sel: EngineSelection): number {
  const demand = fuelDemandHp(sel);
  const cap = Math.min(injectorCapHp(sel), FUEL_PUMP_CAP_HP[sel.fuelPumpId]);
  return demand / (cap / 0.8);
}

/** Peak wheel horsepower of the sweep. */
export function maxHorsepower(sel: EngineSelection): number {
  return dynoCurve(sel).reduce((a, b) => (b.hp > a.hp ? b : a), { hp: 0 } as DynoPoint).hp;
}
