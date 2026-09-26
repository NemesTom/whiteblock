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

export const TURBO_FLOW_WHP: Record<TurboId, number> = {
  'td04-15g': 260,
  'td04-16t': 300,
  'td04-19t': 340,
  k24: 350,
};

export const TURBO_PEAK_RPM: Record<TurboId, number> = {
  'td04-15g': 3000,
  'td04-16t': 3600,
  'td04-19t': 3800,
  k24: 4500,
};

export const FUEL_MOD: Record<TuneId, number> = {
  stock: 0.85,
  stage1: 1.0,
  stage2: 1.08,
};

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

/**
 * Simplified dyno model:
 * Max_HP = Turbo_Flow_Limit · (VE / 100) · Fuel_Mod
 * K24 requires the S60R/Japanifold manifold to unlock full flow,
 * otherwise it is choked to 300 WHP.
 */
export function maxHorsepower(sel: EngineSelection): number {
  const ve = volumetricEfficiency(sel.headId);
  let flow = TURBO_FLOW_WHP[sel.turboId];
  if (sel.turboId === 'k24' && sel.manifoldId !== 'japanifold-s60r') {
    flow = 300;
  }
  // 19T violent low-end: small boost bonus above 18psi when rods survive
  let boostBonus = 1;
  if (sel.turboId === 'td04-19t' && sel.boostPsi > 18) boostBonus = 1.06;
  return Math.round(flow * (ve / 100) * FUEL_MOD[sel.tuneId] * boostBonus);
}

/**
 * Bell-ish bezier-style power curve per turbo.
 * 15G peaks early and falls off; K24 peaks late and holds to redline.
 * RN head shifts the powerband +500 rpm.
 */
export function dynoCurve(sel: EngineSelection): DynoPoint[] {
  const engine = BASE_ENGINES[sel.engineId];
  const maxHp = maxHorsepower(sel);
  const peak = TURBO_PEAK_RPM[sel.turboId] + (sel.headId === 'rn-swap' ? 500 : 0);
  const redline = engine.redlineRpm;
  const pts: DynoPoint[] = [];
  const hold = sel.turboId === 'k24' ? 0.97 : sel.turboId === 'td04-16t' ? 0.88 : sel.turboId === 'td04-19t' ? 0.9 : 0.72;
  for (let rpm = 1500; rpm <= redline; rpm += 250) {
    let norm: number;
    if (rpm <= peak) {
      const t = (rpm - 1000) / Math.max(1, peak - 1000);
      norm = Math.pow(Math.sin((Math.PI / 2) * Math.min(1, Math.max(0, t))), 0.9);
    } else {
      const t = (rpm - peak) / Math.max(1, redline - peak);
      norm = 1 - (1 - hold) * Math.pow(t, 1.2);
    }
    // Cold-side spool softness below 2000 rpm (except violent 19T spike)
    let lowBoost: number = rpm < 2000 ? 0.55 + 0.45 * (rpm / 2000) : 1;
    if (sel.turboId === 'td04-19t' && rpm >= 2200 && rpm <= 3200) lowBoost = 1.12; // torque spike
    const hp = Math.max(0, maxHp * norm * lowBoost);
    const tqNm = rpm > 0 ? (hp * 5252 / rpm) * 1.35581795 * 0.62 : 0; // scaled WHP→Nm at wheels
    pts.push({ rpm, hp: Math.round(hp), tqNm: Math.round(tqNm) });
  }
  return pts;
}
