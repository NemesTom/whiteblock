/**
 * Strict domain types for the Whiteblock Visualizer.
 * All engine parameters, component models and chart datasets are explicit.
 */

export type EngineId =
  | 'B5234T3'
  | 'B5244T3'
  | 'B5244T5'
  | 'B5254T2'
  | 'B5254T4'
  | 'B4194T'
  | 'B6284T'
  | 'B6294T';

export type RodsId = 'stock-n' | 'stock-rn' | 'forged-h';
export type HeadId = 'stock-n' | 'rn-swap';
export type TurboId =
  | 'td04-13g'
  | 'td04-13t'
  | 'td04l-14t'
  | 'td04-15g'
  | 'td04-16t'
  | 'td04-18t'
  | 'td04-19t'
  | 'td04-20t'
  | 'hx35'
  | 'gt3071r'
  | 'efr7163'
  | 'gtx3076r'
  | 'pte6262'
  | 'k24';
export type ManifoldId = 'stock' | 'japanifold-s60r' | 'tubular-t3';
export type TransmissionId = 'm56' | 'm66' | 'aw55' | 'gm-4t65e';
export type SleevesId = 'stock' | 'shimmed' | 'darton';
export type TuneId = 'stock' | 'stage1' | 'stage2' | 'stage3';
export type ClutchId = 'stock' | 'spec-stage3';
export type TransCoolerId = 'none' | 'external';
export type ConverterId = 'stock-converter' | 'high-stall';
export type InjectorId = 'stock-350' | 'green-440' | 'deka-630' | 'ev14-1000' | 'ev14-1700';
export type FuelPumpId = 'stock-pump' | 'walbro-255' | 'walbro-450';
export type IntercoolerId = 'stock-smic' | 'do88-fmic' | 'race-fmic';
export type DownpipeId = 'stock-25' | 'dp-3' | 'full-3';
export type StudsId = 'stock-bolts' | 'arp-studs';
export type ValveSpringsId = 'stock-springs' | 'supertech';

export type EngineStatus =
  | 'OK'
  | 'SETUP_INCOMPATIBLE'
  | 'FAILED_BENT_RODS'
  | 'FAILED_THROWN_ROD'
  | 'FAILED_DROPPED_VALVE'
  | 'FAILED_OIL_PUMP'
  | 'FAILED_TURBO_OVERSPEED'
  | 'FAILED_LEAN'
  | 'FAILED_LIFTED_HEAD'
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
  converterId: ConverterId;
  injectorId: InjectorId;
  fuelPumpId: FuelPumpId;
  intercoolerId: IntercoolerId;
  downpipeId: DownpipeId;
  studsId: StudsId;
  valveSpringsId: ValveSpringsId;
  boostPsi: number;
  cutaway: boolean;
  cutawayAxis: CutawayAxis;
  cutawayOffset: number;
  cutawayFlip: boolean;
  focusedPart: string | null;
  /** Rotating-assembly playback + dyno sweep cursor. */
  animPlaying: boolean;
  sweepEnabled: boolean;
  /** Live engine speed for the chart cursor, crank, turbo and valves. */
  animRpm: number;
  /** Toggleable 4-stroke cycle highlight on piston crowns. */
  cycleHighlight: boolean;
  /** Slow-motion inspect mode: crank renders at an honest visible fraction. */
  slowMo: boolean;
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
  /** Crank horsepower before drivetrain loss (display only). */
  hpCrank: number;
  tqNm: number;
  boostPsi: number;
}

export interface ChartDataset {
  labels: number[];
  hp: number[];
  tqNm: number[];
}
