import type { EngineSelection } from '@/types/engine';
import {
  BASE_ENGINES,
  DOWNPIPE,
  FUEL_PUMP_CAP_HP,
  INJECTOR_CC,
  INTERCOOLER,
  ROD_LENGTH_MM,
  TRANS_EFF,
  TUNE_TIMING_GAIN,
  TURBO_AIR,
} from './physics';

/** The 19 persisted build fields (everything that affects the simulation). */
export type BuildSelection = Pick<
  EngineSelection,
  | 'engineId'
  | 'rodsId'
  | 'headId'
  | 'turboId'
  | 'manifoldId'
  | 'transmissionId'
  | 'sleevesId'
  | 'tuneId'
  | 'clutchId'
  | 'transCoolerId'
  | 'converterId'
  | 'injectorId'
  | 'fuelPumpId'
  | 'intercoolerId'
  | 'downpipeId'
  | 'studsId'
  | 'valveSpringsId'
  | 'boostPsi'
  | 'animRpm'
>;

const ENUM_FIELDS: Record<string, readonly string[]> = {
  engineId: Object.keys(BASE_ENGINES),
  rodsId: Object.keys(ROD_LENGTH_MM),
  headId: ['stock-n', 'rn-swap'],
  turboId: Object.keys(TURBO_AIR),
  manifoldId: ['stock', 'japanifold-s60r', 'tubular-t3'],
  transmissionId: Object.keys(TRANS_EFF),
  sleevesId: ['stock', 'shimmed', 'darton'],
  tuneId: Object.keys(TUNE_TIMING_GAIN),
  clutchId: ['stock', 'spec-stage3'],
  transCoolerId: ['none', 'external'],
  converterId: ['stock-converter', 'high-stall'],
  injectorId: Object.keys(INJECTOR_CC),
  fuelPumpId: Object.keys(FUEL_PUMP_CAP_HP),
  intercoolerId: Object.keys(INTERCOOLER),
  downpipeId: Object.keys(DOWNPIPE),
  studsId: ['stock-bolts', 'arp-studs'],
  valveSpringsId: ['stock-springs', 'supertech'],
};

const NUMERIC_BOUNDS: Record<string, [number, number]> = {
  boostPsi: [8, 35],
  animRpm: [800, 8500],
};

export type ParseResult = { ok: true; selection: BuildSelection } | { ok: false; errors: string[] };

/**
 * Validate pasted JSON (export shape `{selection, result?}` or a bare
 * selection). Unknown enum values, missing fields and malformed JSON are
 * rejected with an explicit error list; numeric ranges are clamped.
 */
export function parseBuildJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Not valid JSON — copy the full output of "Copy build JSON".'] };
  }
  const src = (raw as { selection?: unknown } | null)?.selection ?? raw;
  if (typeof src !== 'object' || src === null || Array.isArray(src)) {
    return { ok: false, errors: ['Top level must be an object with a "selection" block.'] };
  }
  const obj = src as Record<string, unknown>;
  const errors: string[] = [];
  const out = {} as Record<string, unknown>;
  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    const v = obj[field];
    if (v === undefined) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof v !== 'string' || !allowed.includes(v)) {
      errors.push(`Invalid ${field}: ${JSON.stringify(v)} (expected one of: ${allowed.join(', ')})`);
    } else {
      out[field] = v;
    }
  }
  for (const [field, [lo, hi]] of Object.entries(NUMERIC_BOUNDS)) {
    const v = obj[field];
    if (v === undefined) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`Invalid ${field}: ${JSON.stringify(v)} (expected a number)`);
    } else {
      out[field] = Math.min(hi, Math.max(lo, Math.round(v)));
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, selection: out as unknown as BuildSelection };
}

/** Snapshot the persisted fields out of live store state. */
export function snapshotSelection(st: EngineSelection): BuildSelection {
  return {
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
  };
}

export interface SavedBuild {
  name: string;
  savedAt: string;
  selection: BuildSelection;
}

const STORAGE_KEY = 'whiteblock-configs-v1';
const MAX_SAVED = 20;

export function loadSavedBuilds(): SavedBuild[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is SavedBuild =>
        typeof b === 'object' && b !== null && typeof (b as SavedBuild).name === 'string' && typeof (b as SavedBuild).selection === 'object',
    );
  } catch {
    return [];
  }
}

function persistBuilds(builds: SavedBuild[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(builds.slice(0, MAX_SAVED)));
  } catch {
    // Storage full or unavailable — saved builds simply don't persist.
  }
}

export function saveBuild(name: string, selection: BuildSelection): SavedBuild[] {
  const clean = name.trim().slice(0, 40) || 'Untitled build';
  const builds = loadSavedBuilds().filter((b) => b.name !== clean);
  builds.unshift({ name: clean, savedAt: new Date().toISOString(), selection });
  persistBuilds(builds);
  return builds;
}

export function deleteBuild(name: string): SavedBuild[] {
  const builds = loadSavedBuilds().filter((b) => b.name !== name);
  persistBuilds(builds);
  return builds;
}
