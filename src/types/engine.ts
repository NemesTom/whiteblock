/**
 * Strict domain types for the Whiteblock Visualizer.
 * All engine parameters, component models and chart datasets are explicit.
 */

export type EngineId = 'B5234T3' | 'B5254T4' | 'B4194T' | 'B6284T';

export type RodsId = 'stock-n' | 'stock-rn' | 'forged-h';
export type HeadId = 'stock-n' | 'rn-swap';
export type TurboId = 'td04-15g' | 'td04-16t' | 'td04-19t' | 'k24';
export type ManifoldId = 'stock' | 'japanifold-s60r';
export type TransmissionId = 'm56' | 'aw55' | 'gm-4t65e';
export type SleevesId = 'stock' | 'shimmed' | 'darton';
export type TuneId = 'stock' | 'stage1' | 'stage2';
export type ClutchId = 'stock' | 'spec-stage3';
export type TransCoolerId = 'none' | 'external';

export type EngineStatus =
  | 'OK'
  | 'FAILED_BENT_RODS'
  | 'FAILED_CRACKED_BLOCK'
  | 'FAILED_EXPLODED_GEARBOX'
  | 'FAILED_OVERWHELMED_TRANS';

export type CutawayAxis = 'x' | 'y' | 'z';

export interface BaseEngineSpec {
  id: EngineId;
  label: string;
  displacementNote: string;
  cylinders: number;
  boreMm: number;
  strokeMm: number;
  compressionRatio: number;
  baseHpPs: number;
  baseHpRpm: number;
  baseTqNm: number;
  baseTqRpm: number;
  redlineRpm: number;
  notes: string;
}

export interface TurboSpec {
  id: TurboId;
  label: string;
  flowLimitWhp: number;
  peakRpm: number;
  spoolNote: string;
  requiresManifold?: ManifoldId;
}

export interface EngineSelection {
  engineId: EngineId;
  rodsId: RodsId;
  headId: HeadId;
  turboId: TurboId;
  manifoldId: ManifoldId;
  transmissionId: TransmissionId;
  sleevesId: SleevesId;
  tuneId: TuneId;
  clutchId: ClutchId;
  transCoolerId: TransCoolerId;
  boostPsi: number;
  cutaway: boolean;
  cutawayAxis: CutawayAxis;
  cutawayOffset: number;
  cutawayFlip: boolean;
  focusedPart: string | null;
  /** Rotating-assembly playback + dyno sweep cursor. */
  animPlaying: boolean;
  /** Visual crank speed in rpm (slow-motion) when not sweeping. */
  animSpeed: number;
  sweepEnabled: boolean;
  /** Live engine speed for the chart cursor / telemetry readout. */
  animRpm: number;
}

export interface DerivedMetrics {
  displacementCc: number;
  compressionRatio: number;
  rodStrokeRatio: number;
  volumetricEfficiency: number;
  maxHp: number;
  maxTqNm: number;
  peakHpRpm: number;
  status: EngineStatus;
  statusMessage: string;
}

export interface DynoPoint {
  rpm: number;
  hp: number;
  tqNm: number;
  boostPsi: number;
}

export interface ChartDataset {
  labels: number[];
  hp: number[];
  tqNm: number[];
}
